export default {
  id: "tokenrouter",
  alias: "trk",
  hasFree: true,
  display: {
    name: "TokenRouter",
    icon: "hub",
    color: "#F59E0B",
    textIcon: "TK",
    website: "https://tokenrouter.com",
    notice: { text: "Free tier includes the MiniMax 3 model. Get your API key at https://tokenrouter.com." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.tokenrouter.com/v1/chat/completions",
    validateUrl: "https://api.tokenrouter.com/v1/models",
  },
  models: [
    { id: "minimax-3", name: "MiniMax 3 (free, TokenRouter)" },
    { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro (TokenRouter)" },
    { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash (TokenRouter)" },
  ],
};
