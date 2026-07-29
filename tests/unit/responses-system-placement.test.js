import { describe, test, expect } from "vitest";
import { openaiToOpenAIResponsesRequest } from "open-sse/translator/request/openai-responses.js";

const chat = (system = "SYS") => ({
  model: "m",
  messages: [
    { role: "system", content: system },
    { role: "user", content: "hi" },
  ],
});

// Only an operator-configured compatible node carries apiType. Registry-backed Responses
// providers (codex, grok-cli, perplexity-agent) never do.
const compatibleNode = { providerSpecificData: { baseUrl: "https://x.test/v1", apiType: "responses" } };
const registryProvider = { accessToken: "tok" };

describe("registry Responses providers keep instructions", () => {
  test("codex-shaped credentials still get the prompt in instructions", () => {
    const out = openaiToOpenAIResponsesRequest("m", chat(), true, registryProvider);
    expect(out.instructions).toBe("SYS");
    expect(out.input.some((i) => i.role === "system")).toBe(false);
  });

  // The Codex executor injects a stock prompt when instructions is empty, so emptying the
  // field would silently replace the operator's prompt rather than relocate it.
  test("no credentials at all behaves the same, so nothing regresses by default", () => {
    const out = openaiToOpenAIResponsesRequest("m", chat(), true, null);
    expect(out.instructions).toBe("SYS");
  });

  test("a compatible node left on chat is untouched", () => {
    const creds = { providerSpecificData: { baseUrl: "https://x.test/v1", apiType: "chat" } };
    expect(openaiToOpenAIResponsesRequest("m", chat(), true, creds).instructions).toBe("SYS");
  });
});

describe("a compatible node on responses carries the prompt in input[]", () => {
  test("the prompt becomes a system item and instructions is not set", () => {
    const out = openaiToOpenAIResponsesRequest("m", chat(), true, compatibleNode);
    expect(out.instructions).toBeUndefined();
    expect(out.input[0]).toEqual({ role: "system", content: [{ type: "input_text", text: "SYS" }] });
  });

  test("the system item stays ahead of the user turn", () => {
    const out = openaiToOpenAIResponsesRequest("m", chat(), true, compatibleNode);
    expect(out.input.map((i) => i.role)).toEqual(["system", "user"]);
  });

  test("a developer-role prompt keeps its role rather than being rewritten", () => {
    const body = { model: "m", messages: [{ role: "developer", content: "D" }, { role: "user", content: "hi" }] };
    const out = openaiToOpenAIResponsesRequest("m", body, true, compatibleNode);
    expect(out.input[0].role).toBe("developer");
    expect(out.instructions).toBeUndefined();
  });

  // With no system message the translator sets instructions to "" on purpose, as the signal
  // the Codex executor watches for to inject its default. That contract is left intact, and
  // an empty instructions alongside a prompt in input[] measured fine against the upstream
  // that prompted this change.
  test("no system message injects no item and leaves the empty-instructions signal alone", () => {
    const body = { model: "m", messages: [{ role: "user", content: "hi" }] };
    const out = openaiToOpenAIResponsesRequest("m", body, true, compatibleNode);
    expect(out.instructions).toBe("");
    expect(out.input.map((i) => i.role)).toEqual(["user"]);
  });

  // The upstream that prompted this rejects a request carrying the prompt in both places.
  test("the prompt is emitted exactly once, never in both places", () => {
    const out = openaiToOpenAIResponsesRequest("m", chat(), true, compatibleNode);
    const inInput = out.input.filter((i) => JSON.stringify(i).includes("SYS")).length;
    expect(inInput).toBe(1);
    expect("instructions" in out).toBe(false);
  });
});
