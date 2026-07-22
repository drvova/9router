export default {
  id: "zenmux",
  alias: "zm",
  hasFree: true,
  display: {
    name: "ZenMux",
    icon: "neurology",
    color: "#7C3AED",
    textIcon: "ZM",
    website: "https://zenmux.ai",
    notice: { text: "Free tier includes access to Gemini 3 Flash, DeepSeek V3.2, Grok 4.1 Fast, Mistral Large, and more. Get your API key at https://zenmux.ai." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://zenmux.ai/api/v1/chat/completions",
  },
  models: [
    { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview (ZenMux)" },
    { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview (ZenMux)" },
    { id: "openai/gpt-5", name: "GPT-5 (ZenMux)" },
    { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5 (ZenMux)" },
    { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5 (ZenMux)" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek V3.2 Chat (ZenMux)" },
    { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast (ZenMux)" },
    { id: "mistralai/mistral-large-2512", name: "Mistral Large 2512 (ZenMux)" },
    { id: "z-ai/glm-4.6v-flash", name: "GLM 4.6V Flash (ZenMux)" },
  ],
};
