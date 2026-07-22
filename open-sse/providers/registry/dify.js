export default {
  id: "dify",
  hasFree: true,
  display: {
    name: "Dify",
    icon: "smart_toy",
    color: "#6366F1",
    textIcon: "DF",
    website: "https://dify.ai",
    notice: { text: "Free open-source AI app builder + RAG platform." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.dify.ai/v1/chat/completions",
  },
  models: [
    { id: "auto", name: "Auto" },
  ],
};
