import { describe, expect, it } from "vitest";
import { BUILT_IN_VAR_NAMES, buildPromptContext, buildRequestVars, buildRuntimeVars, collectTemplateVariables, renderHeaderValues, renderPromptTemplate } from "../../open-sse/rtk/promptTemplate.js";

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

describe("renderHeaderValues", () => {
  // Mirrors a real client's header block: correlated ids reused across several headers,
  // independent uuids where the client emits independent ones, fresh on every request.
  const WORKBUDDY = {
    "X-Conversation-ID": "{{ uuid() }}",
    "X-Conversation-Request-ID": "{{ uuid() }}",
    "X-Conversation-Message-ID": "{{ requestId }}",
    "X-Request-ID": "{{ requestId }}",
    traceparent: "00-{{ traceId }}-{{ spanId }}-01",
    b3: "{{ traceId }}-{{ spanId }}-1",
    "X-B3-TraceId": "{{ traceId }}",
    "X-B3-SpanId": "{{ spanId }}",
    "X-B3-Sampled": "1",
    "X-Product-Version": "5.2.7",
  };
  const render = () => renderHeaderValues(WORKBUDDY, { provider: "p", connection: "Key 1", ...buildRequestVars() });

  it("reuses one id where the client reuses it", () => {
    const h = render();
    expect(h["X-Conversation-Message-ID"]).toBe(h["X-Request-ID"]);
    expect(h.b3).toBe(`${h["X-B3-TraceId"]}-${h["X-B3-SpanId"]}-1`);
    expect(h.traceparent).toBe(`00-${h["X-B3-TraceId"]}-${h["X-B3-SpanId"]}-01`);
  });

  it("emits independent values where the client emits independent ones", () => {
    const h = render();
    expect(h["X-Conversation-ID"]).not.toBe(h["X-Conversation-Request-ID"]);
  });

  it("produces W3C-shaped trace ids", () => {
    const h = render();
    expect(h.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it("is fresh per request — a static value would repeat", () => {
    expect(render()["X-Request-ID"]).not.toBe(render()["X-Request-ID"]);
  });

  it("leaves literal values alone", () => {
    expect(render()["X-Product-Version"]).toBe("5.2.7");
    expect(render()["X-B3-Sampled"]).toBe("1");
  });

  it("strips CR/LF so a rendered value cannot inject a header", () => {
    const out = renderHeaderValues({ "X-Name": "{{ connection }}" }, { connection: "a\r\nX-Evil: 1" });
    expect(out["X-Name"]).toBe("a X-Evil: 1");
  });

  it("falls back to the raw value on a broken template", () => {
    const out = renderHeaderValues({ "X-A": "{% if %}" }, {});
    expect(out["X-A"]).toBe("{% if %}");
  });
});

describe("header templating is provider-agnostic", () => {
  // Nothing in the mechanism knows any vendor: whatever header names and value
  // templates an API demands, it renders. These are three unrelated real-world
  // fingerprint shapes exercising the same code path.
  const ctxFor = (provider) => ({ provider, connection: "acct", ...buildRequestVars() });

  it("renders an AWS-style x-amz fingerprint", () => {
    const h = renderHeaderValues({
      "x-amz-user-agent": "aws-sdk-js/1.0.0 SomeIDE",
      "amz-sdk-invocation-id": "{{ uuid() }}",
      "amz-sdk-request": "attempt=1; max=3",
    }, ctxFor("p"));
    expect(h["amz-sdk-invocation-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(h["amz-sdk-request"]).toBe("attempt=1; max=3");
  });

  it("renders a Datadog-style correlated trace pair", () => {
    const h = renderHeaderValues({
      "x-datadog-trace-id": "{{ traceId }}",
      "x-datadog-parent-id": "{{ spanId }}",
      "x-datadog-sampling-priority": "1",
    }, ctxFor("p"));
    expect(h["x-datadog-trace-id"]).not.toBe(h["x-datadog-parent-id"]);
    expect(h["x-datadog-sampling-priority"]).toBe("1");
  });

  it("renders an idempotency key plus a session header off one context", () => {
    const h = renderHeaderValues({
      "Idempotency-Key": "{{ requestId }}",
      "X-Session": "{{ provider }}-{{ connection }}",
      "X-Nonce": "{{ hex(12) }}",
    }, ctxFor("stripe-like"));
    expect(h["X-Session"]).toBe("stripe-like-acct");
    expect(h["X-Nonce"]).toMatch(/^[0-9a-f]{12}$/);
  });

  it("passes through a header with no template at all", () => {
    expect(renderHeaderValues({ "X-Static": "plain" }, ctxFor("p"))["X-Static"]).toBe("plain");
  });
});

describe("substitute mode: fill {{ vars }}, leave {% %} untouched", () => {
  // An upstream that checks the prompt it receives expects the control blocks
  // unevaluated, because the vendor's own client only does token substitution.
  const ctx = buildPromptContext(
    { productName: "MyClient", dataFolderName: ".myclient" },
    buildRuntimeVars({ provider: "p", alias: "a", model: "gpt-5.6-sol", format: "openai", connection: "k" })
  );
  const sub = (t) => renderPromptTemplate(t, ctx, null, "SYSPROMPT", "substitute");

  it("substitutes variables but preserves every control block byte-for-byte", () => {
    const tpl = "Powered by {{ modelName }} / {{ productName }}\n{%- if not f.X %}\nBlock\n{%- endif %}";
    const out = sub(tpl);
    expect(out).toContain("Powered by gpt-5.6-sol / MyClient");
    expect(out).toContain("{%- if not f.X %}");
    expect(out).toContain("{%- endif %}");
    expect(out).toContain("Block");
  });

  it("keeps an if/else block intact instead of choosing a branch", () => {
    const tpl = "{% if '\\u4e2d\\u6587' in ResponseLanguage %}\\u4e13\\u5bb6{% else %}Experts{% endif %}";
    expect(sub(tpl)).toBe(tpl);
  });

  it("tolerates whitespace inside the braces and dotted paths", () => {
    expect(sub("[{{modelName}}][{{  modelName  }}]")).toBe("[gpt-5.6-sol][gpt-5.6-sol]");
    const nested = buildPromptContext({ "a.b": "deep" }, {});
    expect(renderPromptTemplate("{{ a.b }}", nested, null, "T", "substitute")).toBe("deep");
  });

  it("leaves an unknown variable as its literal placeholder", () => {
    // Silently blanking it would corrupt a prompt an upstream is checking.
    expect(sub("[{{ nope }}]")).toBe("[{{ nope }}]");
    expect(sub("[{{ a.missing }}]")).toBe("[{{ a.missing }}]");
  });

  it("never emits object or function stringifications", () => {
    const c = buildPromptContext({}, { obj: { a: 1 }, fn: () => 1 });
    expect(renderPromptTemplate("{{ obj }}|{{ fn }}", c, null, "T", "substitute")).toBe("{{ obj }}|{{ fn }}");
  });

  it("jinja mode still evaluates, so the modes are genuinely different", () => {
    const tpl = "{% if 1 %}YES{% else %}NO{% endif %}";
    expect(renderPromptTemplate(tpl, ctx, null, "T", "jinja")).toBe("YES");
    expect(sub(tpl)).toBe(tpl);
  });
});

describe("collectTemplateVariables", () => {
  const SRC = [
    "Powered by {{ modelName }}",
    "{%- if not productFeatures.DisableMultimodalGeneration %}x{%- endif %}",
    "{% if '\u4e2d\u6587' in ResponseLanguage %}a{% else %}b{% endif %}",
    '"{{ dataFolderName }}" folder',
    "{{ productName }} calls present_files",
    "{% for i in range(3) %}{{ i }}{% endfor %}",
    "{% set local = 1 %}{{ local }}",
    "{{ deep.a.b.c }} {{ x|upper }}",
  ].join("\n");

  it("finds names used only inside a control block, which a {{ }} regex cannot", () => {
    const vars = collectTemplateVariables(SRC, "jinja");
    // ResponseLanguage appears solely in {% if %} — this is the variable whose absence
    // once aborted the whole render.
    expect(vars).toContain("ResponseLanguage");
    expect(vars).toContain("productFeatures.DisableMultimodalGeneration");
  });

  it("returns full dotted paths, not just the root", () => {
    expect(collectTemplateVariables(SRC, "jinja")).toContain("deep.a.b.c");
  });

  it("omits built-ins so a blank value cannot shadow them", () => {
    // Operator variables override built-ins; suggesting modelName would let an empty
    // auto-added line render the model name as "".
    const vars = collectTemplateVariables(SRC, "jinja");
    for (const name of BUILT_IN_VAR_NAMES) expect(vars).not.toContain(name);
  });

  it("omits nunjucks globals and filter names", () => {
    const vars = collectTemplateVariables(SRC, "jinja");
    expect(vars).not.toContain("range");
    expect(vars).not.toContain("upper");
  });

  it("omits {% for %} and {% set %} locals in jinja mode", () => {
    const vars = collectTemplateVariables(SRC, "jinja");
    expect(vars).not.toContain("i");
    expect(vars).not.toContain("local");
  });

  it("lists exactly the {{ }} tokens in substitute mode", () => {
    // {% %} passes through untouched there, so a control-block-only name would never
    // be substituted and must not be offered.
    const vars = collectTemplateVariables(SRC, "substitute");
    expect(vars).toContain("productName");
    expect(vars).toContain("dataFolderName");
    expect(vars).not.toContain("ResponseLanguage");
    expect(vars).not.toContain("productFeatures.DisableMultimodalGeneration");
  });

  it("stays silent on an unparseable template rather than guessing", () => {
    expect(collectTemplateVariables("{% if %}", "jinja")).toEqual([]);
  });

  it("returns nothing for empty input", () => {
    expect(collectTemplateVariables("", "jinja")).toEqual([]);
    expect(collectTemplateVariables(undefined, "jinja")).toEqual([]);
  });
});
