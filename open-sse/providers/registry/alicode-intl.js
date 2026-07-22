import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "alicode-intl",
  priority: 10,
  alias: "alicode-intl",
  display: {
    name: "Alibaba Coding",
    icon: "cloud",
    color: "#FF6A00",
    textIcon: "ALi",
    website: "https://www.alibabacloud.com/product/coding",
    notice: {
      apiKeyUrl: "https://www.alibabacloud.com/product/coding",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://coding-intl.dashscope.aliyuncs.com/v1/chat/completions",
    headers: {},
    quirks: { preserveCacheControl: true },
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 / header-read probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://coding-intl.dashscope.aliyuncs.com/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://dashscope-intl.aliyuncs.com/api/v2/apps/claude-code-proxy/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "qwen3.5-plus", name: "Qwen3.5 Plus" },
    { id: "kimi-k2.5", name: "Kimi K2.5" },
    { id: "glm-5", name: "GLM 5" },
    { id: "MiniMax-M2.5", name: "MiniMax M2.5" },
    { id: "qwen3-coder-next", name: "Qwen3 Coder Next" },
    { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus" },
    { id: "glm-4.7", name: "GLM 4.7" },
  ],
};
