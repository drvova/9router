export default {
  id: "factory",
  display: {
    name: "Factory",
    icon: "smart_toy",
    color: "#0F172A",
    textIcon: "FA",
    website: "https://factory.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.factory.ai/v1/chat/completions",
  },
  models: [
    { id: "auto", name: "Factory Auto (best model)" },
  ],
};
