import { CLAUDE_API_HEADERS } from "../shared.js";

export default {
  id: "charm-hyper",
  hasFree: true,
  display: {
    name: "Charm Hyper",
    icon: "router",
    color: "#7C3AED",
    textIcon: "CH",
    website: "https://hyper.charm.land",
    notice: { text: "100 free monthly Hypercredits on signup" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://hyper.charm.land/v1/chat/completions",
    validateUrl: "https://hyper.charm.land/v1/models",
  },
  // Multi-endpoint: pick the transport matching client sourceFormat to skip translation.
  // Anthropic endpoint verified live 2026-07-22 (auth-error + ctrl-404 probe).
  transports: [
    {
      format: "openai",
      baseUrl: "https://hyper.charm.land/v1/chat/completions",
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
    {
      format: "claude",
      baseUrl: "https://hyper.charm.land/v1/messages",
      headers: { ...CLAUDE_API_HEADERS },
      auth: { combined: true, header: "Authorization", scheme: "bearer" },
    },
  ],
  models: [
    { id: "hyper/auto", name: "Charm Hyper Auto" },
  ],
  passthroughModels: true,
};
