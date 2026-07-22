import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "nanogpt",
  display: {
    name: "NanoGPT",
    icon: "chat",
    color: "#4F46E5",
    textIcon: "NG",
    website: "https://nano-gpt.com",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://nano-gpt.com/api/v1/chat/completions",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://nano-gpt.com/api/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://nano-gpt.com/api/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "chatgpt-4o-latest", name: "chatgpt-4o-latest" },
    { id: "claude-3.5-sonnet", name: "claude-3.5-sonnet" },
    { id: "gpt-4o-mini", name: "gpt-4o-mini" },
  ],
};
