import { describe, expect, it } from "vitest";
import { formatKeyValueLines, parseKeyValueLines } from "../../src/shared/utils/index.js";

describe("parseKeyValueLines", () => {
  it("parses Name: Value lines, skipping blanks and comments", () => {
    const { entries, error } = parseKeyValueLines(
      "User-Agent: WorkBuddy/1.2.3\n\n# comment\nX-Client-Name: workbuddy\n"
    );
    expect(error).toBeUndefined();
    expect(entries).toEqual({ "User-Agent": "WorkBuddy/1.2.3", "X-Client-Name": "workbuddy" });
  });

  it("accepts dotted names for template variables", () => {
    expect(parseKeyValueLines("productFeatures.DisableMultimodalGeneration: false").entries)
      .toEqual({ "productFeatures.DisableMultimodalGeneration": "false" });
  });

  it("keeps colons inside the value", () => {
    expect(parseKeyValueLines("Referer: https://example.com/x").entries)
      .toEqual({ Referer: "https://example.com/x" });
  });

  it("returns empty headers for blank input", () => {
    expect(parseKeyValueLines("").entries).toEqual({});
    expect(parseKeyValueLines(undefined).entries).toEqual({});
  });

  it("rejects a line without a separator", () => {
    expect(parseKeyValueLines("UserAgent WorkBuddy").error).toMatch(/Invalid line/);
  });

  it("rejects an empty or non-token header name", () => {
    expect(parseKeyValueLines(": value").error).toMatch(/Invalid line/);
    expect(parseKeyValueLines("Bad Name: value").error).toMatch(/Invalid name/);
  });

  it("rejects control characters in the value (header injection)", () => {
    expect(parseKeyValueLines("X-A: bad\rX-Injected: 1").error).toMatch(/Invalid characters/);
  });
});

describe("formatKeyValueLines", () => {
  it("round-trips a parsed header map", () => {
    const text = "User-Agent: WorkBuddy/1.2.3\nX-Client-Name: workbuddy";
    expect(formatKeyValueLines(parseKeyValueLines(text).entries)).toBe(text);
  });

  it("renders empty for missing headers", () => {
    expect(formatKeyValueLines(undefined)).toBe("");
  });
});
