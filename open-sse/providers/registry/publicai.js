export default {
  id: "publicai",
  hasFree: true,
  display: {
    name: "PublicAI",
    icon: "public",
    color: "#059669",
    textIcon: "PA",
    website: "https://publicai.co",
    notice: { text: "Requires an API key — one-time signup credit, then paid" },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://api.publicai.co/v1/chat/completions",
  },
  models: [
    { id: "swiss-ai/apertus-70b-instruct", name: "apertus-70b-instruct" },
    { id: "swiss-ai/Apertus-8B-Instruct-2509", name: "Apertus-8B-Instruct-2509" },
    { id: "aisingapore/Qwen-SEA-LION-v4-32B-IT", name: "Qwen-SEA-LION-v4-32B-IT" },
    { id: "aisingapore/Gemma-SEA-LION-v4-27B-IT", name: "Gemma-SEA-LION-v4-27B-IT" },
    { id: "allenai/Olmo-3-32B-Think", name: "Olmo-3-32B-Think" },
    { id: "allenai/Olmo-3-7B-Instruct", name: "Olmo-3-7B-Instruct" },
    { id: "utter-project/EuroLLM-22B-Instruct-2512", name: "EuroLLM-22B-Instruct-2512" },
  ],
};
