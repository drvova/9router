import { describe, expect, it } from "vitest";
import { wrapControlBlocks } from "../../src/shared/utils/headerTemplate.js";

describe("wrapControlBlocks", () => {
  it("protects every control block so rendering cannot consume it", () => {
    const out = wrapControlBlocks("A{%- if x %}B{%- endif %}C");
    expect(out).toBe("A{% raw %}{%- if x %}{% endraw %}B{% raw %}{%- endif %}{% endraw %}C");
  });

  it("survives a percent sign inside a tag", () => {
    // A scan that stops at the first % would wrap only half the block, leaving the
    // opening tag to evaluate and the closing tag literal.
    const out = wrapControlBlocks('A{% if plan == "50%" %}B{% endif %}C');
    expect(out).toContain('{% raw %}{% if plan == "50%" %}{% endraw %}');
    expect(out).toContain("{% raw %}{% endif %}{% endraw %}");
  });

  it("leaves {{ vars }} alone so they still resolve", () => {
    expect(wrapControlBlocks("{{ modelName }} stays")).toBe("{{ modelName }} stays");
  });

  it("refuses to nest when the prompt already protects its blocks", () => {
    // nunjucks does not support nested raw; double-wrapping would break the inner block.
    const already = "{% raw %}{% if x %}{% endraw %}";
    expect(wrapControlBlocks(already)).toBe(already);
  });

  it("is reversible, so an applied prompt can be compared to its source", () => {
    const src = "A{%- if x %}B{%- endif %}C";
    const unwrapped = wrapControlBlocks(src).replace(/\{% raw %\}([\s\S]*?)\{% endraw %\}/g, "$1");
    expect(unwrapped).toBe(src);
  });
});
