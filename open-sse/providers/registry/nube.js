import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "nube",
  display: {
    name: "Nube.sh",
    icon: "cloud",
    color: "#2563EB",
    textIcon: "NB",
    website: "https://nube.sh",
  },
  category: "apikey",
  transport: {
    baseUrl: "https://ai.nube.sh/api/v1/chat/completions",
    validateUrl: "https://ai.nube.sh/api/v1/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://ai.nube.sh/api/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://ai.nube.sh/api/anthropic/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
  ],
  passthroughModels: true,
};
