package main

import (
	"encoding/base64"
	"net/http"
	"os"
	"path/filepath"
	"testing"
)

func TestProxyBasicAuthReadsProxyAuthorization(t *testing.T) {
	request, err := http.NewRequest(http.MethodConnect, "https://google.com:443", nil)
	if err != nil {
		t.Fatal(err)
	}
	request.Header.Set("Proxy-Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte("9router:secret")))
	user, pass, ok := proxyBasicAuth(request)
	if !ok || user != "9router" || pass != "secret" {
		t.Fatalf("proxyBasicAuth() = %q, %q, %t", user, pass, ok)
	}
}

func TestLoadProfileRequiresTunnelFields(t *testing.T) {
	path := filepath.Join(t.TempDir(), "config.json")
	if err := os.WriteFile(path, []byte(`{"private_key":"key"}`), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err := loadProfile(path); err == nil {
		t.Fatal("expected incomplete profile to be rejected")
	}
}

func TestParsePrivateKeyRejectsMalformedInput(t *testing.T) {
	if _, err := parsePrivateKey("not-base64"); err == nil {
		t.Fatal("expected malformed key to be rejected")
	}
}
