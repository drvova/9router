import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "kie",
  display: {
    name: "KIE.AI",
    icon: "hub",
    color: "#2563EB",
    textIcon: "KIE",
    website: "https://kie.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.kie.ai/v1/chat/completions",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 / header-read probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.kie.ai/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.kie.ai/claude/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "claude-opus-4-8", name: "Claude 4.8 Opus" },
    { id: "claude-opus-4-7", name: "Claude 4.7 Opus" },
    { id: "claude-sonnet-4-6", name: "Claude 4.6 Sonnet" },
    { id: "claude-haiku-4-5", name: "Claude 4.5 Haiku" },
    { id: "gpt-5-5", name: "GPT 5.5" },
    { id: "gpt-5-4", name: "GPT 5.4" },
    { id: "gpt-5-2", name: "GPT 5.2" },
    { id: "gemini-3-1-pro", name: "Gemini 3.1 Pro" },
    { id: "gemini-2-5-pro", name: "Gemini 2.5 Pro" },
    { id: "gemini-3-flash", name: "Gemini 3 Flash" },
    { id: "gemini-3-5-flash", name: "Gemini 3.5 Flash" },
  ],
};
