export default {
  id: "freemodel-dev",
  alias: "fmd",
  hasFree: true,
  display: {
    name: "FreeModel.dev",
    icon: "auto_awesome",
    color: "#8B5CF6",
    textIcon: "FM",
    website: "https://freemodel.dev",
    notice: { text: "$300 free credits on signup — no credit card required. Access GPT-5.4 and GPT-5.5 (OpenAI's latest flagship models) through an OpenAI-compatible API." },
  },
  category: "freeTier",
  transport: {
    baseUrl: "https://api.freemodel.dev/v1/chat/completions",
  },
  models: [
    { id: "gpt-5.5", name: "GPT-5.5" },
    { id: "gpt-5.4", name: "GPT-5.4" },
    { id: "gpt-5.4-mini", name: "GPT-5.4 Mini" },
    { id: "gpt-5.3-codex", name: "GPT-5.3 Codex" },
  ],
};
