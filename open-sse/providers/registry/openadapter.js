export default {
  id: "openadapter",
  alias: "oad",
  hasFree: true,
  display: {
    name: "OpenAdapter",
    icon: "hub",
    color: "#10B981",
    textIcon: "OD",
    website: "https://openadapter.dev",
    notice: { text: "Free tier with a generous quota and no credit card — 15+ open-source models with daily quota. Get your API key at https://dashboard.openadapter.in." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.openadapter.in/v1/chat/completions",
  },
  models: [
    { id: "glm-4.7", name: "GLM 4.7 (OpenAdapter)" },
  ],
};
