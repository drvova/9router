export default {
  id: "qianfan",
  display: {
    name: "Baidu Qianfan",
    icon: "cloud",
    color: "#2468F2",
    textIcon: "BD",
    website: "https://cloud.baidu.com/product/wenxinworkshop",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://qianfan.baidubce.com/v2/chat/completions",
    validateUrl: "https://qianfan.baidubce.com/v2/models",
  },
  models: [
    { id: "ernie-5.1", name: "ERNIE 5.1" },
    { id: "ernie-5.0-thinking-latest", name: "ERNIE 5.0 Thinking Latest" },
    { id: "ernie-x1.1", name: "ERNIE X1.1" },
  ],
};
