import { NextResponse } from "next/server";
import { getProviderConnectionById, getProviderNodeById } from "@/models";
import { isOpenAICompatibleProvider, isAnthropicCompatibleProvider, AI_PROVIDERS } from "@/shared/constants/providers";
import { GEMINI_CONFIG } from "@/lib/oauth/constants/oauth";
import { refreshGoogleToken, refreshCodexToken, refreshTokenByProvider, updateProviderCredentials } from "@/sse/services/tokenRefresh";
import { resolveOllamaLocalHost, PROVIDERS } from "open-sse/config/providers.js";
import { PROVIDER_MEDIA } from "open-sse/providers/index.js";
import { getModelsByProviderId } from "open-sse/config/providerModels.js";
import { resolveKiroModels } from "open-sse/services/kiroModels.js";
import { resolveKimchiModels } from "open-sse/services/kimchiModels.js";
import { resolveQoderModels } from "open-sse/services/qoderModels.js";
import { resolveGrokCliModels } from "open-sse/services/grokCliModels.js";
import { resolveConnectionProxyConfig } from "@/lib/network/connectionProxy";
import { resolveCursorModels } from "open-sse/services/cursorModels.js";
import { FILTERS as MODEL_FETCHER_FILTERS } from "@/app/api/providers/suggested-models/filters.js";

const GEMINI_CLI_MODELS_URL = "https://cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels";

// The /codex/models endpoint gates each entry by minimal_client_version against this
// value, and codex CLI's own manifest (openai/codex codex-rs/models-manager/models.json)
// already requires 0.144.0 for its newest models, so a stale client_version here comes
// back 200 with those entries quietly missing instead of erroring.
const CODEX_CLIENT_VERSION = "0.144.6";
const CODEX_MODELS_URL = `https://chatgpt.com/backend-api/codex/models?client_version=${CODEX_CLIENT_VERSION}`;

// Upstream rejections carry the only actionable detail ("your api key ...f6f9 is invalid",
// "spending-limit"). Log it and forward a trimmed copy so the dashboard shows the reason
// instead of a bare status code.
const formatUpstreamError = (provider, status, errorText) => {
  console.log(`Error fetching models from ${provider}:`, errorText);
  let detail = "";
  try {
    const parsed = JSON.parse(errorText);
    const raw = parsed?.error?.message ?? parsed?.error ?? parsed?.message ?? parsed?.detail;
    detail = typeof raw === "string" ? raw : "";
  } catch {
    detail = String(errorText || "").trim();
  }
  detail = detail.slice(0, 300);
  return detail ? `Failed to fetch models (${status}): ${detail}` : `Failed to fetch models: ${status}`;
};

const parseOpenAIStyleModels = (data) => {
  if (Array.isArray(data)) return data;
  return data?.data || data?.models || data?.results || [];
};

const parseGeminiCliModels = (data) => {
  if (Array.isArray(data?.models)) {
    return data.models
      .map((item) => {
        const id = item?.id || item?.model || item?.name;
        if (!id) return null;
        return { id, name: item?.displayName || item?.name || id };
      })
      .filter(Boolean);
  }

  if (data?.models && typeof data.models === "object") {
    return Object.entries(data.models)
      .filter(([, info]) => !info?.isInternal)
      .map(([id, info]) => ({
        id,
        name: info?.displayName || info?.name || id,
      }));
  }

  return [];
};

const appendCodexReviewModels = (models) => models.flatMap((model) => {
  const id = model?.id || model?.slug || model?.model || model?.name;
  if (!id) return [];
  const name = model?.display_name || model?.displayName || model?.name || id;
  const normalized = { ...model, id, name };
  const isChatModel = (model?.type || "llm") !== "image" && !id.toLowerCase().includes("embed");
  if (!isChatModel || id.endsWith("-review")) return [normalized];
  return [
    normalized,
    {
      ...normalized,
      id: `${id}-review`,
      name: `${name} Review`,
      upstreamModelId: id,
      quotaFamily: "review",
    },
  ];
});

const parseCodexModels = (data) => appendCodexReviewModels(parseOpenAIStyleModels(data));

