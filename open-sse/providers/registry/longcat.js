export default {
  id: "longcat",
  alias: "lc",
  hasFree: true,
  display: {
    name: "LongCat AI",
    icon: "auto_awesome",
    color: "#FF6B9D",
    textIcon: "LC",
    website: "https://longcat.chat/platform/docs",
    notice: { text: "Free: one-time 10M-token grant after account signup + KYC verification (LongCat-2.0). One-time only — not a recurring daily/monthly allowance." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.longcat.chat/openai/v1/chat/completions",
    auth: { header: "Authorization", scheme: "raw" },
  },
  models: [
    { id: "LongCat-2.0", name: "LongCat 2.0 (10M tok free 🆓)" },
  ],
};
