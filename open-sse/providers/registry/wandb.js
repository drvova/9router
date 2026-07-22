export default {
  id: "wandb",
  display: {
    name: "Weights & Biases Inference",
    icon: "monitoring",
    color: "#FFBE0B",
    textIcon: "WB",
    website: "https://wandb.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.inference.wandb.ai/v1/chat/completions",
  },
  models: [
    { id: "openai/gpt-oss-120b", name: "gpt-oss-120b" },
    { id: "Qwen/Qwen3-Coder-480B-A35B-Instruct", name: "Qwen3-Coder-480B-A35B-Instruct" },
    { id: "deepseek-ai/DeepSeek-V3.1", name: "DeepSeek-V3.1" },
  ],
};