const createOpenAIModelsConfig = (url) => ({
  url,
  method: "GET",
  headers: { "Content-Type": "application/json" },
  authHeader: "Authorization",
  authPrefix: "Bearer ",
  parseResponse: parseOpenAIStyleModels
});

// Registry-derived model config: builds a live-fetch config from the provider's
// transport (single source of truth) without a hand-written PROVIDER_MODELS_CONFIG entry.
// URL resolution order: connection baseUrl → validateUrl → baseUrl pattern derivation → modelsFetcher.url.
// Honors non-bearer auth headers (e.g. x-api-key) and noAuth providers.
const CHAT_PATH_RE = /\/(chat\/completions|messages|responses|chat|embeddings)\/?$/;

// A connection-supplied baseUrl (self-hosted, regional, or gateway endpoint) always wins:
// the registry default would point at the wrong host.
const deriveFromConnectionBase = (base) => {
  if (!base || !base.startsWith("http")) return null;
  const trimmed = base.replace(/\/$/, "").replace(CHAT_PATH_RE, "");
  return trimmed.endsWith("/models") ? trimmed : `${trimmed}/models`;
};

const deriveModelsUrl = (transport, connection) => {
  const fromConnection = deriveFromConnectionBase(connection?.providerSpecificData?.baseUrl);
  if (fromConnection) return fromConnection;
  if (transport.validateUrl) return transport.validateUrl;
  const base = transport.baseUrl;
  if (!base || !base.startsWith("http")) return null;
  if (base.includes("/chat/completions")) return base.replace("/chat/completions", "/models");
  if (base.includes("/embeddings")) return base.replace("/embeddings", "/models");
  if (base.endsWith("/models")) return base;
  if (CHAT_PATH_RE.test(base)) return base.replace(CHAT_PATH_RE, "/models");
  if (/\/v\d+[a-z]*\/?$/.test(base)) return `${base.replace(/\/$/, "")}/models`;
  return null;
};

// Parse modelsFetcher responses. For custom types (openrouter-free, opencode-free,
// mimo-free), apply the corresponding filter from suggested-models/filters.js.
// For "openai" type or unknown, use the standard OpenAI-shaped parser.
const buildFetcherParser = (fetcherType) => {
  const filter = fetcherType ? MODEL_FETCHER_FILTERS[fetcherType] : null;
  if (!filter) return parseOpenAIStyleModels;
  return (data) => {
    const raw = Array.isArray(data) ? data : (data?.data || data?.models || data?.results || []);
    return filter(raw);
  };
};

// Formats whose upstream exposes a REST model list at `<base>/models`. Bespoke formats
// (kiro, cursor, gemini-cli, vertex, *-web, ...) resolve via PROVIDER_MODELS_CONFIG instead.
const LISTABLE_FORMATS = new Set(["openai", "openai-responses", "claude"]);

const buildRegistryModelsConfig = (providerId, connection) => {
  const transport = PROVIDERS[providerId];
  if (!transport || !LISTABLE_FORMATS.has(transport.format || "openai")) return null;

  // Registry `modelsFetcher` is a top-level entry field: providers/index.js routes it into
  // PROVIDER_MEDIA, not the transport. Prefer it over derivation — it names a curated
  // catalog URL (+ filter type) that the provider's chat baseUrl cannot be guessed into.
  const fetcher = PROVIDER_MEDIA[providerId]?.modelsFetcher;
  let url = fetcher?.url || deriveModelsUrl(transport, connection);
  let fetcherType = fetcher?.url ? fetcher.type : null;

  // A connection-supplied endpoint outranks the shared catalog URL.
  const fromConnection = deriveFromConnectionBase(connection?.providerSpecificData?.baseUrl);
  if (fromConnection) {
    url = fromConnection;
    fetcherType = null;
  }

  if (!url) return null;

  const parseResponse = buildFetcherParser(fetcherType);
  const auth = transport.auth;

  if (transport.noAuth) {
    return { url, method: "GET", headers: { "Content-Type": "application/json" }, noAuth: true, parseResponse };
  }
  // Anthropic-shaped upstreams key on x-api-key; third-party gateways often want Bearer too.
  if (transport.format === "claude") {
    return {
      url,
      method: "GET",
      headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
      authHeader: auth?.header || "x-api-key",
      authPrefix: auth?.scheme === "bearer" ? "Bearer " : "",
      alsoBearer: true,
      parseResponse,
    };
  }
  if (auth?.header && auth.header.toLowerCase() !== "authorization") {
    return {
      url,
      method: "GET",
      headers: { "Content-Type": "application/json" },
      authHeader: auth.header,
      authPrefix: auth.scheme === "bearer" ? "Bearer " : "",
      parseResponse,
    };
  }
  return { ...createOpenAIModelsConfig(url), parseResponse };
};

