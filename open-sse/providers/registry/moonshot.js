import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "moonshot",
  display: {
    name: "Moonshot AI",
    icon: "rocket_launch",
    color: "#1E40AF",
    textIcon: "MS",
    website: "https://platform.moonshot.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.moonshot.ai/v1/chat/completions",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.moonshot.ai/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.moonshot.ai/anthropic/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code" },
    { id: "kimi-k2.7-code-highspeed", name: "Kimi K2.7 Code (High Speed)" },
    { id: "kimi-k2.6", name: "kimi-k2.6" },
    { id: "kimi-k2.5", name: "kimi-k2.5" },
  ],
};
