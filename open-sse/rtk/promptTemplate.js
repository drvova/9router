// Jinja2 rendering for operator-authored system prompts. Real client prompts ship
// as Jinja templates ({{ var }}, {%- if %}, {% else %}, {% endif %}), so pasting one
// into a provider only works if the same syntax renders. Sits next to systemInject.js
// because it exists solely to produce the text that injector appends.

import nunjucks from "nunjucks";

// No loader on purpose: renderString needs none, and its absence means {% include %}
// and {% extends %} cannot reach the filesystem. autoescape off because this is a
// prompt, not HTML — escaping would mangle quotes, markdown and CJK-adjacent markup.
const env = new nunjucks.Environment(null, { autoescape: false, throwOnUndefined: false });

/**
 * Render a prompt template. Fail-open by design: a malformed template must never
 * take down a request, so any render error falls back to the raw text.
 * @param {string} text - Template source
 * @param {object} context - Values available to the template
 * @param {object} [log] - Optional logger
 * @returns {string} Rendered text, or the original text on failure
 */
export function renderPromptTemplate(text, context, log) {
  if (!text || !text.includes("{")) return text;
  try {
    return env.renderString(text, context || {});
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
