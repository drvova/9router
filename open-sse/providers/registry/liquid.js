export default {
  id: "liquid",
  hasFree: true,
  display: {
    name: "Liquid AI",
    icon: "water_drop",
    color: "#06B6D4",
    textIcon: "LQ",
    website: "https://liquid.ai",
    notice: { text: "Free LFM2.5-1.2B-Thinking and LFM2.5-1.2B-Instruct models. MIT spinoff, hybrid architecture." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.liquid.ai/v1/chat/completions",
  },
  models: [
    { id: "liquid-lfm-40b", name: "Liquid LFM 40B" },
  ],
};
