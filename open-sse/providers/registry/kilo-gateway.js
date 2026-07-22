export default {
  id: "kilo-gateway",
  alias: "kg",
  display: {
    name: "Kilo Gateway",
    icon: "hub",
    color: "#617A91",
    textIcon: "KG",
    website: "https://kilo.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.kilo.ai/api/gateway/chat/completions",
  },
  models: [
    { id: "kilo-auto/frontier", name: "Kilo Auto Frontier" },
    { id: "kilo-auto/balanced", name: "Kilo Auto Balanced" },
    { id: "kilo-auto/free", name: "Kilo Auto Free" },
    { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B (Free)" },
    { id: "minimax/minimax-m2.5:free", name: "MiniMax M2.5 (Free)" },
    { id: "arcee-ai/trinity-large-preview:free", name: "Trinity Large Preview (Free)" },
  ],
  passthroughModels: true,
};
