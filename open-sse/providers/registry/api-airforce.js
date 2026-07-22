import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "api-airforce",
  alias: "af",
  hasFree: true,
  display: {
    name: "Api.airforce",
    icon: "flight",
    color: "#1E3A5F",
    textIcon: "AF",
    website: "https://api.airforce",
    notice: { text: "55 free tier models including Grok-3, Claude 3.7, Qwen3, Kimi-K2, Gemini 2.5 Flash, DeepSeek-V3" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.airforce/v1/chat/completions",
    validateUrl: "https://api.airforce/v1/models",
    headers: { "HTTP-Referer": "https://endpoint-proxy.local", "X-Title": "Endpoint Proxy" },
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.airforce/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.airforce/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "x-ai/grok-3", name: "Grok-3 (Free)" },
    { id: "x-ai/grok-2-1212", name: "Grok-2 1212 (Free)" },
    { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet (Free)" },
    { id: "qwen/qwen3-32b", name: "Qwen3 32B (Free)" },
    { id: "moonshot/kimi-k2.6", name: "Kimi K2.6 (Free)" },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (Free)" },
    { id: "deepseek/deepseek-v3", name: "DeepSeek V3 (Free)" },
  ],
};
