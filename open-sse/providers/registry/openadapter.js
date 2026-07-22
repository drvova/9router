import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "openadapter",
  alias: "oad",
  hasFree: true,
  display: {
    name: "OpenAdapter",
    icon: "hub",
    color: "#10B981",
    textIcon: "OD",
    website: "https://openadapter.dev",
    notice: { text: "Free tier with a generous quota and no credit card — 15+ open-source models with daily quota. Get your API key at https://dashboard.openadapter.in." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.openadapter.in/v1/chat/completions",
    validateUrl: "https://api.openadapter.in/v1/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.openadapter.in/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.openadapter.in/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "glm-4.7", name: "GLM 4.7 (OpenAdapter)" },
  ],
};
