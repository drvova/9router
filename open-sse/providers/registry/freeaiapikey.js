export default {
  id: "freeaiapikey",
  alias: "faik",
  hasFree: true,
  display: {
    name: "FreeAIAPIKey",
    icon: "vpn_key",
    color: "#F59E0B",
    textIcon: "FK",
    website: "https://freeaiapikey.com",
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://freeaiapikey.com/v1/chat/completions",
    validateUrl: "https://freeaiapikey.com/v1/models",
  },
  models: [
    { id: "openai/gpt-5", name: "GPT-5 (via FreeAIAPIKey)" },
    { id: "openai/gpt-4o", name: "GPT-4o (via FreeAIAPIKey)" },
    { id: "openai/gpt-5.2-codex", name: "GPT-5.2 Codex (via FreeAIAPIKey)" },
    { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6 (via FreeAIAPIKey)" },
    { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6 (via FreeAIAPIKey)" },
    { id: "Alibaba/qwen3.5", name: "Qwen 3.5 (via FreeAIAPIKey)" },
    { id: "Alibaba/qwen3-vl:235b", name: "Qwen 3 VL 235B (via FreeAIAPIKey)" },
  ],
};
