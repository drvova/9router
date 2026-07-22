export default {
  id: "nous-research",
  alias: "nous",
  hasFree: true,
  display: {
    name: "Nous Research",
    icon: "hub",
    color: "#2563EB",
    textIcon: "NO",
    website: "https://portal.nousresearch.com/help",
    notice: { text: "Free tier: 50 RPM, 500,000 TPM — no credit card" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://inference-api.nousresearch.com/v1/chat/completions",
  },
  models: [
    { id: "Hermes-4-405B", name: "Hermes 4 7B (Nous Research)" },
    { id: "Hermes-4-70B", name: "Hermes 4 70B (Nous Research)" },
  ],
};
