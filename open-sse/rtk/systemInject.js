// Shared system-prompt injector: appends an instruction into the system message of
// the final request body, dispatching by format so it works for translated and
// native-passthrough flows. Used by caveman.js, ponytail.js and the per-provider
// system prompt in chatCore.
//
// Copy-on-write, deliberately. The body reaching this point is NOT private: a
// same-format translateRequest returns the caller's body unchanged, and the
// account-fallback loop hands each attempt a shallow `{ ...body }` whose
// messages/system/parts arrays are shared with every other attempt. Mutating
// them in place would leak one provider's prompt into the next provider's
// attempt and compound the text on every retry. Every helper below therefore
// returns a new body, cloning only the containers it actually touches.

import { FORMATS } from "../translator/formats.js";

const SEP = "\n\n";

/**
 * @param {object} body - Request body (not mutated)
 * @param {string} format - Target wire format
 * @param {string} prompt - Text to append
 * @param {boolean} systemInInput - Responses shape only: carry the prompt as a system item
 *   in input[] rather than in the top-level instructions field.
 * @returns {object} New body with the prompt injected, or the original when nothing to do
 */
export function injectSystemPrompt(body, format, prompt, systemInInput = false) {
  if (!body || !prompt) return body;

  switch (format) {
    case FORMATS.CLAUDE:
      return injectClaudeSystem(body, prompt);
    case FORMATS.GEMINI:
    case FORMATS.GEMINI_CLI:
    case FORMATS.VERTEX:
    case FORMATS.ANTIGRAVITY:
      // Antigravity wraps Gemini shape in body.request → injectGeminiSystem handles it
      return injectGeminiSystem(body, prompt);
    default:
      // OpenAI and OpenAI-shaped formats (responses/codex/cursor/kiro/ollama)
      return injectMessagesSystem(body, prompt, systemInInput);
  }
}

// OpenAI-shaped: messages[] (chat) or input[] (responses) or instructions (responses string)
function injectMessagesSystem(body, prompt, systemInInput = false) {
  // OpenAI Responses API: top-level string field. Skipped when the caller wants the prompt
  // in the conversation instead — this branch otherwise wins on a translated Responses body,
  // where instructions is set to "" and therefore still a string.
  if (!systemInInput && typeof body.instructions === "string") {
    return { ...body, instructions: body.instructions ? `${body.instructions}${SEP}${prompt}` : prompt };
  }

  const key = Array.isArray(body.messages) ? "messages"
    : Array.isArray(body.input) ? "input"
    : null;
  if (!key) return body;

  const arr = [...body[key]];
  const idx = arr.findIndex(m => m && (m.role === "system" || m.role === "developer"));
  if (idx >= 0) {
    arr[idx] = appendToOpenAIMessage(arr[idx], prompt);
  } else {
    arr.unshift({ role: "system", content: prompt });
  }
  return { ...body, [key]: arr };
}

function appendToOpenAIMessage(msg, prompt) {
  if (typeof msg.content === "string") {
    return { ...msg, content: `${msg.content}${SEP}${prompt}` };
  }
  if (Array.isArray(msg.content)) {
    // Responses-style array of parts {type:"input_text"|"text", text}
    return { ...msg, content: [...msg.content, { type: "input_text", text: prompt }] };
  }
  return { ...msg, content: prompt };
}

// Claude shape: body.system as string | array of {type:"text", text}
// Insert before the last cache_control block to keep injection inside the cached prefix.
function injectClaudeSystem(body, prompt) {
  if (typeof body.system === "string" && body.system.length > 0) {
    return { ...body, system: `${body.system}${SEP}${prompt}` };
  }
  if (Array.isArray(body.system)) {
    const system = [...body.system];
    const block = { type: "text", text: prompt };
    let lastCacheIdx = -1;
    for (let i = system.length - 1; i >= 0; i--) {
      if (system[i]?.cache_control) { lastCacheIdx = i; break; }
    }
    if (lastCacheIdx >= 0) system.splice(lastCacheIdx, 0, block);
    else system.push(block);
    return { ...body, system };
  }
  return { ...body, system: prompt };
}

// Gemini shape: body.system_instruction | body.systemInstruction | body.request.systemInstruction
// Each shape: { parts: [{ text }] }
function injectGeminiSystem(body, prompt) {
  const nested = body.request && typeof body.request === "object";
  const target = nested ? body.request : body;
  const useSnake = Object.prototype.hasOwnProperty.call(target, "system_instruction");
  const key = useSnake ? "system_instruction" : "systemInstruction";
  const sys = target[key];

  const nextSys = sys && Array.isArray(sys.parts)
    ? { ...sys, parts: [...sys.parts, { text: prompt }] }
    : { parts: [{ text: prompt }] };

  const nextTarget = { ...target, [key]: nextSys };
  return nested ? { ...body, request: nextTarget } : nextTarget;
}
