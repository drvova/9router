import { beforeEach, describe, expect, it } from "vitest";
import {
  clearClientHeaderCaptures,
  getClientHeaderCapture,
  initCaptureStore,
  listClientHeaderCaptures,
  recordClientHeaders,
} from "../../src/lib/headerCapture.js";

beforeEach(() => {
  initCaptureStore();          // no storage: pure in-memory unless a test wires it
  clearClientHeaderCaptures();
});

describe("recordClientHeaders", () => {
  it("never keeps a credential or a transport header", async () => {
    recordClientHeaders("p1", {
      authorization: "Bearer secret", "x-api-key": "k", cookie: "c=1",
      host: "localhost", "content-type": "application/json", "content-length": "12",
      "x-forwarded-port": "20128", "x-forwarded-for": "1.2.3.4",
      "user-agent": "curl/8", "sec-fetch-mode": "cors",
      "x-agent-intent": "craft",
    });
    const capture = await getClientHeaderCapture("p1");
    expect(Object.keys(capture.headers)).toEqual(["x-agent-intent"]);
  });

  it("records nothing when every header was skippable", async () => {
    expect(recordClientHeaders("p1", { authorization: "Bearer x", host: "h" })).toBe(0);
    expect(await getClientHeaderCapture("p1")).toBeNull();
  });

  it("refreshes a repeat from the same client instead of filling the ring", async () => {
    // Distinct clients differ by which headers they send; values change every request.
    for (let i = 0; i < 20; i++) recordClientHeaders("p1", { "x-request-id": `id-${i}` });
    expect(listClientHeaderCaptures()).toHaveLength(1);
    const capture = await getClientHeaderCapture("p1");
    expect(capture.headers["x-request-id"]).toBe("id-19");
  });

  it("keeps distinct clients separately and caps the ring", () => {
    for (let i = 0; i < 15; i++) recordClientHeaders("p1", { [`x-client-${i}`]: "v" });
    expect(listClientHeaderCaptures()).toHaveLength(10);
  });
});

describe("getClientHeaderCapture", () => {
  it("offers a node with no traffic the most recent capture from anywhere", async () => {
    // The defect this replaced: keyed per provider, a freshly created node had nothing
    // to offer even though the router had seen plenty of requests.
    recordClientHeaders("other-provider", { "x-agent-intent": "craft" });
    const capture = await getClientHeaderCapture("brand-new-node");
    expect(capture).not.toBeNull();
    expect(capture.exact).toBe(false);
    expect(capture.provider).toBe("other-provider");
    expect(capture.headers["x-agent-intent"]).toBe("craft");
  });

  it("prefers a capture recorded against the provider being configured", async () => {
    recordClientHeaders("other", { "x-from": "other" });
    recordClientHeaders("mine", { "x-from": "mine", "x-extra": "1" });
    recordClientHeaders("other2", { "x-from": "other2", "x-more": "2" });
    const capture = await getClientHeaderCapture("mine");
    expect(capture.exact).toBe(true);
    expect(capture.headers["x-from"]).toBe("mine");
  });

  it("returns null only when nothing has ever been seen", async () => {
    expect(await getClientHeaderCapture("anything")).toBeNull();
  });
});

describe("system prompt capture", () => {
  const promptFor = async (provider, body) => {
    recordClientHeaders(provider, { "x-a": "1" }, body);
    return (await getClientHeaderCapture(provider)).systemPrompt;
  };

  it("reads the system message from an OpenAI chat body", async () => {
    const prompt = await promptFor("p1", {
      messages: [{ role: "system", content: "You are {{ productName }}." }, { role: "user", content: "hi" }],
    });
    expect(prompt).toBe("You are {{ productName }}.");
  });

  it("reads Claude's system field as a string", async () => {
    expect(await promptFor("c1", { system: "plain string" })).toBe("plain string");
  });

  it("reads Claude's system field as blocks", async () => {
    const prompt = await promptFor("c2", {
      system: [{ type: "text", text: "block one" }, { type: "text", text: "block two" }],
    });
    expect(prompt).toBe("block one\n\nblock two");
  });

  it("reads the Responses API instructions field", async () => {
    expect(await promptFor("r1", { instructions: "from instructions", input: [] })).toBe("from instructions");
  });

  it("records a request carrying only a credential and a prompt", async () => {
    // Otherwise the header filter would reject it for having nothing interesting to keep.
    expect(recordClientHeaders("p2", { authorization: "Bearer x" }, {
      messages: [{ role: "system", content: "kept" }],
    })).toBe(0);
    expect((await getClientHeaderCapture("p2")).systemPrompt).toBe("kept");
  });

  it("is null when the request carried no system message", async () => {
    expect(await promptFor("p3", { messages: [{ role: "user", content: "hi" }] })).toBeNull();
  });
});

describe("persistence", () => {
  it("survives a restart when storage is wired", async () => {
    // The defect: the ring lived only in memory, so any restart emptied it and the button
    // reported nothing even though the router had already served requests.
    let disk = null;
    initCaptureStore({
      load: async () => disk,
      save: async (entries) => { disk = JSON.parse(JSON.stringify(entries)); },
    });
    clearClientHeaderCaptures();

    recordClientHeaders("p1", { "x-agent-intent": "craft" }, {
      messages: [{ role: "system", content: "kept prompt" }],
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(disk).toHaveLength(1);

    // restart: memory gone, storage intact
    const onDisk = JSON.parse(JSON.stringify(disk));
    initCaptureStore({ load: async () => onDisk, save: async () => {} });
    clearClientHeaderCaptures();
    initCaptureStore({ load: async () => onDisk, save: async () => {} });

    const capture = await getClientHeaderCapture("p1");
    expect(capture).not.toBeNull();
    expect(capture.headers["x-agent-intent"]).toBe("craft");
    expect(capture.systemPrompt).toBe("kept prompt");
  });

  it("writes only when a client not seen before appears", () => {
    // Identifier values are templated on the way out, so a stale uuid costs nothing and a
    // write per request would be pure overhead on the hot path.
    let writes = 0;
    initCaptureStore({ load: async () => null, save: async () => { writes += 1; } });
    clearClientHeaderCaptures();
    writes = 0;

    for (let i = 0; i < 5; i++) recordClientHeaders("p1", { "x-same": `value-${i}` });
    expect(writes).toBe(1);

    recordClientHeaders("p1", { "x-different": "v" });
    expect(writes).toBe(2);
  });

  it("runs purely in memory when storage is not wired", async () => {
    recordClientHeaders("p1", { "x-a": "1" });
    expect((await getClientHeaderCapture("p1")).headers["x-a"]).toBe("1");
  });

  it("caps a captured prompt rather than growing storage without bound", async () => {
    recordClientHeaders("p1", { "x-a": "1" }, {
      messages: [{ role: "system", content: "x".repeat(50000) }],
    });
    expect((await getClientHeaderCapture("p1")).systemPrompt.length).toBe(32000);
  });
});
