// Jinja2 rendering for operator-authored system prompts. Real client prompts ship
// as Jinja templates ({{ var }}, {%- if %}, {% else %}, {% endif %}), so pasting one
// into a provider only works if the same syntax renders. Sits next to systemInject.js
// because it exists solely to produce the text that injector appends.

import nunjucks from "nunjucks";

// No loader on purpose: renderString needs none, and its absence means {% include %}
// and {% extends %} cannot reach the filesystem. autoescape off because this is a
// prompt, not HTML — escaping would mangle quotes, markdown and CJK-adjacent markup.
const env = new nunjucks.Environment(null, { autoescape: false, throwOnUndefined: false });

// Names nunjucks resolves itself. Seeding these as empty strings would break them —
// `range: ""` turns {% for i in range(3) %} into "Unable to call `range`".
const RESERVED = new Set([...Object.keys(env.globals), ...Object.keys(env.filters)]);

// Compiled templates, keyed by source. renderString recompiles on every call:
// measured 1.59ms vs 0.01ms for a 5KB prompt, which would be paid on every request.
// Bounded because the key is operator input and editing a prompt strands the old entry.
const CACHE_LIMIT = 32;
const cache = new Map();

/**
 * Root identifiers a template reads, via nunjucks' own parser rather than a regex
 * over the source. `a.b.c` yields `a`; loop and {% set %} names are included and are
 * harmlessly shadowed by the render frame.
 */
function collectRootSymbols(source) {
  const roots = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (node instanceof nunjucks.nodes.LookupVal) return walk(node.target);
    if (node instanceof nunjucks.nodes.Symbol) {
      if (!RESERVED.has(node.value)) roots.add(node.value);
      return;
    }
    if (Array.isArray(node.children)) node.children.forEach(walk);
    for (const field of node.fields || []) walk(node[field]);
  };
  walk(nunjucks.parser.parse(source, [], {}));
  return roots;
}

function compile(source) {
  const cached = cache.get(source);
  if (cached) return cached;
  // eagerCompile: surface syntax errors here, so collectRootSymbols only ever
  // walks a source the parser already accepted.
  const entry = {
    template: new nunjucks.Template(source, env, null, true),
    roots: collectRootSymbols(source),
  };
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(source, entry);
  return entry;
}

/**
 * Render a prompt template. Fail-open by design: a malformed template must never
 * take down a request, so any render error falls back to the raw text.
 *
 * Undeclared names are seeded as empty strings. `in` is the one operator that hard
 * throws on undefined — `{% if 'x' in Lang %}` with Lang unset aborted the whole
 * render and shipped raw Jinja to the model. An operator pasting a vendor prompt
 * cannot be expected to declare every name it mentions, and `'x' in ""` is false,
 * which is the branch they wanted anyway.
 *
 * @param {string} text - Template source
 * @param {object} context - Values available to the template
 * @param {object} [log] - Optional logger
 * @returns {string} Rendered text, or the original text on failure
 */
export function renderPromptTemplate(text, context, log) {
  if (!text || !text.includes("{")) return text;
  try {
    const { template, roots } = compile(text);
    const scoped = { ...context };
    for (const name of roots) if (!(name in scoped)) scoped[name] = "";
    return template.render(scoped);
  } catch (error) {
    log?.warn?.("SYSPROMPT", `template render failed, sending raw text: ${error.message}`);
    return text;
  }
}

// "false" must become a real boolean: Jinja treats any non-empty string as truthy,
// so {% if not flags.X %} would silently take the wrong branch on the string "false".
function coerce(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value !== "" && Number.isFinite(Number(value))) return Number(value);
  return value;
}

/**
 * Build the render context: runtime built-ins overlaid with operator variables.
 * Dotted names expand into nested objects so `productFeatures.Disable: false`
 * satisfies `{% if not productFeatures.Disable %}`.
 * Operator variables win on clash — the operator owns the prompt, including the
 * right to state a different model name than the one actually routed.
 * @param {object} vars - Flat { name: stringValue } map, dots allowed in names
 * @param {object} runtime - Built-in values for this attempt
 * @returns {object} Context for renderPromptTemplate
 */
export function buildPromptContext(vars, runtime) {
  const context = { ...runtime };
  for (const [name, value] of Object.entries(vars || {})) {
    const path = name.split(".");
    let node = context;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!node[key] || typeof node[key] !== "object") node[key] = {};
      node = node[key];
    }
    node[path[path.length - 1]] = coerce(value);
  }
  return context;
}

/**
 * Runtime values every prompt can use, resolved per attempt so a fallback to a
 * different provider renders that provider's values.
 * @param {object} attempt - { provider, model, alias, format, connection }
 * @returns {object} Built-in variables
 */
export function buildRuntimeVars({ provider, model, alias, format, connection }) {
  const now = new Date();
  return {
    provider,
    alias,
    model,
    modelName: model,
    format,
    connection: connection || "",
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 8),
    datetime: now.toISOString(),
  };
}
