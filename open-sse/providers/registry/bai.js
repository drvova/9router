export default {
  id: "bai",
  display: {
    name: "b.ai",
    icon: "hub",
    color: "#6366F1",
    textIcon: "BA",
    website: "https://b.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.b.ai/v1/chat/completions",
    validateUrl: "https://api.b.ai/v1/models",
  },
  models: [
  ],
  passthroughModels: true,
};
