export default {
  id: "moonshot",
  display: {
    name: "Moonshot AI",
    icon: "rocket_launch",
    color: "#1E40AF",
    textIcon: "MS",
    website: "https://platform.moonshot.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.moonshot.ai/v1/chat/completions",
  },
  models: [
    { id: "kimi-k2.7-code", name: "Kimi K2.7 Code" },
    { id: "kimi-k2.7-code-highspeed", name: "Kimi K2.7 Code (High Speed)" },
    { id: "kimi-k2.6", name: "kimi-k2.6" },
    { id: "kimi-k2.5", name: "kimi-k2.5" },
  ],
};
