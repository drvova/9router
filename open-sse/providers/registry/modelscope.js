export default {
  id: "modelscope",
  alias: "ms",
  display: {
    name: "modelscope",
    icon: "smart_toy",
    textIcon: "MO",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api-inference.modelscope.cn/v1/chat/completions",
    validateUrl: "https://api-inference.modelscope.cn/v1/models",
  },
  models: [
  ],
  passthroughModels: true,
};
