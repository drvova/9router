import { NextResponse } from "next/server";
import { collectTemplateVariables } from "open-sse/rtk/promptTemplate.js";

export const dynamic = "force-dynamic";

// POST /api/prompt-variables - list the variable names a prompt template consumes.
// Server-side because detection parses the template with the same engine that renders
// it, which is the only way to see names used solely inside {% %} blocks; a regex over
// {{ }} in the browser would miss them, and shipping the engine to the client to avoid
// one request would cost far more than the request.
export async function POST(request) {
  try {
    const { template, mode } = await request.json();

    if (typeof template !== "string") {
      return NextResponse.json({ error: "template must be a string" }, { status: 400 });
    }
    if (mode !== undefined && mode !== "jinja" && mode !== "substitute") {
      return NextResponse.json({ error: 'mode must be "jinja" or "substitute"' }, { status: 400 });
    }

    const variables = collectTemplateVariables(template, mode || "jinja");
    // Count of {% %} blocks: jinja evaluates these away, substitute passes them
    // through. An upstream that inspects the prompt it receives can reject the
    // evaluated form, so the editor needs the count to warn before a request fails.
    const controlBlocks = (template.match(/\{%/g) || []).length;
    return NextResponse.json({ variables, controlBlocks });
  } catch (error) {
    console.log("Error detecting prompt variables:", error);
    return NextResponse.json({ error: "Failed to detect prompt variables" }, { status: 500 });
  }
}
