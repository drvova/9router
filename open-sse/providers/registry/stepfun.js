export default {
  id: "stepfun",
  hasFree: true,
  display: {
    name: "StepFun",
    icon: "auto_awesome",
    color: "#8B5CF6",
    textIcon: "SF",
    website: "https://stepfun.com",
    notice: { text: "Free Step-2 models. Chinese AI company." },
  },
  category: "apikey",
  transport: {
    baseUrl: "https://api.stepfun.com/v1/chat/completions",
  },
  models: [
    { id: "step-3.7-flash", name: "Step 3.7 Flash" },
    { id: "step-3.5-flash", name: "Step 3.5 Flash" },
    { id: "step-3.5-flash-2603", name: "Step 3.5 Flash 2603" },
    { id: "step-1o-turbo-vision", name: "Step 1o Turbo Vision" },
    { id: "step-1v", name: "Step 1V" },
  ],
};
