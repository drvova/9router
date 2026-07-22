export default {
  id: "hcnsec",
  hasFree: true,
  display: {
    name: "Huancheng Public API",
    icon: "security",
    color: "#0EA5E9",
    textIcon: "HC",
    website: "https://api.hcnsec.cn",
    notice: { text: "Xinjiang Huancheng Cybersecurity public LLM API platform: free credits with daily check-ins." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.hcnsec.cn/v1/chat/completions",
  },
  models: [
  ],
  passthroughModels: true,
};
