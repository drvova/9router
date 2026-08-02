import { ProxyAgent as UndiciProxyAgent, fetch as undiciFetch } from "undici";
import { SocksProxyAgent } from "socks-proxy-agent";
import https from "node:https";

const DEFAULT_PORT = 40000;
const TRACE_URL = "https://www.cloudflare.com/cdn-cgi/trace";
const PROTOCOLS = ["https", "http", "socks5"];

function candidates() {
  const configured = Number(process.env.WARP_PROXY_PORT);
  return Number.isInteger(configured) && configured > 0 && configured < 65536 ? [configured] : [DEFAULT_PORT];
}

function parseTrace(body) {
  return Object.fromEntries(body.split(/\r?\n/).filter(Boolean).map((line) => {
    const index = line.indexOf("=");
    return index < 0 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)];
  }));
}

function verifyTrace(body, statusCode = 200) {
  const trace = parseTrace(body);
  return statusCode >= 200 && statusCode < 300 && (trace.warp === "on" || trace.warp === "plus") ? trace : null;
}

async function probeHttp(proxyUrl, timeoutMs) {
  const dispatcher = new UndiciProxyAgent({ uri: proxyUrl });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await undiciFetch(TRACE_URL, { dispatcher, signal: controller.signal, headers: { "user-agent": "9Router" } });
    const trace = verifyTrace(await response.text(), response.status);
    return trace ? { ok: true, proxyUrl, warp: trace.warp, colo: trace.colo || null } : { ok: false, error: "Cloudflare trace did not confirm WARP egress" };
  } catch (error) {
    return { ok: false, error: error?.name === "AbortError" ? "WARP proxy probe timed out" : error.message };
  } finally {
    clearTimeout(timer);
    await dispatcher.close();
  }
}

function probeSocks(proxyUrl, timeoutMs) {
  return new Promise((resolve) => {
    const request = https.get(TRACE_URL, { agent: new SocksProxyAgent(proxyUrl), timeout: timeoutMs, headers: { "user-agent": "9Router" } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const trace = verifyTrace(Buffer.concat(chunks).toString("utf8"), response.statusCode);
        resolve(trace ? { ok: true, proxyUrl, warp: trace.warp, colo: trace.colo || null } : { ok: false, error: "Cloudflare trace did not confirm WARP egress" });
      });
    });
    request.on("timeout", () => request.destroy(new Error("WARP proxy probe timed out")));
    request.on("error", (error) => resolve({ ok: false, error: error.message }));
  });
}

export async function detectOfficialWarpProxy() {
  const errors = [];
  for (const port of candidates()) {
    for (const protocol of PROTOCOLS) {
      const proxyUrl = `${protocol}://127.0.0.1:${port}`;
      const result = protocol === "socks5" ? await probeSocks(proxyUrl, 5000) : await probeHttp(proxyUrl, 5000);
      if (result.ok) return { ...result, port };
      errors.push(`${proxyUrl}: ${result.error}`);
    }
  }
  return { ok: false, error: `Official WARP local proxy was not detected. Tried ${candidates().map((port) => `127.0.0.1:${port}`).join(", ")}; ${errors.join("; ")}` };
}
