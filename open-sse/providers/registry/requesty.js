export default {
  id: "requesty",
  hasFree: true,
  display: {
    name: "Requesty",
    icon: "router",
    color: "#6366F1",
    textIcon: "RQ",
    website: "https://requesty.ai",
    notice: { text: "Free tier ~200 requests/day - multi-model routing gateway (300+ models)" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://router.requesty.ai/v1/chat/completions",
    validateUrl: "https://router.requesty.ai/v1/models",
  },
  models: [
  ],
  passthroughModels: true,
};
