import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "siliconflow",
  priority: 250,
  alias: "siliconflow",
  display: {
    name: "SiliconFlow",
    icon: "cloud_queue",
    color: "#5B6EF5",
    textIcon: "SF",
    website: "https://cloud.siliconflow.com",
    notice: {
      apiKeyUrl: "https://cloud.siliconflow.com/account/ak",
    },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.siliconflow.com/v1/chat/completions",
    validateUrl: "https://api.siliconflow.com/v1/models",
    thinkingFormat: "openai",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.siliconflow.com/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://api.siliconflow.com/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "deepseek-ai/DeepSeek-V4-Pro", name: "DeepSeek V4 Pro" },
    { id: "deepseek-ai/DeepSeek-V4-Flash", name: "DeepSeek V4 Flash" },
    { id: "deepseek-ai/DeepSeek-V3.2", name: "DeepSeek V3.2" },
    { id: "deepseek-ai/DeepSeek-V3.2-Exp", name: "DeepSeek V3.2 Exp" },
    { id: "deepseek-ai/DeepSeek-V3.1", name: "DeepSeek V3.1" },
    { id: "deepseek-ai/DeepSeek-V3.1-Terminus", name: "DeepSeek V3.1 Terminus" },
    { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1" },
    { id: "Qwen/Qwen3.5-397B-A17B", name: "Qwen 3.5 397B A17B" },
    { id: "Qwen/Qwen3.5-122B-A10B", name: "Qwen 3.5 122B A10B" },
    { id: "zai-org/GLM-5.1", name: "GLM 5.1" },
    { id: "zai-org/GLM-5", name: "GLM 5" },
    { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6" },
    { id: "moonshotai/Kimi-K2.5", name: "Kimi K2.5" },
    { id: "openai/gpt-oss-120b", name: "GPT OSS 120B" },
    { id: "MiniMaxAI/MiniMax-M2.5", name: "MiniMax M2.5" },
    { id: "inclusionAI/Ling-flash-2.0", name: "Ling Flash 2.0" },
  ],
};
