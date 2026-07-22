import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "friendliai",
  alias: "friendli",
  hasFree: true,
  display: {
    name: "FriendliAI",
    icon: "handshake",
    color: "#EC4899",
    textIcon: "FR",
    website: "https://friendli.ai",
    notice: { text: "Free tier for serverless inference — no credit card required" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.friendli.ai/serverless/v1/chat/completions",
    validateUrl: "https://api.friendli.ai/serverless/v1/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.friendli.ai/serverless/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.friendli.ai/serverless/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "meta-llama-3.1-70b-instruct", name: "meta-llama-3.1-70b-instruct" },
    { id: "meta-llama-3.1-8b-instruct", name: "meta-llama-3.1-8b-instruct" },
  ],
};
