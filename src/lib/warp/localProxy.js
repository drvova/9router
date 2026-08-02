import { ProxyAgent, fetch as undiciFetch } from "undici";

const DEFAULT_PORT = 40000;
const TRACE_URL = "https://www.cloudflare.com/cdn-cgi/trace";

function candidates() {
  const configured = Number(process.env.WARP_PROXY_PORT);
  return Number.isInteger(configured) && configured > 0 && configured < 65536
    ? [configured]
    : [DEFAULT_PORT];
}

async function probe(port, timeoutMs = 5000) {
  const proxyUrl = `http://127.0.0.1:${port}`;
  const dispatcher = new ProxyAgent({ uri: proxyUrl });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await undiciFetch(TRACE_URL, {
      dispatcher,
      signal: controller.signal,
      headers: { "user-agent": "9Router" },
    });
    const body = await response.text();
    const trace = Object.fromEntries(body.split(/\r?\n/).filter(Boolean).map((line) => {
      const index = line.indexOf("=");
      return index < 0 ? [line, ""] : [line.slice(0, index), line.slice(index + 1)];
    }));
    if (!response.ok || trace.warp !== "on" && trace.warp !== "plus") {
      return { ok: false, port, error: "Cloudflare trace did not confirm WARP egress" };
    }
    return { ok: true, port, proxyUrl, warp: trace.warp, colo: trace.colo || null };
  } catch (error) {
    return { ok: false, port, error: error?.name === "AbortError" ? "WARP proxy probe timed out" : error.message };
  } finally {
    clearTimeout(timer);
    await dispatcher.close();
  }
}

export async function detectOfficialWarpProxy() {
  for (const port of candidates()) {
    const result = await probe(port);
    if (result.ok) return result;
  }
  return { ok: false, error: "Official WARP local proxy was not detected on 127.0.0.1:40000" };
}
