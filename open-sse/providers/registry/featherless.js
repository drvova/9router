import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "featherless",
  priority: 65,
  alias: "featherless",
  aliases: [
    "fl",
  ],
  uiAlias: "fl",
  display: {
    name: "Featherless",
    icon: "flutter_dash",
    color: "#111827",
    textIcon: "FL",
    website: "https://featherless.ai",
    notice: {
      apiKeyUrl: "https://featherless.ai/account/api-keys",
    },
  },
  category: "apikey",
  authType: "apikey",
  transport: {
    baseUrl: "https://api.featherless.ai/v1/chat/completions",
    validateUrl: "https://api.featherless.ai/v1/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.featherless.ai/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.featherless.ai/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-ai/DeepSeek-V4-Flash", name: "DeepSeek V4 Flash" },
    { id: "zai-org/GLM-5.2", name: "GLM 5.2" },
    { id: "zai-org/GLM-5.1", name: "GLM 5.1" },
    { id: "moonshotai/Kimi-K2.7-Code", name: "Kimi K2.7 Code" },
    { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6" },
    { id: "moonshotai/Kimi-K2.5", name: "Kimi K2.5" },
  ],
};
