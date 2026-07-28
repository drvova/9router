import { describe, expect, it } from "vitest";
import { injectSystemPrompt } from "../../open-sse/rtk/systemInject.js";
import { FORMATS } from "../../open-sse/translator/formats.js";

// The account-fallback loop in src/sse/handlers/chat.js hands each attempt a
// shallow `{ ...body }`, and translateRequest returns that same object when
// source === target. These tests pin the copy-on-write contract that keeps one
// provider's system prompt out of the next provider's attempt.
const shallowAttempt = (body, model) => ({ ...body, model });

describe("injectSystemPrompt isolation across fallback attempts", () => {
  it("does not leak an OpenAI-format prompt into the next attempt", () => {
    const clientBody = { model: "combo", messages: [{ role: "user", content: "hi" }] };

    const a = injectSystemPrompt(shallowAttempt(clientBody, "a/x"), FORMATS.OPENAI, "PROMPT-A");
    const b = injectSystemPrompt(shallowAttempt(clientBody, "b/y"), FORMATS.OPENAI, "PROMPT-B");

    expect(a.messages[0]).toEqual({ role: "system", content: "PROMPT-A" });
    expect(b.messages[0]).toEqual({ role: "system", content: "PROMPT-B" });
    expect(JSON.stringify(b)).not.toContain("PROMPT-A");
    // Client body untouched: still one user message, no system role.
    expect(clientBody.messages).toHaveLength(1);
    expect(clientBody.messages[0].role).toBe("user");
  });

  it("does not compound when appending to an existing system message", () => {
    const clientBody = {
      messages: [{ role: "system", content: "BASE" }, { role: "user", content: "hi" }],
    };

    const a = injectSystemPrompt(shallowAttempt(clientBody, "a/x"), FORMATS.OPENAI, "PROMPT-A");
    const b = injectSystemPrompt(shallowAttempt(clientBody, "b/y"), FORMATS.OPENAI, "PROMPT-B");

    expect(a.messages[0].content).toBe("BASE\n\nPROMPT-A");
    expect(b.messages[0].content).toBe("BASE\n\nPROMPT-B");
    expect(clientBody.messages[0].content).toBe("BASE");
  });

  it("does not leak a Claude-format prompt, and keeps it inside the cached prefix", () => {
    const clientBody = {
      system: [{ type: "text", text: "BASE", cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: "hi" }],
    };

    const a = injectSystemPrompt(shallowAttempt(clientBody, "a/x"), FORMATS.CLAUDE, "PROMPT-A");
    const b = injectSystemPrompt(shallowAttempt(clientBody, "b/y"), FORMATS.CLAUDE, "PROMPT-B");

    // Inserted before the last cache_control block so the cached prefix still covers it.
    expect(a.system.map((x) => x.text)).toEqual(["PROMPT-A", "BASE"]);
    expect(b.system.map((x) => x.text)).toEqual(["PROMPT-B", "BASE"]);
    expect(clientBody.system).toHaveLength(1);
  });

  it("does not leak a Gemini-format prompt through the antigravity request envelope", () => {
    const clientBody = { request: { systemInstruction: { parts: [{ text: "BASE" }] } } };

    const a = injectSystemPrompt(shallowAttempt(clientBody, "a/x"), FORMATS.ANTIGRAVITY, "PROMPT-A");
    const b = injectSystemPrompt(shallowAttempt(clientBody, "b/y"), FORMATS.ANTIGRAVITY, "PROMPT-B");

    expect(a.request.systemInstruction.parts.map((p) => p.text)).toEqual(["BASE", "PROMPT-A"]);
    expect(b.request.systemInstruction.parts.map((p) => p.text)).toEqual(["BASE", "PROMPT-B"]);
    expect(clientBody.request.systemInstruction.parts).toHaveLength(1);
  });

  it("does not leak a Responses-format prompt via instructions", () => {
    const clientBody = { instructions: "BASE", input: [{ role: "user", content: "hi" }] };

    const a = injectSystemPrompt(shallowAttempt(clientBody, "a/x"), FORMATS.OPENAI_RESPONSES, "PROMPT-A");
    const b = injectSystemPrompt(shallowAttempt(clientBody, "b/y"), FORMATS.OPENAI_RESPONSES, "PROMPT-B");

    expect(a.instructions).toBe("BASE\n\nPROMPT-A");
    expect(b.instructions).toBe("BASE\n\nPROMPT-B");
    expect(clientBody.instructions).toBe("BASE");
  });

  it("returns the body untouched when there is no prompt", () => {
    const body = { messages: [{ role: "user", content: "hi" }] };
    expect(injectSystemPrompt(body, FORMATS.OPENAI, "")).toBe(body);
    expect(injectSystemPrompt(body, FORMATS.OPENAI, null)).toBe(body);
  });
});
