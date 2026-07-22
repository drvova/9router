import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "qiniu",
  display: {
    name: "Qiniu",
    icon: "cloud",
    color: "#1E88E5",
    textIcon: "QN",
    website: "https://www.qiniu.com",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.qnaigc.com/v1/chat/completions",
    validateUrl: "https://api.qnaigc.com/v1/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.qnaigc.com/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.qnaigc.com/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
  ],
  passthroughModels: true,
};
