package main

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"golang.org/x/net/http2"

	warp "github.com/Diniboy1123/usque/api"
	quic "github.com/quic-go/quic-go"
)

const (
	warpProxySNI   = "consumer-masque-proxy.cloudflareclient.com"
	defaultPort    = 17080
	connectTimeout = 15 * time.Second
)

type profile struct {
	PrivateKey     string `json:"private_key"`
	EndpointV4     string `json:"endpoint_v4"`
	EndpointPubKey string `json:"endpoint_pub_key"`
}

type registrationInput struct {
	JWT        string `json:"jwt"`
	DeviceName string `json:"device_name"`
	AcceptTOS  bool   `json:"accept_tos"`
}

func registerProfile(input registrationInput) (profile, error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return profile{}, fmt.Errorf("generate MASQUE key: %w", err)
	}
	der, err := x509.MarshalECPrivateKey(privateKey)
	if err != nil {
		return profile{}, fmt.Errorf("marshal MASQUE key: %w", err)
	}
	account, err := warp.Register("PC", "en_US", input.JWT, input.AcceptTOS)
	if err != nil {
		return profile{}, fmt.Errorf("register WARP device: %w", err)
	}
	pub, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		return profile{}, fmt.Errorf("marshal MASQUE public key: %w", err)
	}
	updated, err := warp.EnrollKey(account.ID, account.Token, pub, input.DeviceName)
	if err != nil {
		return profile{}, fmt.Errorf("enroll MASQUE key: %w", err)
	}
	if len(updated.Config.Peers) == 0 {
		return profile{}, errors.New("Cloudflare returned no MASQUE peer")
	}
	peer := updated.Config.Peers[0]
	endpoint := strings.TrimSuffix(strings.TrimSuffix(peer.Endpoint.V4, ":443"), ":0")
	if net.ParseIP(endpoint) == nil {
		return profile{}, fmt.Errorf("invalid MASQUE endpoint returned by Cloudflare: %q", peer.Endpoint.V4)
	}
	return profile{PrivateKey: base64.StdEncoding.EncodeToString(der), EndpointV4: endpoint, EndpointPubKey: peer.PublicKey}, nil
}

func runRegistration() error {
	var input registrationInput
	decoder := json.NewDecoder(os.Stdin)
	if err := decoder.Decode(&input); err != nil {
		return fmt.Errorf("read registration request: %w", err)
	}
	result, err := registerProfile(input)
	if err != nil {
		return err
	}
	return json.NewEncoder(os.Stdout).Encode(result)
}

func loadProfile(path string) (profile, error) {
	body, err := os.ReadFile(path)
	if err != nil {
		return profile{}, fmt.Errorf("read profile: %w", err)
	}
	var p profile
	if err := json.Unmarshal(body, &p); err != nil {
		return profile{}, fmt.Errorf("parse profile: %w", err)
	}
	if p.PrivateKey == "" || p.EndpointV4 == "" || p.EndpointPubKey == "" {
		return profile{}, errors.New("profile requires private_key, endpoint_v4, and endpoint_pub_key")
	}
	return p, nil
}

func parsePrivateKey(encoded string) (*ecdsa.PrivateKey, error) {
	der, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, fmt.Errorf("decode private key: %w", err)
	}
	key, err := x509.ParseECPrivateKey(der)
	if err != nil {
		return nil, fmt.Errorf("parse private key: %w", err)
	}
	if key.Curve != elliptic.P256() {
		return nil, errors.New("private key must use P-256")
	}
	return key, nil
}

func parsePublicKey(encoded string) (*ecdsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(encoded))
	if block == nil {
		return nil, errors.New("decode endpoint public key: PEM block missing")
	}
	key, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse endpoint public key: %w", err)
	}
	public, ok := key.(*ecdsa.PublicKey)
	if !ok {
		return nil, errors.New("endpoint public key must be ECDSA")
	}
	return public, nil
}

