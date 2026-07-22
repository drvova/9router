import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "llm7",
  hasFree: true,
  display: {
    name: "LLM7.io",
    icon: "hub",
    color: "#6366F1",
    textIcon: "LM",
    website: "https://llm7.io",
    notice: { text: "No signup required - 2 req/s, 20 RPM, 100 req/hr free tier" },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://api.llm7.io/v1/chat/completions",
    validateUrl: "https://api.llm7.io/v1/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.llm7.io/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.llm7.io/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "gpt-4o-mini-2024-07-18", name: "GPT-4o mini (LLM7)" },
    { id: "gpt-4.1-nano-2025-04-14", name: "GPT-4.1 nano (LLM7)" },
    { id: "deepseek-r1-0528", name: "DeepSeek R1 (LLM7)" },
    { id: "qwen2.5-coder-32b-instruct", name: "Qwen2.5 Coder 32B (LLM7)" },
  ],
};
