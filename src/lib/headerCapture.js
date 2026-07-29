// Autonomous client-fingerprint capture.
//
// 9router is the front door: every request it serves already carries the calling
// client's headers. So the header set an upstream gate checks for does not need to be
// pasted, probed or catalogued — it arrives on its own the first time the real client
// is pointed at the router. This records what arrived, per provider, so the dashboard
// can offer it.
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

// Headers 9router's own clients and browsers send; they identify the caller, not a
// vendor client worth reproducing.
const UNINTERESTING = /^(sec-|dnt$|origin$|referer$|user-agent$|pragma$|cache-control$|if-|range$|priority$)/i;

const MAX_PROVIDERS = 50;
const captures = new Map();

/**
 * Record the interesting headers of one inbound request.
 * @param {string} provider - Resolved provider id
 * @param {object} headers - Inbound headers, lowercase keys
 * @returns {number} count of headers kept
 */
export function recordClientHeaders(provider, headers) {
  if (!provider || !headers) return 0;

  const kept = {};
  for (const [rawName, value] of Object.entries(headers)) {
    const name = String(rawName);
    const lower = name.toLowerCase();
    if (SKIP.has(lower) || PROXY_ADDED.test(lower) || UNINTERESTING.test(lower)) continue;
    if (typeof value !== "string" || value === "") continue;
    kept[name] = value;
  }
  if (Object.keys(kept).length === 0) return 0;

  if (!captures.has(provider) && captures.size >= MAX_PROVIDERS) {
    // Bounded: the key is a provider id, so cardinality is small, but never unbounded.
    captures.delete(captures.keys().next().value);
  }
  captures.set(provider, { headers: kept, at: new Date().toISOString() });
  return Object.keys(kept).length;
}

/**
 * The most recent capture for a provider.
 * @param {string} provider - Provider id
 * @returns {{ headers: object, at: string }|null}
 */
export function getClientHeaderCapture(provider) {
  return captures.get(provider) || null;
}

export function clearClientHeaderCapture(provider) {
  return captures.delete(provider);
}
