export default {
  id: "modal",
  hasFree: true,
  display: {
    name: "Modal",
    icon: "cloud_queue",
    color: "#7C3AED",
    textIcon: "MDL",
    website: "https://modal.com/docs",
    notice: { text: "$30/month free credits for new accounts" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.modal.ai/v1/chat/completions",
  },
  models: [
    { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash" },
  ],
};
