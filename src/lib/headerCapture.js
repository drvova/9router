// Autonomous client-fingerprint capture.
//
// 9router is the front door: every request it serves already carries the calling
// client's headers, so the set an upstream gate checks for arrives on its own. This
// records what arrived so the dashboard can offer it.
//
// One flat ring rather than a map keyed by provider. Keying by provider meant a node
// that had never been sent traffic had nothing to offer, even when the router had seen
// plenty of requests — the fingerprint of a client is a property of the client, not of
// whichever provider a given request happened to route to.
//
// In memory only, deliberately. A disk record of inbound headers is a store of other
// clients' credentials; nothing here outlives the process, and the credential and
// transport headers are dropped before anything is kept at all.

const SKIP = new Set([
  // supplied by the connection, or rewritten in transit — recording them is either
  // useless or a credential leak
  "authorization", "x-api-key", "cookie", "set-cookie", "proxy-authorization",
  "host", "content-length", "content-type", "connection", "accept", "accept-encoding",
  "accept-language", "transfer-encoding", "expect", "te", "upgrade", "via", "forwarded",
  "x-real-ip",
]);

// Anything a proxy hop adds describes the network path, not the client. Matched as a
// family: enumerating x-forwarded-for/-host/-proto missed x-forwarded-port.
const PROXY_ADDED = /^x-forwarded-/i;

// Headers browsers and generic HTTP clients send; they identify the caller, not a
// vendor client worth reproducing.
const UNINTERESTING = /^(sec-|dnt$|origin$|referer$|user-agent$|pragma$|cache-control$|if-|range$|priority$)/i;

// The client's own system prompt, read from whichever shape the request arrived in.
// This is the text an upstream prompt gate compares against, and it arrives on the same
// request as the headers, so there is no reason to capture one without the other.
function extractSystemPrompt(body) {
  if (!body || typeof body !== "object") return null;

  // OpenAI Responses: a top-level string
  if (typeof body.instructions === "string" && body.instructions.trim()) return body.instructions;

  // Claude: body.system as a string, or as blocks
  if (typeof body.system === "string" && body.system.trim()) return body.system;
  if (Array.isArray(body.system)) {
    const text = body.system.map((b) => (typeof b === "string" ? b : b?.text || "")).join("\n\n").trim();
    if (text) return text;
  }

  // OpenAI chat / responses input arrays
  const arr = Array.isArray(body.messages) ? body.messages : Array.isArray(body.input) ? body.input : null;
  const first = arr?.find((m) => m && (m.role === "system" || m.role === "developer"));
  if (!first) return null;
  if (typeof first.content === "string") return first.content.trim() || null;
  if (Array.isArray(first.content)) {
    const text = first.content.map((c) => (typeof c === "string" ? c : c?.text || "")).join("").trim();
    return text || null;
  }
  return null;
}

const MAX_ENTRIES = 10;
const recent = [];

// Distinct clients are distinguished by which headers they send, not by the values,
// which change every request. So a repeat from the same client refreshes its entry
// rather than filling the ring with near-duplicates.
const signatureOf = (headers) => Object.keys(headers).map((k) => k.toLowerCase()).sort().join(",");

/**
 * Record the interesting headers of one inbound request.
 * @param {string} provider - Provider the request routed to, for display only
 * @param {object} headers - Inbound headers
 * @param {object} [body] - Inbound request body, read for its system prompt only
 * @returns {number} count of headers kept
 */
export function recordClientHeaders(provider, headers, body = null) {
  if (!headers) return 0;

  const kept = {};
  for (const [rawName, value] of Object.entries(headers)) {
    const name = String(rawName);
    const lower = name.toLowerCase();
    if (SKIP.has(lower) || PROXY_ADDED.test(lower) || UNINTERESTING.test(lower)) continue;
    if (typeof value !== "string" || value === "") continue;
    kept[name] = value;
  }
  const systemPrompt = extractSystemPrompt(body);
  if (Object.keys(kept).length === 0 && !systemPrompt) return 0;

  const signature = signatureOf(kept);
  const existing = recent.findIndex((e) => e.signature === signature);
  if (existing >= 0) recent.splice(existing, 1);

  recent.unshift({ signature, headers: kept, systemPrompt, provider: provider || null, at: new Date().toISOString() });
  if (recent.length > MAX_ENTRIES) recent.length = MAX_ENTRIES;
  return Object.keys(kept).length;
}

/**
 * Best capture to offer a provider: one recorded against it if there is one, otherwise
 * the most recent from anywhere, since a client's header set does not depend on which
 * provider the request was routed to.
 * @param {string} provider - Provider id being configured
 * @returns {{ headers: object, at: string, provider: string|null, exact: boolean }|null}
 */
export function getClientHeaderCapture(provider) {
  if (recent.length === 0) return null;
  const exact = provider ? recent.find((e) => e.provider === provider) : null;
  const chosen = exact || recent[0];
  return {
    headers: chosen.headers,
    systemPrompt: chosen.systemPrompt || null,
    at: chosen.at,
    provider: chosen.provider,
    exact: Boolean(exact),
  };
}

/**
 * Every distinct client header set the router has seen, newest first.
 * @returns {Array<{ headers: object, at: string, provider: string|null }>}
 */
export function listClientHeaderCaptures() {
  return recent.map(({ headers, systemPrompt, at, provider }) => ({ headers, systemPrompt, at, provider }));
}

export function clearClientHeaderCaptures() {
  recent.length = 0;
  return true;
}
