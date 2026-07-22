import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "orcarouter",
  display: {
    name: "OrcaRouter",
    icon: "router",
    color: "#0891B2",
    textIcon: "ORC",
    website: "https://www.orcarouter.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.orcarouter.ai/v1",
    headers: { "HTTP-Referer": "https://endpoint-proxy.local", "X-Title": "Endpoint Proxy" },
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 / header-read probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.orcarouter.ai/v1",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.orcarouter.ai/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "orcarouter/auto", name: "Auto (smart routing)" },
    { id: "openai/gpt-5.5", name: "GPT-5.5" },
    { id: "google/gemini-3.5-flash", name: "Gemini 3.5 Flash" },
    { id: "anthropic/claude-opus-4.8", name: "Claude Opus 4.8" },
    { id: "grok/grok-4.3", name: "Grok 4.3" },
    { id: "deepseek/deepseek-v4-pro", name: "DeepSeek V4 Pro" },
    { id: "minimax/minimax-m2.7", name: "MiniMax M2.7" },
    { id: "qwen/qwen3.7-max", name: "Qwen3.7 Max" },
  ],
};
