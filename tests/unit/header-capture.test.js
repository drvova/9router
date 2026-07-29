import { beforeEach, describe, expect, it } from "vitest";
import {
  clearClientHeaderCaptures,
  getClientHeaderCapture,
  listClientHeaderCaptures,
  recordClientHeaders,
} from "../../src/lib/headerCapture.js";

beforeEach(() => clearClientHeaderCaptures());

describe("recordClientHeaders", () => {
  it("never keeps a credential or a transport header", () => {
    recordClientHeaders("p1", {
      authorization: "Bearer secret", "x-api-key": "k", cookie: "c=1",
      host: "localhost", "content-type": "application/json", "content-length": "12",
      "x-forwarded-port": "20128", "x-forwarded-for": "1.2.3.4",
      "user-agent": "curl/8", "sec-fetch-mode": "cors",
      "x-agent-intent": "craft",
    });
    const { headers } = getClientHeaderCapture("p1");
    expect(Object.keys(headers)).toEqual(["x-agent-intent"]);
  });

  it("records nothing when every header was skippable", () => {
    expect(recordClientHeaders("p1", { authorization: "Bearer x", host: "h" })).toBe(0);
    expect(getClientHeaderCapture("p1")).toBeNull();
  });

  it("refreshes a repeat from the same client instead of filling the ring", () => {
    // Distinct clients differ by which headers they send; values change every request.
    for (let i = 0; i < 20; i++) recordClientHeaders("p1", { "x-request-id": `id-${i}` });
    expect(listClientHeaderCaptures()).toHaveLength(1);
    expect(getClientHeaderCapture("p1").headers["x-request-id"]).toBe("id-19");
  });

  it("keeps distinct clients separately and caps the ring", () => {
    for (let i = 0; i < 15; i++) recordClientHeaders("p1", { [`x-client-${i}`]: "v" });
    expect(listClientHeaderCaptures()).toHaveLength(10);
  });
});

describe("getClientHeaderCapture", () => {
  it("offers a node with no traffic the most recent capture from anywhere", () => {
    // The defect this replaced: keyed per provider, a freshly created node had nothing
    // to offer even though the router had seen plenty of requests.
    recordClientHeaders("other-provider", { "x-agent-intent": "craft" });
    const capture = getClientHeaderCapture("brand-new-node");
    expect(capture).not.toBeNull();
    expect(capture.exact).toBe(false);
    expect(capture.provider).toBe("other-provider");
    expect(capture.headers["x-agent-intent"]).toBe("craft");
  });

  it("prefers a capture recorded against the provider being configured", () => {
    recordClientHeaders("other", { "x-from": "other" });
    recordClientHeaders("mine", { "x-from": "mine", "x-extra": "1" });
    recordClientHeaders("other2", { "x-from": "other2", "x-more": "2" });
    const capture = getClientHeaderCapture("mine");
    expect(capture.exact).toBe(true);
    expect(capture.headers["x-from"]).toBe("mine");
  });

  it("returns null only when nothing has ever been seen", () => {
    expect(getClientHeaderCapture("anything")).toBeNull();
  });
});

describe("system prompt capture", () => {
  it("reads the system message from an OpenAI chat body", () => {
    recordClientHeaders("p1", { "x-a": "1" }, {
      messages: [{ role: "system", content: "You are {{ productName }}." }, { role: "user", content: "hi" }],
    });
    expect(getClientHeaderCapture("p1").systemPrompt).toBe("You are {{ productName }}.");
  });

  it("reads Claude's system field, string or blocks", () => {
    recordClientHeaders("c1", { "x-a": "1" }, { system: "plain string" });
    expect(getClientHeaderCapture("c1").systemPrompt).toBe("plain string");
    recordClientHeaders("c2", { "x-b": "1" }, { system: [{ type: "text", text: "block one" }, { type: "text", text: "block two" }] });
    expect(getClientHeaderCapture("c2").systemPrompt).toBe("block one\n\nblock two");
  });

  it("reads the Responses API instructions field", () => {
    recordClientHeaders("r1", { "x-a": "1" }, { instructions: "from instructions", input: [] });
    expect(getClientHeaderCapture("r1").systemPrompt).toBe("from instructions");
  });

  it("records a request that carries only a system prompt and no interesting headers", () => {
    // Otherwise a client sending nothing but a credential plus a prompt would be dropped.
    expect(recordClientHeaders("p2", { authorization: "Bearer x" }, { messages: [{ role: "system", content: "kept" }] })).toBe(0);
    expect(getClientHeaderCapture("p2").systemPrompt).toBe("kept");
  });

  it("is null when the request carried no system message", () => {
    recordClientHeaders("p3", { "x-a": "1" }, { messages: [{ role: "user", content: "hi" }] });
    expect(getClientHeaderCapture("p3").systemPrompt).toBeNull();
  });
});