func clientTLS(profile profile) (*tls.Config, error) {
	privateKey, err := parsePrivateKey(profile.PrivateKey)
	if err != nil {
		return nil, err
	}
	peerKey, err := parsePublicKey(profile.EndpointPubKey)
	if err != nil {
		return nil, err
	}
	cert, err := x509.CreateCertificate(rand.Reader, &x509.Certificate{
		SerialNumber: big.NewInt(time.Now().UnixNano()),
		NotBefore:    time.Now().Add(-time.Minute),
		NotAfter:     time.Now().Add(24 * time.Hour),
	}, &x509.Certificate{}, &privateKey.PublicKey, privateKey)
	if err != nil {
		return nil, fmt.Errorf("create client certificate: %w", err)
	}
	cfg, err := warp.PrepareTlsConfig(privateKey, peerKey, [][]byte{cert}, warpProxySNI, false)
	if err != nil {
		return nil, err
	}
	return cfg, nil
}

func quicConfig() *quic.Config {
	return &quic.Config{
		EnableDatagrams:                false,
		KeepAlivePeriod:                20 * time.Second,
		InitialConnectionReceiveWindow: 10_000_000,
		MaxConnectionReceiveWindow:     10_000_000,
		InitialStreamReceiveWindow:     1_000_000,
		MaxStreamReceiveWindow:         1_000_000,
		MaxIncomingStreams:             100,
		MaxIncomingUniStreams:          100,
	}
}

func newProxyWithTLS(p profile, tlsCfg *tls.Config) (*warp.L4Proxy, error) {
	endpointIP := net.ParseIP(p.EndpointV4)
	if endpointIP == nil {
		return nil, fmt.Errorf("invalid endpoint_v4 %q", p.EndpointV4)
	}
	return warp.NewL4Proxy(warp.L4ProxyConfig{
		TLSConfig:         tlsCfg,
		QUICConfig:        quicConfig(),
		Endpoint:          &net.UDPAddr{IP: endpointIP, Port: 443},
		ResolveLocally:    false,
		ConnectTimeout:    connectTimeout,
		ConnectRetryCount: 2,
	})
}
func proxyBasicAuth(r *http.Request) (string, string, bool) {
	value := strings.TrimSpace(r.Header.Get("Proxy-Authorization"))
	if value == "" {
		return "", "", false
	}
	const prefix = "Basic "
	if !strings.HasPrefix(value, prefix) {
		return "", "", false
	}
	decoded, err := base64.StdEncoding.DecodeString(strings.TrimSpace(strings.TrimPrefix(value, prefix)))
	if err != nil {
		return "", "", false
	}
	credentials := strings.SplitN(string(decoded), ":", 2)
	if len(credentials) != 2 {
		return "", "", false
	}
	return credentials[0], credentials[1], true
}

type h2Conn struct {
	conn io.ReadWriteCloser
	addr string
}

func (c *h2Conn) Read(b []byte) (int, error)  { return c.conn.Read(b) }
func (c *h2Conn) Write(b []byte) (int, error) { return c.conn.Write(b) }
func (c *h2Conn) Close() error                { return c.conn.Close() }
func (c *h2Conn) LocalAddr() net.Addr         { return &net.TCPAddr{} }
func (c *h2Conn) RemoteAddr() net.Addr {
	return &net.TCPAddr{IP: net.ParseIP("162.159.198.2"), Port: 443}
}
func (c *h2Conn) SetDeadline(t time.Time) error      { return nil }
func (c *h2Conn) SetReadDeadline(t time.Time) error  { return nil }
func (c *h2Conn) SetWriteDeadline(t time.Time) error { return nil }