export const __test__ = { deriveModelsUrl, buildRegistryModelsConfig };

const resolveQwenModelsUrl = (connection) => {
  const fallback = "https://portal.qwen.ai/v1/models";
  const raw = connection?.providerSpecificData?.resourceUrl;
  if (!raw || typeof raw !== "string") return fallback;
  const value = raw.trim();
  if (!value) return fallback;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return `${value.replace(/\/$/, "")}/models`;
  }
  return `https://${value.replace(/\/$/, "")}/v1/models`;
};

const getStaticProviderModels = (providerId) =>
  getModelsByProviderId(providerId).map((model) => ({
    ...model,
    id: model.id,
    name: model.name || model.id,
  }));

// Compatible-node catalog fetch shared by connection and connection-less paths.
// The node row carries baseUrl at top level; a connection keeps it in providerSpecificData.
// Headers are only sent when a key exists — keyless endpoints get a bare request.
const fetchCompatCatalog = async (entry, { anthropic }) => {
  const baseUrl = entry.baseUrl || entry.providerSpecificData?.baseUrl;
  if (!baseUrl) {
    return { error: `No base URL configured for ${anthropic ? "Anthropic" : "OpenAI"} compatible provider`, status: 400 };
  }
  let url = baseUrl.replace(/\/$/, "");
  if (anthropic && url.endsWith("/messages")) url = url.slice(0, -9);
  url = `${url}/models`;
  const key = entry.providerSpecificData?.apiKey || entry.accessToken || entry.apiKey;
  const headers = { "Content-Type": "application/json" };
  if (anthropic) {
    headers["anthropic-version"] = "2023-06-01";
    if (key) {
      headers["x-api-key"] = key;
      headers["Authorization"] = `Bearer ${key}`;
    }
  } else if (key) {
    headers["Authorization"] = `Bearer ${key}`;
  }
  const response = await fetch(url, { method: "GET", headers });
  if (!response.ok) {
    const errorText = await response.text();
    return { error: formatUpstreamError(entry.provider || entry.id, response.status, errorText), status: response.status };
  }
  const data = await response.json();
  return { models: data.data || data.models || [], provider: entry.provider || entry.id };
};

// Generic custom resolver for OAuth providers that need refresh-on-401 + token persist.
// Receives a `fetchFn(token)` and returns parsed models or throws.
const buildOAuthResolver = ({ refreshFn, fetchFn, parseFn, errorLabel }) => async (connection) => {
  const { accessToken, refreshToken } = connection;
  if (!accessToken) {
    return { error: "No valid token found", status: 401 };
  }
  let warning;
  try {
    let response = await fetchFn(accessToken, connection);
    if (!response.ok && (response.status === 401 || response.status === 403) && refreshToken) {
      const refreshed = await refreshFn(connection);
      if (refreshed?.accessToken) {
        await updateProviderCredentials(connection.id, {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken || refreshToken,
          expiresIn: refreshed.expiresIn,
        });
        connection.accessToken = refreshed.accessToken;
        if (refreshed.refreshToken) connection.refreshToken = refreshed.refreshToken;
        response = await fetchFn(refreshed.accessToken, connection);
      }
    }
    if (response.ok) {
      const data = await response.json();
      const models = parseFn(data);
      if (models.length > 0) return { models };
    } else {
      const errorText = await response.text();
      warning = `${errorLabel}: ${response.status} ${errorText}`;
      console.log(`${errorLabel} (falling back to static):`, errorText);
    }
  } catch (error) {
    warning = `${errorLabel}: ${error.message}`;
    console.log(`${errorLabel} (falling back to static):`, error.message);
  }
  return { models: [], warning };
};

