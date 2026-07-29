import { NextResponse } from "next/server";
import { collectTemplateVariables, BUILT_IN_VAR_NAMES } from "open-sse/rtk/promptTemplate.js";

export const dynamic = "force-dynamic";

// POST /api/prompt-variables - list the variable names a prompt template consumes.
// Server-side because detection parses the template with the same engine that renders
// it, which is the only way to see names used solely inside {% %} blocks; a regex over
// {{ }} in the browser would miss them, and shipping the engine to the client to avoid
// one request would cost far more than the request.
export async function POST(request) {
  try {
    const { template } = await request.json();

    if (typeof template !== "string") {
      return NextResponse.json({ error: "template must be a string" }, { status: 400 });
    }

    const variables = collectTemplateVariables(template);
    // Count only blocks that will actually be evaluated. Counting every {% occurrence
    // also counted the {% raw %} and {% endraw %} wrappers, so a prompt whose blocks were
    // correctly protected was warned about the very protection that fixed it.
    const unprotected = template.replace(/\{%-?\s*raw\s*%\}[\s\S]*?\{%-?\s*endraw\s*%\}/g, "");
    const controlBlocks = (unprotected.match(/\{%/g) || []).length;

    // Names the prompt mentions only inside a protected block. They are sent verbatim, so
    // giving them a value changes nothing — and an editor that stays silent about that
    // leaves the operator wondering why the values they typed are ignored.
    const rawRegions = [...template.matchAll(/\{%-?\s*raw\s*%\}([\s\S]*?)\{%-?\s*endraw\s*%\}/g)]
      .map((m) => m[1])
      .join("\n");
    const inRaw = rawRegions ? collectTemplateVariables(rawRegions) : [];
    const insideRawOnly = inRaw.filter((name) => !variables.includes(name));

    // Built-ins are excluded from `variables` because the router supplies them, but the
    // prompt still renders them. Reporting them separately stops a count of "variables
    // you must supply" from reading as a count of variables in the prompt.
    const builtInsUsed = BUILT_IN_VAR_NAMES.filter((name) =>
      new RegExp(`\\{\\{\\s*${name}\\s*\\}\\}`).test(unprotected)
    );
    return NextResponse.json({ variables, controlBlocks, insideRawOnly, builtInsUsed });
  } catch (error) {
    console.log("Error detecting prompt variables:", error);
    return NextResponse.json({ error: "Failed to detect prompt variables" }, { status: 500 });
  }
}
