export default {
  id: "inference-net",
  alias: "inet",
  hasFree: true,
  display: {
    name: "Inference.net",
    icon: "dns",
    color: "#2563EB",
    textIcon: "IN",
    website: "https://inference.net",
    notice: { text: "$25 free credits on signup plus research grants available" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.inference.net/v1/chat/completions",
  },
  models: [
    { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama-3.3-70B-Instruct" },
    { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek-R1" },
    { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen2.5-72B-Instruct" },
  ],
};
