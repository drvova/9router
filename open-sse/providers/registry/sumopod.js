import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "sumopod",
  display: {
    name: "SumoPod",
    icon: "router",
    color: "#2563EB",
    textIcon: "SP",
    website: "https://ai.sumopod.com",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://ai.sumopod.com/v1/chat/completions",
    validateUrl: "https://ai.sumopod.com/v1/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://ai.sumopod.com/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://ai.sumopod.com/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
  ],
  passthroughModels: true,
};
