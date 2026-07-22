import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "kilo-gateway",
  alias: "kg",
  display: {
    name: "Kilo Gateway",
    icon: "hub",
    color: "#617A91",
    textIcon: "KG",
    website: "https://kilo.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.kilo.ai/api/gateway/chat/completions",
    validateUrl: "https://api.kilo.ai/api/gateway/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.kilo.ai/api/gateway/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.kilo.ai/api/gateway/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "kilo-auto/frontier", name: "Kilo Auto Frontier" },
    { id: "kilo-auto/balanced", name: "Kilo Auto Balanced" },
    { id: "kilo-auto/free", name: "Kilo Auto Free" },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B (Free)" },
    { id: "minimax/minimax-m2.5:free", name: "MiniMax M2.5 (Free)" },
    { id: "arcee-ai/trinity-large-preview:free", name: "Trinity Large Preview (Free)" },
  ],
  passthroughModels: true,
};
