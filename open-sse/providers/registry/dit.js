export default {
  id: "dit",
  alias: "dai",
  display: {
    name: "DIT.ai",
    icon: "hub",
    color: "#0EA5E9",
    textIcon: "DT",
    website: "https://dit.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.dit.ai/v1/chat/completions",
    validateUrl: "https://api.dit.ai/v1/models",
  },
  models: [
    { id: "gpt-5.4", name: "GPT-5.4 (DIT.ai)" },
    { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6 (DIT.ai)" },
  ],
};
