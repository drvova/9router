import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "glm-cn",
  priority: 130,
  alias: "glm-cn",
  display: {
    name: "GLM (China)",
    icon: "code",
    color: "#DC2626",
    textIcon: "GC",
    website: "https://open.bigmodel.cn",
    notice: {
      apiKeyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4/chat/completions",
    headers: {},
    usage: {
      url: "https://open.bigmodel.cn/api/monitor/usage/quota/limit",
    },
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://open.bigmodel.cn/api/coding/paas/v4/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://open.bigmodel.cn/api/anthropic/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "glm-5.2", name: "GLM 5.2" },
    { id: "glm-5.1", name: "GLM 5.1" },
    { id: "glm-5", name: "GLM 5" },
    { id: "glm-4.7", name: "GLM-4.7" },
    { id: "glm-4.6", name: "GLM-4.6" },
    { id: "glm-4.5-air", name: "GLM-4.5-Air" },
  ],
  features: {
    usage: true,
    usageApikey: true,
  },
};
