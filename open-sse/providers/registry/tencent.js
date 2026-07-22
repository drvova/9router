export default {
  id: "tencent",
  hasFree: true,
  display: {
    name: "Tencent Hunyuan",
    icon: "auto_awesome",
    color: "#07C160",
    textIcon: "TC",
    website: "https://hunyuan.tencent.com",
    notice: { text: "Free Hunyuan Lite models. WeChat ecosystem." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions",
  },
  models: [
    { id: "hunyuan-turbos-latest", name: "Hunyuan TurboS Latest" },
    { id: "hunyuan-t1-latest", name: "Hunyuan T1 Latest" },
    { id: "hunyuan-pro", name: "Hunyuan Pro" },
    { id: "hunyuan-vision", name: "Hunyuan Vision" },
    { id: "hunyuan-functioncall", name: "Hunyuan FunctionCall" },
    { id: "hunyuan-lite", name: "Hunyuan Lite" },
  ],
};
