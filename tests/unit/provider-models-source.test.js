import { describe, it, expect } from "vitest";
import { __test__ } from "@/app/api/providers/[id]/models/route.js";
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
