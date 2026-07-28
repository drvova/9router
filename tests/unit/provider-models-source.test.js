import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const connection = {
  id: "conn-1",
  provider: "qwen",
  accessToken: "stale-token",
  refreshToken: "refresh-token",
  providerSpecificData: {},
};
const refreshTokenByProvider = vi.fn();
const updateProviderCredentials = vi.fn();

const resolveGrokCliModels = vi.fn();

vi.mock("@/models", () => ({ getProviderConnectionById: vi.fn(async () => connection) }));
vi.mock("open-sse/services/grokCliModels.js", () => ({
  resolveGrokCliModels: (...args) => resolveGrokCliModels(...args),
}));
vi.mock("@/sse/services/tokenRefresh", () => ({
  refreshGoogleToken: vi.fn(),
  refreshCodexToken: vi.fn(),
  refreshTokenByProvider: (...args) => refreshTokenByProvider(...args),
  updateProviderCredentials: (...args) => updateProviderCredentials(...args),
}));

import { GET, __test__ } from "@/app/api/providers/[id]/models/route.js";
import { PROVIDERS } from "open-sse/config/providers.js";
import { PROVIDER_MEDIA } from "open-sse/providers/index.js";

const { deriveModelsUrl, buildRegistryModelsConfig } = __test__;

describe("provider /models source resolution", () => {
  it("derives from the chat baseUrl for OpenAI-format providers", () => {
    expect(deriveModelsUrl({ baseUrl: "https://api.deepseek.com/v1/chat/completions" }))
      .toBe("https://api.deepseek.com/v1/models");
    expect(deriveModelsUrl({ baseUrl: "https://api.x.ai/v1" }))
      .toBe("https://api.x.ai/v1/models");
  });

  it("derives from the /messages baseUrl for Anthropic-format providers", () => {
    expect(deriveModelsUrl({ baseUrl: "https://api.z.ai/api/anthropic/v1/messages" }))
      .toBe("https://api.z.ai/api/anthropic/v1/models");
  });

  it("prefers an explicit validateUrl over derivation", () => {
    expect(deriveModelsUrl({ baseUrl: "https://x/v1/chat/completions", validateUrl: "https://x/list" }))
      .toBe("https://x/list");
  });

  it("lets a connection baseUrl override the registry endpoint", () => {
    const transport = { baseUrl: "https://api.openai.com/v1/chat/completions", validateUrl: "https://api.openai.com/v1/models" };
    const connection = { providerSpecificData: { baseUrl: "https://gateway.internal/v1/" } };
    expect(deriveModelsUrl(transport, connection)).toBe("https://gateway.internal/v1/models");
  });

  it("sends x-api-key plus anthropic-version for claude-format providers", () => {
    const config = buildRegistryModelsConfig("glm");
    expect(config.url).toBe("https://api.z.ai/api/anthropic/v1/models");
    expect(config.authHeader).toBe("x-api-key");
    expect(config.alsoBearer).toBe(true);
    expect(config.headers["anthropic-version"]).toBe("2023-06-01");
  });

  it("uses the registry modelsFetcher URL and its filter type", () => {
    // modelsFetcher is a top-level registry field routed into PROVIDER_MEDIA, not transport.
    expect(PROVIDER_MEDIA.openrouter.modelsFetcher.url).toBe("https://openrouter.ai/api/v1/models");
    const config = buildRegistryModelsConfig("openrouter");
    expect(config.url).toBe("https://openrouter.ai/api/v1/models");
    // openrouter-free filter keeps only zero-priced >=200k models
    expect(config.parseResponse({ data: [
      { id: "free/a", name: "A", pricing: { prompt: "0", completion: "0" }, context_length: 262144 },
      { id: "paid/b", name: "B", pricing: { prompt: "1", completion: "1" }, context_length: 262144 },
    ] })).toEqual([{ id: "free/a", name: "A", contextLength: 262144 }]);
  });

  it("declines bespoke transports that have no REST model list", () => {
    expect(buildRegistryModelsConfig("kiro")).toBeNull();
    expect(buildRegistryModelsConfig("grok-web")).toBeNull();
  });

  it("resolves a listing source for the large majority of registry providers", () => {
    const ids = Object.keys(PROVIDERS);
    const resolved = ids.filter((id) => buildRegistryModelsConfig(id));
    expect(resolved.length).toBeGreaterThanOrEqual(129);
    expect(resolved.length / ids.length).toBeGreaterThan(0.85);
  });
});

describe("expired OAuth token on model listing", () => {
  let fetchMock;

  beforeEach(() => {
    refreshTokenByProvider.mockReset();
    updateProviderCredentials.mockReset();
    connection.accessToken = "stale-token";
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const respond = (status, body) => ({
    ok: status < 400,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });

  it("refreshes the token, persists it, and retries once", async () => {
    fetchMock
      .mockResolvedValueOnce(respond(403, { error: "The OAuth2 access token could not be validated." }))
      .mockResolvedValueOnce(respond(200, { data: [{ id: "qwen3-coder-plus" }] }));
    refreshTokenByProvider.mockResolvedValue({ accessToken: "fresh-token", expiresIn: 3600 });

    const res = await GET(new Request("http://localhost/api/providers/conn-1/models"), {
      params: Promise.resolve({ id: "conn-1" }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ provider: "qwen", models: [{ id: "qwen3-coder-plus" }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer stale-token");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer fresh-token");
    expect(updateProviderCredentials).toHaveBeenCalledWith("conn-1", {
      accessToken: "fresh-token",
      refreshToken: "refresh-token",
      expiresIn: 3600,
    });
  });

  it("surfaces the upstream status when the refresh yields nothing", async () => {
    fetchMock.mockResolvedValue(respond(403, { error: "bad-credentials" }));
    refreshTokenByProvider.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/providers/conn-1/models"), {
      params: Promise.resolve({ id: "conn-1" }),
    });

    expect(res.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("xAI credential routing", () => {
  let fetchMock;

  beforeEach(() => {
    resolveGrokCliModels.mockReset();
    fetchMock = vi.fn(async () => ({
      ok: true, status: 200,
      json: async () => ({ data: [{ id: "grok-4" }] }),
      text: async () => "",
    }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    connection.provider = "qwen";
    delete connection.apiKey;
    connection.accessToken = "stale-token";
  });

  const get = () => GET(new Request("http://localhost/api/providers/conn-1/models"), {
    params: Promise.resolve({ id: "conn-1" }),
  });

  it("lists a console API key against api.x.ai", async () => {
    connection.provider = "xai";
    connection.apiKey = "xai-console-key";

    const res = await get();

    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.x.ai/v1/models");
    expect(resolveGrokCliModels).not.toHaveBeenCalled();
  });

  it("lists a device-code OAuth token against the Grok CLI proxy, not api.x.ai", async () => {
    connection.provider = "xai";
    connection.accessToken = "device-code-token";
    resolveGrokCliModels.mockResolvedValue({ models: [{ id: "grok-4.5", name: "Grok 4.5" }] });

    const res = await get();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ models: [{ id: "grok-4.5" }] });
    expect(resolveGrokCliModels).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls.map((c) => c[0])).not.toContain("https://api.x.ai/v1/models");
  });
});
