import { CLAUDE_API_HEADERS } from "../shared.js";

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
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.hunyuan.cloud.tencent.com/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.hunyuan.cloud.tencent.com/anthropic/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "hunyuan-turbos-latest", name: "Hunyuan TurboS Latest" },
    { id: "hunyuan-t1-latest", name: "Hunyuan T1 Latest" },
    { id: "hunyuan-pro", name: "Hunyuan Pro" },
    { id: "hunyuan-vision", name: "Hunyuan Vision" },
    { id: "hunyuan-functioncall", name: "Hunyuan FunctionCall" },
    { id: "hunyuan-lite", name: "Hunyuan Lite" },
  ],
};
