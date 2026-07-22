export default {
  id: "monsterapi",
  alias: "monster",
  hasFree: true,
  display: {
    name: "MonsterAPI",
    icon: "cloud",
    color: "#EF4444",
    textIcon: "MA",
    website: "https://monsterapi.ai",
    notice: { text: "One-time signup trial credits for decentralized GPU inference (no recurring free plan). No credit card required." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.monsterapi.ai/v1/chat/completions",
  },
  models: [
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct", name: "Llama 3.1 8B Instruct" },
    { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama 3.3 70B Instruct" },
  ],
};