// Grok CLI proxy catalog (https://cli-chat-proxy.grok.com/v1/models). Shared by the
// `grok-cli` provider and xAI OAuth connections — both hold the same device-code token.
const resolveGrokCliCatalog = async (connection, staticFallbackId) => {
  const proxy = await resolveConnectionProxyConfig(connection.providerSpecificData || {});
  const result = await resolveGrokCliModels({
    ...connection,
    connectionId: connection.id,
  }, {
    log: console,
    proxyOptions: {
      connectionProxyEnabled: proxy.connectionProxyEnabled === true,
      connectionProxyUrl: proxy.connectionProxyUrl || "",
      connectionNoProxy: proxy.connectionNoProxy || "",
      vercelRelayUrl: proxy.vercelRelayUrl || "",
      strictProxy: proxy.strictProxy === true,
    },
    onCredentialsRefreshed: async (refreshed) => {
      await updateProviderCredentials(connection.id, {
        ...refreshed,
        existingProviderSpecificData: connection.providerSpecificData || {},
      });
    },
  });
  if (result.models.length) return result;
  return {
    models: getStaticProviderModels(staticFallbackId),
    warning: result.warning || "Grok CLI returned no live models; using static catalog.",
  };
};

const fetchOpenAIStyleCatalog = async (url, apiKey, label) => {
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) {
    const errorText = await response.text();
    return { error: formatUpstreamError(label, response.status, errorText), status: response.status };
  }
  return { models: parseOpenAIStyleModels(await response.json()) };
};

