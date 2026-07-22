export default {
  id: "dgrid",
  hasFree: true,
  display: {
    name: "DGrid",
    icon: "router",
    color: "#65A30D",
    textIcon: "DG",
    website: "https://dgrid.ai",
    notice: { text: "DGrid Free Models Router: 10 requests/minute and 100 requests/day. " },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.dgrid.ai/v1/chat/completions",
    validateUrl: "https://api.dgrid.ai/v1/models",
  },
  models: [
    { id: "dgridai/free", name: "DGrid Free Models Router" },
  ],
  passthroughModels: true,
};
