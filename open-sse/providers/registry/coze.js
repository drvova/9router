export default {
  id: "coze",
  hasFree: true,
  display: {
    name: "Coze",
    icon: "smart_toy",
    color: "#3B82F6",
    textIcon: "CZ",
    website: "https://coze.com",
    notice: { text: "Free ByteDance agent platform. Bot building + LLM access." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.coze.com/v1/chat/completions",
  },
  models: [
    { id: "claude-3-7-sonnet-20250514", name: "Claude 3.7 Sonnet" },
  ],
};