// Provider models endpoints configuration
const PROVIDER_MODELS_CONFIG = {
  claude: {
    url: "https://api.anthropic.com/v1/models",
    method: "GET",
    headers: {
      "Anthropic-Version": "2023-06-01",
      "Content-Type": "application/json"
    },
    authHeader: "x-api-key",
    parseResponse: (data) => data.data || []
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/models",
    method: "GET",
    headers: { "Content-Type": "application/json" },
    authQuery: "key", // Use query param for API key
    parseResponse: (data) => data.models || []
  },
  qwen: {
    url: "https://portal.qwen.ai/v1/models",
    method: "GET",
    headers: { "Content-Type": "application/json" },
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    parseResponse: (data) => data.data || []
  },
  codex: {
    customResolver: buildOAuthResolver({
      refreshFn: (conn) => refreshCodexToken(conn.refreshToken),
      fetchFn: (token) => fetch(CODEX_MODELS_URL, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
          "originator": "codex_cli_rs"
        }
      }),
      parseFn: parseCodexModels,
      errorLabel: "Failed to fetch Codex models"
    })
  },
  antigravity: {
    url: "https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:models",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    body: {},
    parseResponse: (data) => data.models || []
  },
  github: {
    url: "https://api.githubcopilot.com/models",
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Copilot-Integration-Id": "vscode-chat",
      "editor-version": "vscode/1.107.1",
      "editor-plugin-version": "copilot-chat/0.26.7",
      "user-agent": "GitHubCopilotChat/0.26.7"
    },
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    parseResponse: (data) => {
      if (!data?.data) return [];
      // Filter out embeddings, non-chat models, and disabled models
      return data.data
        .filter(m => m.capabilities?.type === "chat")
        .filter(m => m.policy?.state !== "disabled") // Only return explicitly enabled models
        .map(m => ({
          id: m.id,
          name: m.name || m.id,
          version: m.version,
          capabilities: m.capabilities,
          isDefault: m.model_picker_enabled === true
        }));
    }
  },
  openai: createOpenAIModelsConfig("https://api.openai.com/v1/models"),
  openrouter: createOpenAIModelsConfig("https://openrouter.ai/api/v1/models"),
  anthropic: {
    url: "https://api.anthropic.com/v1/models",
    method: "GET",
    headers: {
      "Anthropic-Version": "2023-06-01",
      "Content-Type": "application/json"
    },
    authHeader: "x-api-key",
    parseResponse: (data) => data.data || []
  },

  alicode: {
    url: "https://coding.dashscope.aliyuncs.com/v1/models",
    method: "GET",
    headers: { "Content-Type": "application/json" },
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    parseResponse: (data) => data.data || []
  },
  "alicode-intl": {
    url: "https://coding-intl.dashscope.aliyuncs.com/v1/models",
    method: "GET",
    headers: { "Content-Type": "application/json" },
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    parseResponse: (data) => data.data || []
  },
  "alims-intl": {
    url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/models",
    method: "GET",
    headers: { "Content-Type": "application/json" },
    authHeader: "Authorization",
    authPrefix: "Bearer ",
    parseResponse: (data) => data.data || []
  },
  "volcengine-ark": createOpenAIModelsConfig("https://ark.cn-beijing.volces.com/api/coding/v3/models"),
  byteplus: createOpenAIModelsConfig("https://ark.ap-southeast.bytepluses.com/api/coding/v3/models"),

  // OpenAI-compatible API key providers
  deepseek: createOpenAIModelsConfig("https://api.deepseek.com/models"),
  groq: createOpenAIModelsConfig("https://api.groq.com/openai/v1/models"),
  mistral: createOpenAIModelsConfig("https://api.mistral.ai/v1/models"),
  perplexity: createOpenAIModelsConfig("https://api.perplexity.ai/v1/models"),
  "perplexity-agent": createOpenAIModelsConfig("https://api.perplexity.ai/v1/models"),
  together: createOpenAIModelsConfig("https://api.together.xyz/v1/models"),
  fireworks: createOpenAIModelsConfig("https://api.fireworks.ai/inference/v1/models"),
  cerebras: createOpenAIModelsConfig("https://api.cerebras.ai/v1/models"),
  cohere: createOpenAIModelsConfig("https://api.cohere.ai/v1/models"),
  nebius: createOpenAIModelsConfig("https://api.studio.nebius.ai/v1/models"),
  siliconflow: createOpenAIModelsConfig("https://api.siliconflow.com/v1/models"),
  hyperbolic: createOpenAIModelsConfig("https://api.hyperbolic.xyz/v1/models"),
  ollama: createOpenAIModelsConfig("https://ollama.com/api/tags"),
  // ollama-local: url resolved dynamically below via providerSpecificData.baseUrl
  nanobanana: createOpenAIModelsConfig("https://api.nanobananaapi.ai/v1/models"),
  chutes: createOpenAIModelsConfig("https://llm.chutes.ai/v1/models"),
  nvidia: createOpenAIModelsConfig("https://integrate.api.nvidia.com/v1/models"),
  assemblyai: createOpenAIModelsConfig("https://api.assemblyai.com/v1/models"),
  "vercel-ai-gateway": createOpenAIModelsConfig("https://ai-gateway.vercel.sh/v1/models"),
  kimchi: {
    customResolver: async (connection) => {
      const result = await resolveKimchiModels({
        accessToken: connection.accessToken,
        apiKey: connection.apiKey,
        providerSpecificData: connection.providerSpecificData || {},
      }, { forceRefresh: true, log: console });
      if (result?.models?.length) {
        return { models: result.models };
      }
      return {
        models: getStaticProviderModels("kimchi"),
        warning: "Kimchi returned no live models; falling back to static catalog.",
      };
    }
  },
  cursor: {
    customResolver: async (connection) => {
      const result = await resolveCursorModels({
        accessToken: connection.accessToken,
        providerSpecificData: connection.providerSpecificData || {},
      }, { forceRefresh: true, log: console });
      if (result?.models?.length) return { models: result.models };
      return {
        models: getStaticProviderModels("cursor"),
        warning: "Cursor returned no live models; falling back to static catalog.",
      };
    },
  },

  // Custom resolvers (non-OpenAI-shaped APIs / token-refresh flows)
  kiro: {
    customResolver: async (connection) => {
      const credentials = {
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken,
        providerSpecificData: connection.providerSpecificData || {}
      };
      let warning;
      try {
        const result = await resolveKiroModels(credentials, {
          log: console,
          onCredentialsRefreshed: async (refreshed) => {
            if (refreshed?.accessToken) {
              await updateProviderCredentials(connection.id, {
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken || connection.refreshToken,
                expiresIn: refreshed.expiresIn,
              });
              connection.accessToken = refreshed.accessToken;
              if (refreshed.refreshToken) connection.refreshToken = refreshed.refreshToken;
            }
          }
        });
        if (result?.models?.length) {
          return {
            models: result.models.map((m) => ({
              id: m.id,
              name: m.name,
              upstreamModelId: m.upstreamModelId,
              contextLength: m.contextLength,
              rateMultiplier: m.rateMultiplier,
              capabilities: m.capabilities,
              description: m.description
            }))
          };
        }
        warning = "Kiro returned no models; falling back to static catalog.";
      } catch (error) {
        warning = `Failed to fetch Kiro models: ${error.message}`;
        console.log("Failed to fetch Kiro models dynamically, falling back to static:", error.message);
      }
      return { models: [], warning };
    }
  },
  qoder: {
    customResolver: async (connection) => {
      const credentials = {
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken,
        email: connection.email,
        displayName: connection.displayName,
        providerSpecificData: connection.providerSpecificData || {},
      };
      let warning;
      try {
        const result = await resolveQoderModels(credentials, { forceRefresh: true });
        if (result?.models?.length) {
          return {
            models: result.models.map((m) => ({
              // Use the canonical "qoder/<key>" id so the dashboard
              // surfaces the same identifier the chat router expects.
              id: `qoder/${m.id}`,
              name: m.name,
              contextLength: m.contextLength,
              isVL: m.isVL,
              isReasoning: m.isReasoning,
              maxOutputTokens: m.maxOutputTokens,
              description: m.description,
            })),
          };
        }
        warning = "Qoder returned no models; falling back to static catalog.";
      } catch (error) {
        warning = `Failed to fetch Qoder models: ${error.message}`;
        console.log("Failed to fetch Qoder models dynamically, falling back to static:", error.message);
      }
      return { models: [], warning };
    },
  },
  "gemini-cli": {
    customResolver: buildOAuthResolver({
      refreshFn: (conn) => refreshGoogleToken(conn.refreshToken, GEMINI_CONFIG.clientId, GEMINI_CONFIG.clientSecret),
      fetchFn: (token, conn) => {
        const projectId = conn.projectId || conn.providerSpecificData?.projectId;
        const body = projectId ? { project: projectId } : {};
        return fetch(GEMINI_CLI_MODELS_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
            "User-Agent": "google-api-nodejs-client/9.15.1",
            "X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1"
          },
          body: JSON.stringify(body)
        });
      },
      parseFn: parseGeminiCliModels,
      errorLabel: "Failed to fetch Gemini CLI models"
    })
  },
  "grok-cli": { customResolver: (connection) => resolveGrokCliCatalog(connection, "grok-cli") },
  // xAI device-code tokens carry `grok-cli:access` and list against the CLI proxy;
  // api.x.ai/v1/models answers console API keys only. Route by which credential is held.
  xai: {
    customResolver: (connection) =>
      connection.apiKey
        ? fetchOpenAIStyleCatalog("https://api.x.ai/v1/models", connection.apiKey, "xai")
        : resolveGrokCliCatalog(connection, "xai"),
  },
  "ollama-local": {
    customResolver: async (connection) => {
      const url = `${resolveOllamaLocalHost(connection)}/api/tags`;
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) {
        const errorText = await response.text();
        return { error: formatUpstreamError("ollama-local", response.status, errorText), status: response.status };
      }
      const data = await response.json();
      return { models: parseOpenAIStyleModels(data) };
    }
  }
};

