import { describe, test, expect } from "vitest";
import { resolveOpenAICompatibleType } from "open-sse/providers/shared.js";
import { getTargetFormat } from "open-sse/services/provider.js";
import { DefaultExecutor } from "open-sse/executors/default.js";

// A node id is minted as openai-compatible-<apiType>-<uuid> and never changes, so an
// operator switching the API Type in the dashboard only moves the stored field. Routing
// has to follow the field; the id survives only as the fallback for older connections.
const CHAT_ID = "openai-compatible-chat-1111";
const RESP_ID = "openai-compatible-responses-2222";

const creds = (apiType) => ({
  providerSpecificData: { baseUrl: "https://example.test/v1", ...(apiType ? { apiType } : {}) },
});

describe("resolveOpenAICompatibleType", () => {
  test("the stored value wins over the id", () => {
    expect(resolveOpenAICompatibleType(CHAT_ID, "responses")).toBe("responses");
    expect(resolveOpenAICompatibleType(RESP_ID, "chat")).toBe("chat");
  });

  test("falls back to the id when nothing is stored", () => {
    expect(resolveOpenAICompatibleType(CHAT_ID, undefined)).toBe("chat");
    expect(resolveOpenAICompatibleType(RESP_ID, undefined)).toBe("responses");
  });

  test("a junk stored value falls back rather than routing somewhere invented", () => {
    for (const junk of ["", null, "RESPONSES", "completions", 1, {}]) {
      expect(resolveOpenAICompatibleType(RESP_ID, junk)).toBe("responses");
      expect(resolveOpenAICompatibleType(CHAT_ID, junk)).toBe("chat");
    }
  });
});

describe("the URL follows the stored apiType", () => {
  test("a chat-born node switched to responses posts to /responses", () => {
    const url = new DefaultExecutor(CHAT_ID, {}).buildUrl("m", false, 0, creds("responses"));
    expect(url).toBe("https://example.test/v1/responses");
  });

  test("a responses-born node switched to chat posts to /chat/completions", () => {
    const url = new DefaultExecutor(RESP_ID, {}).buildUrl("m", false, 0, creds("chat"));
    expect(url).toBe("https://example.test/v1/chat/completions");
  });

  test("with nothing stored the id still decides, so existing nodes are unaffected", () => {
    expect(new DefaultExecutor(CHAT_ID, {}).buildUrl("m", false, 0, creds()))
      .toBe("https://example.test/v1/chat/completions");
    expect(new DefaultExecutor(RESP_ID, {}).buildUrl("m", false, 0, creds()))
      .toBe("https://example.test/v1/responses");
  });
});

describe("the wire format follows the same answer as the URL", () => {
  test("switching to responses selects the responses format", () => {
    expect(getTargetFormat(CHAT_ID, "responses")).toBe("openai-responses");
  });

  test("switching to chat selects the chat format", () => {
    expect(getTargetFormat(RESP_ID, "chat")).toBe("openai");
  });

  // The failure this guards against is worse than the original bug: a URL that moved to
  // /responses while the body stayed chat-shaped would be a malformed request rather than
  // a setting that quietly did nothing.
  test("URL and format never disagree, across every combination", () => {
    for (const id of [CHAT_ID, RESP_ID]) {
      for (const stored of [undefined, "chat", "responses"]) {
        const url = new DefaultExecutor(id, {}).buildUrl("m", false, 0, creds(stored));
        const format = getTargetFormat(id, stored);
        expect(url.endsWith("/responses")).toBe(format === "openai-responses");
      }
    }
  });
});
