import { describe, expect, it } from "vitest";
import { buildPromptContext, buildRuntimeVars, renderPromptTemplate } from "../../open-sse/rtk/promptTemplate.js";

const ctx = (vars, runtime = {}) => buildPromptContext(vars, buildRuntimeVars({
  provider: "openai-compatible-chat-abc",
  alias: "oc-prod",
  model: "gpt-5.6-sol",
  format: "openai",
  connection: "Key 1",
  ...runtime,
}));

describe("renderPromptTemplate", () => {
  it("renders the constructs a real client prompt ships with", () => {
    // Shape lifted from an actual vendor system prompt: variable, whitespace-controlled
    // conditional on a nested flag, and an inline if/else using the `in` operator.
    const template = [
      "This conversation is powered by {{ modelName }}",
      "{%- if not productFeatures.DisableMultimodalGeneration %}",
      "- Multimodal content generation.",
      "{%- endif %}",
      "Center: {% if '中文' in ResponseLanguage %}专家{% else %}Experts{% endif %}",
      "Folder: {{ dataFolderName }}",
    ].join("\n");

    const out = renderPromptTemplate(template, ctx({
      "productFeatures.DisableMultimodalGeneration": "false",
      ResponseLanguage: "English",
      dataFolderName: ".workbuddy",
    }));

    expect(out).toContain("powered by gpt-5.6-sol");
    expect(out).toContain("- Multimodal content generation.");
    expect(out).toContain("Center: Experts");
    expect(out).toContain("Folder: .workbuddy");
    expect(out).not.toContain("{%");
    expect(out).not.toContain("{{");
  });

  it('coerces "false" to a real boolean so `not` takes the right branch', () => {
    const t = "{% if not flags.Off %}ON{% else %}OFF{% endif %}";
    // The whole point: a bare "false" string is truthy in Jinja and would answer OFF.
    expect(renderPromptTemplate(t, ctx({ "flags.Off": "false" }))).toBe("ON");
    expect(renderPromptTemplate(t, ctx({ "flags.Off": "true" }))).toBe("OFF");
  });

  it("picks the CJK branch when the value matches", () => {
    const t = "{% if '中文' in ResponseLanguage %}专家{% else %}Experts{% endif %}";
    expect(renderPromptTemplate(t, ctx({ ResponseLanguage: "中文" }))).toBe("专家");
  });

  it("resolves built-ins per attempt, so fallback renders the next provider", () => {
    const t = "{{ provider }}/{{ model }} via {{ connection }}";
    expect(renderPromptTemplate(t, ctx({}))).toBe("openai-compatible-chat-abc/gpt-5.6-sol via Key 1");
    const next = buildPromptContext({}, buildRuntimeVars({
      provider: "anthropic", alias: "anthropic", model: "claude-sonnet-4", format: "claude", connection: "Key 2",
    }));
    expect(renderPromptTemplate(t, next)).toBe("anthropic/claude-sonnet-4 via Key 2");
  });

  it("lets operator variables win over built-ins", () => {
    expect(renderPromptTemplate("{{ modelName }}", ctx({ modelName: "Claude 3.7 Sonnet" })))
      .toBe("Claude 3.7 Sonnet");
  });

  it("fails open to the raw text on a malformed template", () => {
    const broken = "hello {% if %} world";
    expect(renderPromptTemplate(broken, ctx({}))).toBe(broken);
  });

  it("cannot reach the filesystem — no loader is configured", () => {
    const t = '{% include "/etc/passwd" %}';
    expect(renderPromptTemplate(t, ctx({}))).toBe(t);
  });

  it("renders when a referenced variable was never declared (the `in` trap)", () => {
    // Regression: `'x' in undefined` is the one construct nunjucks hard-throws on, so an
    // undeclared ResponseLanguage aborted the whole render and shipped raw Jinja upstream.
    const t = "{% if '\u4e2d\u6587' in ResponseLanguage %}\u4e13\u5bb6{% else %}Experts{% endif %}";
    expect(renderPromptTemplate(t, ctx({}))).toBe("Experts");
  });

  it("renders a full vendor prompt with nothing declared at all", () => {
    const template = [
      "Powered by {{ modelName }}",
      "{%- if not productFeatures.DisableMultimodalGeneration %}",
      "- Multimodal.",
      "{%- endif %}",
      "{% if '\u4e2d\u6587' in ResponseLanguage %}\u4e13\u5bb6{% else %}Experts{% endif %}",
      "Folder: {{ dataFolderName }}",
    ].join("\n");
    const out = renderPromptTemplate(template, ctx({}));
    expect(out).toContain("Powered by gpt-5.6-sol");
    expect(out).toContain("- Multimodal.");
    expect(out).toContain("Experts");
    expect(out).not.toContain("{%");
    expect(out).not.toContain("{{");
  });

  it("does not seed over nunjucks globals or filters", () => {
    // Seeding `range` as "" would turn this into "Unable to call `range`".
    expect(renderPromptTemplate("{% for i in range(3) %}{{ i }}{% endfor %}", ctx({}))).toBe("012");
    expect(renderPromptTemplate("{{ name | upper }}", ctx({ name: "wb" }))).toBe("WB");
  });

  it("reuses the compiled template across calls without leaking state", () => {
    const t = "{{ modelName }}|{{ extra }}";
    expect(renderPromptTemplate(t, ctx({ extra: "one" }))).toBe("gpt-5.6-sol|one");
    expect(renderPromptTemplate(t, ctx({}))).toBe("gpt-5.6-sol|");
    expect(renderPromptTemplate(t, ctx({ extra: "two" }))).toBe("gpt-5.6-sol|two");
  });

  it("leaves plain text untouched", () => {
    expect(renderPromptTemplate("Answer in British English.", ctx({})))
      .toBe("Answer in British English.");
  });

  it("renders an undefined variable as empty rather than throwing", () => {
    expect(renderPromptTemplate("[{{ nope }}]", ctx({}))).toBe("[]");
  });
});

describe("buildPromptContext", () => {
  it("expands dotted names into nested objects", () => {
    const c = buildPromptContext({ "a.b.c": "1", plain: "x" }, {});
    expect(c).toEqual({ a: { b: { c: 1 } }, plain: "x" });
  });

  it("coerces booleans, numbers and null but leaves other strings alone", () => {
    const c = buildPromptContext({ t: "true", f: "false", n: "42", z: "null", s: "hi", e: "" }, {});
    expect(c).toEqual({ t: true, f: false, n: 42, z: null, s: "hi", e: "" });
  });
});
