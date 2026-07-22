export default {
  id: "iflytek",
  hasFree: true,
  display: {
    name: "iFlytek Spark",
    icon: "auto_awesome",
    color: "#0066FF",
    textIcon: "IF",
    website: "https://xinghuo.xfyun.cn",
    notice: { text: "Spark Lite is free (2 QPS rate-limited), but iFlytek ToS §2.4(3) prohibits programmatic extraction and requires Chinese real-name auth — use with caution." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://spark-api.xf-yun.com/v1/chat/completions",
  },
  models: [
    { id: "4.0Ultra", name: "Spark 4.0 Ultra" },
    { id: "generalv3.5", name: "Spark Max (V3.5)" },
    { id: "max-32k", name: "Spark Max 32K" },
    { id: "generalv3", name: "Spark Pro" },
    { id: "pro-128k", name: "Spark Pro 128K" },
    { id: "lite", name: "Spark Lite" },
  ],
};
