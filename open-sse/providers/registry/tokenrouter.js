import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "tokenrouter",
  alias: "trk",
  hasFree: true,
  display: {
    name: "TokenRouter",
    icon: "hub",
    color: "#F59E0B",
    textIcon: "TK",
    website: "https://tokenrouter.com",
    notice: { text: "Free tier includes the MiniMax 3 model. Get your API key at https://tokenrouter.com." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.tokenrouter.com/v1/chat/completions",
    validateUrl: "https://api.tokenrouter.com/v1/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.tokenrouter.com/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.tokenrouter.com/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "minimax-3", name: "MiniMax 3 (free, TokenRouter)" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro (TokenRouter)" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash (TokenRouter)" },
  ],
};
