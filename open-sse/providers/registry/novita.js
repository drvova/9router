export default {
  id: "novita",
  hasFree: true,
  display: {
    name: "Novita AI",
    icon: "auto_awesome",
    color: "#FF4081",
    textIcon: "NV",
    website: "https://novita.ai",
    notice: { text: "$0.50 trial credits on signup (valid about 1 year)" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.novita.ai/openai/v1/chat/completions",
  },
  models: [
    { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct" },
  ],
};
