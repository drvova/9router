import { CLAUDE_API_HEADERS } from "../shared.js";

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
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://qianfan.baidubce.com/v2/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://qianfan.baidubce.com/anthropic/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "ernie-5.1", name: "ERNIE 5.1" },
    { id: "ernie-5.0-thinking-latest", name: "ERNIE 5.0 Thinking Latest" },
    { id: "ernie-x1.1", name: "ERNIE X1.1" },
  ],
};
