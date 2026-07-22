export default {
  id: "baichuan",
  hasFree: true,
  display: {
    name: "Baichuan",
    icon: "auto_awesome",
    color: "#6366F1",
    textIcon: "BC",
    website: "https://baichuan.com",
    notice: { text: "Free Baichuan models. Popular Chinese LLM startup." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.baichuan-ai.com/v1/chat/completions",
  },
  models: [
    { id: "Baichuan4-Turbo", name: "Baichuan 4 Turbo" },
    { id: "Baichuan4-Air", name: "Baichuan 4 Air" },
    { id: "Baichuan4", name: "Baichuan 4" },
    { id: "Baichuan3-Turbo", name: "Baichuan 3 Turbo" },
    { id: "Baichuan3-Turbo-128k", name: "Baichuan 3 Turbo 128k" },
  ],
};
