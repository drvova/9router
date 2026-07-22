import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "pioneer",
  alias: "pn",
  hasFree: true,
  display: {
    name: "Pioneer AI",
    icon: "rocket_launch",
    color: "#7C5CFF",
    textIcon: "PN",
    website: "https://pioneer.ai",
    notice: { text: "$75 free usage credits — no credit card required" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.pioneer.ai/v1/chat/completions",
    auth: { combined: true, header: "x-api-key", scheme: "raw" },
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://api.pioneer.ai/v1/chat/completions",
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
    {
      format: "claude",
      baseUrl: "https://api.pioneer.ai/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "x-api-key", scheme: "raw" },
    },
  ],
  models: [
    { id: "Qwen/Qwen3-32B", name: "Qwen3 32B" },
    { id: "Qwen/Qwen3.6-27B", name: "Qwen3.6 27B" },
    { id: "Qwen/Qwen3.5-9B", name: "Qwen3.5 9B" },
    { id: "Qwen/Qwen3-8B", name: "Qwen3 8B" },
    { id: "Qwen/Qwen3-4B-Base", name: "Qwen3 4B Base" },
    { id: "Qwen/Qwen3-1.7B-Base", name: "Qwen3 1.7B Base" },
    { id: "meta-llama/Llama-3.1-8B-Instruct", name: "Llama 3.1 8B Instruct" },
    { id: "meta-llama/Llama-3.2-1B-Instruct", name: "Llama 3.2 1B Instruct" },
    { id: "google/gemma-3-4b-pt", name: "Gemma 3 4B (Pretrained)" },
    { id: "HuggingFaceTB/SmolLM3-3B-Base", name: "SmolLM3 3B Base" },
  ],
};
