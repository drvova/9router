import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "upstage",
  display: {
    name: "Upstage",
    icon: "trending_up",
    color: "#0F766E",
    textIcon: "UP",
    website: "https://www.upstage.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.upstage.ai/v1/chat/completions",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.upstage.ai/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.upstage.ai/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "solar-pro3", name: "solar-pro3" },
    { id: "solar-mini", name: "solar-mini" },
  ],
};
