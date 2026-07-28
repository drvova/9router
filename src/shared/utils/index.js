// Shared Utils - Export all
export { cn } from "./cn";
export * as api from "./api";
export { getProviderIconSrc, markProviderIconMissing, resolveProviderIconId } from "./providerIcon";

import { v4 as uuidv4 } from "uuid";

/**
 * Generate unique ID (UUID v4)
 * @returns {string} UUID v4 string
 */
export const generateId = uuidv4;

/**
 * Extract error code from error message (401, 429, 503...)
 * @param {string} lastError - Error message
 * @returns {string|null} Error code or null
 */
export function getErrorCode(lastError) {
  if (!lastError) return null;
  const match = lastError.match(/\b([45]\d{2})\b/);
  return match ? match[1] : "ERR";
}

/**
 * Get relative time string (e.g. "5 min ago")
 * @param {string} isoDate - ISO date string
 * @returns {string} Relative time
 */
export function getRelativeTime(isoDate) {
  if (!isoDate) return "";
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// RFC 7230 field-name token characters.
const HEADER_NAME_RE = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;

const hasControlChars = (s) => [...s].some((c) => {
  const code = c.charCodeAt(0);
  return code < 0x20 || code === 0x7f;
});

/**
 * Parse "Name: Value" lines into a header object.
 * Blank lines and #-comments are skipped. Malformed names and control
 * characters in values are rejected (header-injection guard).
 * @param {string} text - Raw textarea content
 * @returns {{ headers?: Object, error?: string }}
 */
export function parseHeaderLines(text) {
  if (!text || !text.trim()) return { headers: {} };
  const headers = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const sep = line.indexOf(":");
    if (sep < 1) return { error: `Invalid header line "${line}" - expected "Name: Value"` };
    const name = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    if (!HEADER_NAME_RE.test(name)) return { error: `Invalid header name "${name}"` };
    if (hasControlChars(value)) return { error: `Invalid characters in value for "${name}"` };
    headers[name] = value;
  }
  return { headers };
}

/**
 * Render a stored header object back to editable "Name: Value" lines.
 * @param {Object} headers - Header map
 * @returns {string} One "Name: Value" per line
 */
export function formatHeaderLines(headers) {
  return Object.entries(headers || {}).map(([k, v]) => `${k}: ${v}`).join("\n");
}
