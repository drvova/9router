export default {
  id: "hackclub",
  alias: "hc",
  hasFree: true,
  display: {
    name: "Hackclub AI",
    icon: "auto_awesome",
    color: "#FF6B00",
    textIcon: "HC",
    website: "https://ai.hackclub.com",
    notice: { text: "Free AI for Hack Club members — 30+ models, no credit card." },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://ai.hackclub.com/proxy/v1/chat/completions",
  },
  models: [
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
    { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B" },
    { id: "deepseek-ai/deepseek-coder-33b", name: "DeepSeek Coder 33B" },
  ],
  passthroughModels: true,
};
