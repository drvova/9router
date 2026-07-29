// Turn an observed header set into a header template.
//
// A capture is a snapshot: its ids are frozen. Storing them verbatim would send one
// identical uuid on every request, which is a fingerprint no real client produces.
// So identifier-shaped values are replaced with the template variables that
// regenerate them per request, and values shared across several headers are given
// the same variable so the correlation survives.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX32_RE = /^[0-9a-f]{32}$/i;
const HEX16_RE = /^[0-9a-f]{16}$/i;
// Composite headers that embed a trace id and span id. These are authoritative: a
// value sitting in the trace-id slot of a traceparent IS the trace id, regardless of
// which header name happens to be read first.
const TRACEPARENT_RE = /^(\d{2})-([0-9a-f]{32})-([0-9a-f]{16})-(\d{2})$/i;
const B3_RE = /^([0-9a-f]{32})-([0-9a-f]{16})(?:-([0-9a-fx]+))?$/i;

/**
 * Replace identifier-shaped values with per-request template variables, keeping
 * shared values on a shared variable.
 * @param {Object} headers - { name: literalValue }
 * @returns {{ headers: Object, replaced: Object }} replaced maps variable -> header names
 */
export function templatiseHeaders(headers) {
  const entries = Object.entries(headers || {});

  // Pass 1: read the composites. Their slots name the trace and span ids by format,
  // which is stronger evidence than header names or iteration order.
  let traceValue = null;
  let spanValue = null;
  for (const [, value] of entries) {
    const tp = TRACEPARENT_RE.exec(value);
    if (tp) { traceValue = tp[2].toLowerCase(); spanValue = tp[3].toLowerCase(); break; }
  }
  if (!traceValue) {
    for (const [, value] of entries) {
      const b3 = B3_RE.exec(value);
      if (b3) { traceValue = b3[1].toLowerCase(); spanValue = b3[2].toLowerCase(); break; }
    }
  }

  // Pass 2: how many headers carry each literal, counting values inside composites so a
  // trace id shared with X-B3-TraceId reads as shared.
  const uses = new Map();
  const bump = (v) => uses.set(v.toLowerCase(), (uses.get(v.toLowerCase()) || 0) + 1);
  for (const [, value] of entries) {
    const tp = TRACEPARENT_RE.exec(value);
    if (tp) { bump(tp[2]); bump(tp[3]); continue; }
    const b3 = B3_RE.exec(value);
    if (b3) { bump(b3[1]); bump(b3[2]); continue; }
    bump(value);
  }

  const assigned = new Map();
  const taken = new Set();
  const claim = (name, fallback) => {
    if (taken.has(name)) return fallback;
    taken.add(name);
    return `{{ ${name} }}`;
  };

  const variableFor = (value) => {
    const key = value.toLowerCase();
    if (assigned.has(key)) return assigned.get(key);
    const shared = (uses.get(key) || 0) > 1;
    let v = null;
    if (key === traceValue) v = claim("traceId", "{{ hex(32) }}");
    else if (key === spanValue) v = claim("spanId", "{{ hex(16) }}");
    else if (HEX16_RE.test(value)) v = claim("spanId", "{{ hex(16) }}");
    else if (HEX32_RE.test(value)) v = claim("requestId", "{{ hex(32) }}");
    else if (UUID_RE.test(value)) v = shared ? claim("conversationId", "{{ uuid() }}") : "{{ uuid() }}";
    // A shared value must resolve to a stable variable; a fresh-per-call fallback would
    // make two headers that agreed in the capture disagree at runtime.
    if (v && shared && v.includes("(")) v = claim("requestId", `{{ ${key === spanValue ? "spanId" : "traceId"} }}`);
    if (v) assigned.set(key, v);
    return v;
  };

  const out = {};
  const replaced = {};
  const note = (variable, name) => {
    const key = variable.replace(/[{}]/g, "").trim();
    (replaced[key] ||= []).push(name);
  };

  for (const [name, value] of entries) {
    const tp = TRACEPARENT_RE.exec(value);
    if (tp) {
      const t = variableFor(tp[2]);
      const sp = variableFor(tp[3]);
      out[name] = `${tp[1]}-${t}-${sp}-${tp[4]}`;
      note(t, name); note(sp, name);
      continue;
    }
    const b3 = B3_RE.exec(value);
    if (b3) {
      const t = variableFor(b3[1]);
      const sp = variableFor(b3[2]);
      out[name] = b3[3] ? `${t}-${sp}-${b3[3]}` : `${t}-${sp}`;
      note(t, name); note(sp, name);
      continue;
    }
    const v = variableFor(value);
    if (v) { out[name] = v; note(v, name); }
    else out[name] = value;
  }

  return { headers: out, replaced };
}
