import { describe, expect, it } from "vitest";
import { formatHeaderLines, parseHeaderLines } from "../../src/shared/utils/index.js";

describe("parseHeaderLines", () => {
  it("parses Name: Value lines, skipping blanks and comments", () => {
    const { headers, error } = parseHeaderLines(
      "User-Agent: WorkBuddy/1.2.3\n\n# comment\nX-Client-Name: workbuddy\n"
    );
    expect(error).toBeUndefined();
    expect(headers).toEqual({ "User-Agent": "WorkBuddy/1.2.3", "X-Client-Name": "workbuddy" });
  });

  it("keeps colons inside the value", () => {
    expect(parseHeaderLines("Referer: https://example.com/x").headers)
      .toEqual({ Referer: "https://example.com/x" });
  });

  it("returns empty headers for blank input", () => {
    expect(parseHeaderLines("").headers).toEqual({});
    expect(parseHeaderLines(undefined).headers).toEqual({});
  });

  it("rejects a line without a separator", () => {
    expect(parseHeaderLines("UserAgent WorkBuddy").error).toMatch(/Invalid header line/);
  });

  it("rejects an empty or non-token header name", () => {
    expect(parseHeaderLines(": value").error).toMatch(/Invalid header line/);
    expect(parseHeaderLines("Bad Name: value").error).toMatch(/Invalid header name/);
  });

  it("rejects control characters in the value (header injection)", () => {
    expect(parseHeaderLines("X-A: bad\rX-Injected: 1").error).toMatch(/Invalid characters/);
  });
});

describe("formatHeaderLines", () => {
  it("round-trips a parsed header map", () => {
    const text = "User-Agent: WorkBuddy/1.2.3\nX-Client-Name: workbuddy";
    expect(formatHeaderLines(parseHeaderLines(text).headers)).toBe(text);
  });

  it("renders empty for missing headers", () => {
    expect(formatHeaderLines(undefined)).toBe("");
  });
});
