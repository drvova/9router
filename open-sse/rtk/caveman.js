// Caveman injector: appends a caveman-style instruction into the system message
// of the final request body, just before it is dispatched to the provider executor.

import { injectSystemPrompt } from "./systemInject.js";
import { CAVEMAN_PROMPTS } from "./cavemanPrompts.js";

// Returns a new body; injectSystemPrompt is copy-on-write.
export function injectCaveman(body, format, level) {
  return injectSystemPrompt(body, format, CAVEMAN_PROMPTS[level]);
}