/**
 * GET /api/providers/[id]/models - Get models list from provider
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const connection = await getProviderConnectionById(id);

    // With no connection row, id resolves to a provider id. Some endpoints serve
    // their catalog keyless, so attempt a keyless fetch and let the upstream
    // decide — only reject ids that aren't a known provider at all.
    const providerId = connection?.provider || id;
    const providerInfo = AI_PROVIDERS[providerId];

    // Compatible nodes carry their baseUrl on the node row, so with no connection
    // the node itself is the source of truth for a keyless catalog fetch.
    const node = !connection && (isOpenAICompatibleProvider(id) || isAnthropicCompatibleProvider(id))
      ? await getProviderNodeById(id)
      : null;
    if (!connection && !providerInfo && !node) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 });
    }

    const compat = connection || node;
    if (compat && isOpenAICompatibleProvider(compat.provider || compat.id)) {
      const result = await fetchCompatCatalog(compat, { anthropic: false });
      if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ provider: result.provider, connectionId: connection?.id || null, models: result.models });
    }

    if (compat && isAnthropicCompatibleProvider(compat.provider || compat.id)) {
      const result = await fetchCompatCatalog(compat, { anthropic: true });
      if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ provider: result.provider, connectionId: connection?.id || null, models: result.models });
    }

    const config = PROVIDER_MODELS_CONFIG[providerId] || buildRegistryModelsConfig(providerId, connection);
    if (!config) {
      return NextResponse.json(
        { error: `Provider ${providerId} does not support models listing` },
        { status: 400 }
      );
    }

    // Connection-less: only a fetchable keyless catalog works — token-bound
    // custom resolvers and endpoint-less configs need a stored connection.
    if (!connection && (typeof config.customResolver === "function" || !config.url)) {
      return NextResponse.json(
        { error: `Provider ${providerId} requires a connection to list models` },
        { status: 400 }
      );
    }

    // Config-driven custom resolver path (OAuth refresh, non-OpenAI shape, etc.)
    if (connection && typeof config.customResolver === "function") {
      const result = await config.customResolver(connection);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status || 500 });
      }
      return NextResponse.json({
        provider: connection.provider,
        connectionId: connection.id,
        models: result.models,
        ...(result.warning ? { warning: result.warning } : {})
      });
    }

    // Get auth token (noAuth configs like free providers skip auth)
    const token = connection ? (connection.providerSpecificData?.apiKey || connection.accessToken || connection.apiKey) : null;
    // With a stored connection, a non-noAuth provider must have a token. Connection-less
    // attempts go keyless — the upstream decides whether the endpoint accepts it.
    if (connection && !config.noAuth && !token) {
      return NextResponse.json({ error: "No valid token found" }, { status: 401 });
    }

    const baseUrl = providerId === "qwen" ? resolveQwenModelsUrl(connection) : config.url;

    const requestWithToken = (activeToken) => {
      const url = config.authQuery ? `${baseUrl}?${config.authQuery}=${activeToken}` : baseUrl;
      const headers = { ...config.headers };
      if (activeToken && config.authHeader && !config.authQuery) {
        headers[config.authHeader] = (config.authPrefix || "") + activeToken;
      }
      if (activeToken && config.alsoBearer && !headers["Authorization"]) {
        headers["Authorization"] = `Bearer ${activeToken}`;
      }
      const fetchOptions = { method: config.method, headers };
      if (config.body && config.method === "POST") {
        fetchOptions.body = JSON.stringify(config.body);
      }
      return fetch(url, fetchOptions);
    };

    let response = await requestWithToken(token);

    // An OAuth access token that expired between chat calls rejects with 401/403.
    // Refresh through the provider's registered handler, persist, and retry once —
    // the same contract buildOAuthResolver gives its hand-written providers.
    if (!response.ok && (response.status === 401 || response.status === 403) && connection?.refreshToken) {
      const refreshed = await refreshTokenByProvider(connection.provider, connection);
      if (refreshed?.accessToken && refreshed.accessToken !== token) {
        await updateProviderCredentials(connection.id, {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken || connection.refreshToken,
          expiresIn: refreshed.expiresIn,
        });
        response = await requestWithToken(refreshed.accessToken);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: formatUpstreamError(connection.provider, response.status, errorText) },
        { status: response.status }
      );
    }

    const data = await response.json();
    const models = config.parseResponse(data);

    return NextResponse.json({
      provider: providerId,
      connectionId: connection?.id || null,
      models
    });
  } catch (error) {
    console.log("Error fetching provider models:", error);
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 });
  }
}
