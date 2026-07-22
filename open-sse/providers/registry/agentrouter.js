import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "agentrouter",
  hasFree: true,
  display: {
    name: "AgentRouter",
    icon: "router",
    color: "#10B981",
    textIcon: "AR",
    website: "https://agentrouter.org",
    notice: { text: "$200 free credits on signup - multi-model routing gateway" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://agentrouter.org/v1/messages",
    format: "claude",
    headers: { ...CLAUDE_API_HEADERS },
    auth: { header: "x-api-key", scheme: "raw" },
  },
  models: [
    { id: "claude-opus-4-6", name: "Claude 4.6 Opus" },
    { id: "claude-haiku-4-5-20251001", name: "Claude 4.5 Haiku" },
    { id: "glm-5.1", name: "GLM 5.1" },
    { id: "deepseek-v3.2", name: "DeepSeek V3.2" },
  ],
  passthroughModels: true,
};
