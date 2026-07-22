export default {
  id: "sensenova",
  display: {
    name: "sensenova",
    icon: "smart_toy",
    textIcon: "SE",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://token.sensenova.cn/v1/chat/completions",
  },
  models: [
    { id: "sensenova-6.7-flash-lite", name: "SenseNova 6.7 Flash-Lite" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
    { id: "glm-5.2", name: "GLM 5.2" },
  ],
};