func dialH2(ctx context.Context, tlsCfg *tls.Config, target string) (net.Conn, error) {
	h2Endpoint := net.JoinHostPort("162.159.198.2", "443")

	h2TLS := tlsCfg.Clone()
	h2TLS.NextProtos = []string{"h2"}
	h2TLS.ServerName = warpProxySNI

	dialer := &net.Dialer{Timeout: connectTimeout}
	rawConn, err := tls.DialWithDialer(dialer, "tcp", h2Endpoint, h2TLS)
	if err != nil {
		return nil, fmt.Errorf("TCP connect to %s: %w", h2Endpoint, err)
	}
	h2Transport := &http2.Transport{
		DialTLS: func(network, addr string, cfg *tls.Config) (net.Conn, error) {
			return rawConn, nil
		},
	}
	h2Client := &http.Client{Transport: h2Transport}
	connectReq, err := http.NewRequestWithContext(ctx, http.MethodConnect, "https://"+target, nil)
	if err != nil {
		_ = rawConn.Close()
		return nil, fmt.Errorf("build CONNECT request: %w", err)
	}
	connectReq.Host = target
	connectReq.Header.Set("cf-connect-proto", "cf-connect-ip")
	connectReq.Header.Set("pq-enabled", "false")
	connectReq.Header.Set("User-Agent", "")
	resp, err := h2Client.Do(connectReq)
	if err != nil {
		_ = rawConn.Close()
		return nil, fmt.Errorf("HTTP/2 CONNECT: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		_ = resp.Body.Close()
		_ = rawConn.Close()
		return nil, fmt.Errorf("HTTP/2 CONNECT rejected with status %d", resp.StatusCode)
	}
	return rawConn, nil
}

func proxyHandler(proxy *warp.L4Proxy, tlsCfg *tls.Config, authToken string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodConnect {
			http.Error(w, "CONNECT required", http.StatusMethodNotAllowed)
			return
		}
		if authToken != "" {
			user, pass, ok := proxyBasicAuth(r)
			if !ok || user != "9router" || pass != authToken {
				w.Header().Set("Proxy-Authenticate", `Basic realm="9router-warp"`)
				http.Error(w, "proxy authentication required", http.StatusProxyAuthRequired)
				return
			}
		}
		if strings.TrimSpace(r.Host) == "" {
			http.Error(w, "target required", http.StatusBadRequest)
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), connectTimeout)
		defer cancel()
		upstream, err := proxy.DialContext(ctx, r.Host)
		if err != nil {
			log.Printf("[WARP] QUIC dial %s failed: %v, trying HTTP/2", r.Host, err)
			upstream, err = dialH2(ctx, tlsCfg, r.Host)
			if err != nil {
				log.Printf("[WARP] HTTP/2 dial %s failed: %v", r.Host, err)
				http.Error(w, "WARP connection failed", http.StatusBadGateway)
				return
			}
		}
		hijacker, ok := w.(http.Hijacker)
		if !ok {
			_ = upstream.Close()
			http.Error(w, "hijacking unsupported", http.StatusInternalServerError)
			return
		}
		client, rw, err := hijacker.Hijack()
		if err != nil {
			_ = upstream.Close()
			return
		}
		if _, err := rw.WriteString("HTTP/1.1 200 Connection Established\r\n\r\n"); err != nil {
			_ = client.Close()
			_ = upstream.Close()
			return
		}
		if err := rw.Flush(); err != nil {
			_ = client.Close()
			_ = upstream.Close()
			return
		}
		warp.RelayTCP(client, upstream)
	})
}

func main() {
	register := flag.Bool("register-stdin", false, "register a consumer WARP MASQUE profile from JSON on stdin")
	configPath := flag.String("config", "config.json", "WARP profile JSON path")
	bind := flag.String("bind", "127.0.0.1", "local proxy bind address")
	port := flag.Int("port", defaultPort, "local HTTP CONNECT proxy port")
	authToken := flag.String("token", "", "required local proxy token")
	flag.Parse()
	if *register {
		if err := runRegistration(); err != nil {
			log.Fatal(err)
		}
		return
	}
	if *bind != "127.0.0.1" && *bind != "::1" {
		log.Fatal("bind must be loopback-only")
	}
	p, err := loadProfile(*configPath)
	if err != nil {
		log.Fatal(err)
	}
	tlsCfg, err := clientTLS(p)
	if err != nil {
		log.Fatal(err)
	}
	proxy, err := newProxyWithTLS(p, tlsCfg)
	if err != nil {
		log.Fatal(err)
	}
	server := &http.Server{Addr: net.JoinHostPort(*bind, fmt.Sprint(*port)), Handler: proxyHandler(proxy, tlsCfg, *authToken), ReadHeaderTimeout: 10 * time.Second}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() { <-ctx.Done(); _ = server.Shutdown(context.Background()) }()
	log.Printf("WARP HTTP CONNECT proxy listening on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
