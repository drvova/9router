export default {
  id: "baseten",
  hasFree: true,
  display: {
    name: "Baseten",
    icon: "deployed_code",
    color: "#111827",
    textIcon: "BT",
    website: "https://baseten.co",
    notice: { text: "$30 free trial credits for GPU inference" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://inference.baseten.co/v1/chat/completions",
  },
  models: [
    { id: "moonshotai/Kimi-K2.6", name: "Kimi-K2.6" },
    { id: "deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek-V4-Pro" },
    { id: "zai-org/GLM-5", name: "GLM-5" },
    { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax-M2.5" },
    { id: "nvidia/Nemotron-120B-A12B", name: "Nemotron-120B-A12B" },
    { id: "openai/gpt-oss-120b", name: "gpt-oss-120b" },
  ],
};
