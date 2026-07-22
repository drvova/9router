import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "sensenova",
  display: {
    name: "sensenova",
    icon: "smart_toy",
    textIcon: "SE",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://token.sensenova.cn/v1/chat/completions",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://token.sensenova.cn/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://token.sensenova.cn/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "sensenova-6.7-flash-lite", name: "SenseNova 6.7 Flash-Lite" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "glm-5.2", name: "GLM 5.2" },
  ],
};
