export default {
  id: "doubao",
  hasFree: true,
  display: {
    name: "Doubao",
    icon: "auto_awesome",
    color: "#FE2C55",
    textIcon: "DB",
    website: "https://doubao.com",
    notice: { text: "Free Doubao models. ByteDance's chatbot." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
  },
  models: [
    { id: "doubao-seed-2-0-pro-260215", name: "Doubao Seed 2.0 Pro" },
    { id: "doubao-seed-2-0-lite-260215", name: "Doubao Seed 2.0 Lite" },
    { id: "doubao-seed-2-0-mini-260215", name: "Doubao Seed 2.0 Mini" },
    { id: "doubao-seed-2-0-code-preview-260215", name: "Doubao Seed 2.0 Code" },
    { id: "doubao-seed-1-8-251228", name: "Doubao Seed 1.8" },
    { id: "doubao-seed-1-6-251015", name: "Doubao Seed 1.6" },
    { id: "doubao-seed-1-6-flash-250828", name: "Doubao Seed 1.6 Flash" },
    { id: "doubao-1-5-pro-32k-250115", name: "Doubao 1.5 Pro 32K" },
    { id: "doubao-pro-32k", name: "Doubao Pro 32K" },
  ],
};
