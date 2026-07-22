import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "hcnsec",
  hasFree: true,
  display: {
    name: "Huancheng Public API",
    icon: "security",
    color: "#0EA5E9",
    textIcon: "HC",
    website: "https://api.hcnsec.cn",
    notice: { text: "Xinjiang Huancheng Cybersecurity public LLM API platform: free credits with daily check-ins." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.hcnsec.cn/v1/chat/completions",
    validateUrl: "https://api.hcnsec.cn/v1/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.hcnsec.cn/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.hcnsec.cn/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
  ],
  passthroughModels: true,
};
