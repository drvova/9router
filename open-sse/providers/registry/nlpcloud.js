export default {
  id: "nlpcloud",
  alias: "nlpc",
  hasFree: true,
  display: {
    name: "NLP Cloud",
    icon: "psychology",
    color: "#2196F3",
    textIcon: "NLPC",
    website: "https://docs.nlpcloud.com",
    notice: { text: "Trial credits for new accounts" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.nlpcloud.io/v1/chat/completions",
  },
  models: [
    { id: "chatdolphin", name: "ChatDolphin" },
    { id: "dolphin", name: "Dolphin" },
    { id: "finetuned-llama-3-70b", name: "Fine-tuned LLaMA 3.3 70B" },
    { id: "llama-3-1-405b", name: "LLaMA 3.1 405B" },
    { id: "llama-3-8b-instruct", name: "Llama 3 8B" },
  ],
};
