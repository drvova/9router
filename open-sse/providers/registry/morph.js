export default {
  id: "morph",
  hasFree: true,
  display: {
    name: "Morph",
    icon: "auto_fix_high",
    color: "#2563EB",
    textIcon: "MP",
    website: "https://morphllm.com",
    notice: { text: "Free tier: 250K credits/month, $0" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.morphllm.com/v1/chat/completions",
  },
  models: [
    { id: "morph-v3-large", name: "morph-v3-large" },
    { id: "morph-v3-fast", name: "morph-v3-fast" },
    { id: "morph-qwen35-397b", name: "Qwen 3.5 397B (Morph)" },
    { id: "morph-minimax27-230b", name: "MiniMax M2.7 (Morph)" },
    { id: "morph-qwen36-27b", name: "Qwen 3.6 27B (Morph)" },
    { id: "morph-dsv4flash", name: "DeepSeek V4 Flash (Morph)" },
  ],
};
