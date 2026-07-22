export default {
  id: "sambanova",
  alias: "samba",
  hasFree: true,
  display: {
    name: "SambaNova",
    icon: "memory",
    color: "#DC2626",
    textIcon: "SN",
    website: "https://sambanova.ai",
    notice: { text: "$5 free credits on signup (30-day validity), no credit card required" },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.sambanova.ai/v1/chat/completions",
  },
  models: [
    { id: "MiniMax-M2.7", name: "MiniMax-M2.7" },
    { id: "DeepSeek-V3.2", name: "DeepSeek-V3.2" },
    { id: "Llama-4-Maverick-17B-128E-Instruct", name: "Llama-4-Maverick-17B-128E-Instruct" },
    { id: "Meta-Llama-3.3-70B-Instruct", name: "Meta-Llama-3.3-70B-Instruct" },
    { id: "gpt-oss-120b", name: "gpt-oss-120b" },
  ],
};
