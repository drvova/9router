export default {
  id: "galadriel",
  display: {
    name: "Galadriel",
    icon: "auto_awesome",
    color: "#F59E0B",
    textIcon: "GA",
    website: "https://galadriel.com",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.galadriel.ai/v1/chat/completions",
  },
  models: [
    { id: "galadriel-latest", name: "galadriel-latest" },
  ],
};
