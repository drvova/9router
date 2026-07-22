export default {
  id: "sumopod",
  display: {
    name: "SumoPod",
    icon: "router",
    color: "#2563EB",
    textIcon: "SP",
    website: "https://ai.sumopod.com",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://ai.sumopod.com/v1/chat/completions",
    validateUrl: "https://ai.sumopod.com/v1/models",
  },
  models: [
  ],
  passthroughModels: true,
};
