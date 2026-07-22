export default {
  id: "maritalk",
  display: {
    name: "Maritalk",
    icon: "translate",
    color: "#1D4ED8",
    textIcon: "MT",
    website: "https://www.maritaca.ai",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://chat.maritaca.ai/api/chat/completions",
  },
  models: [
    { id: "sabia-4", name: "sabia-4" },
    { id: "sabia-3.1", name: "sabia-3.1" },
    { id: "sabiazinho-4", name: "sabiazinho-4" },
    { id: "sabiazinho-3", name: "sabiazinho-3" },
  ],
};
