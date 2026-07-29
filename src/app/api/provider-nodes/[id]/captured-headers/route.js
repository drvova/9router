import { NextResponse } from "next/server";
import { getClientHeaderCapture, clearClientHeaderCaptures } from "@/lib/headerCapture";
import { templatiseHeaders, formatKeyValueLines, wrapControlBlocks } from "@/shared/utils";

export const dynamic = "force-dynamic";

// GET /api/provider-nodes/[id]/captured-headers
// The best client header set to offer this node, already templated so the identifiers
// regenerate per request instead of repeating one snapshot. Falls back to the most
// recent capture from any provider: a client's header set is a property of the client,
// so a node that has never been sent traffic can still be configured from one.
export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const capture = getClientHeaderCapture(id);
    if (!capture) return NextResponse.json({ capture: null });

    const { headers, replaced } = templatiseHeaders(capture.headers);
    return NextResponse.json({
      capture: {
        at: capture.at,
        exact: capture.exact,
        fromProvider: capture.provider,
        count: Object.keys(headers).length,
        lines: formatKeyValueLines(headers),
        replaced,
        // Wrapped on the way out: the captured prompt is Jinja source, and rendering it
        // would strip the very blocks a prompt gate checks for.
        systemPrompt: capture.systemPrompt ? wrapControlBlocks(capture.systemPrompt) : null,
        systemPromptChars: capture.systemPrompt?.length || 0,
      },
    });
  } catch (error) {
    console.log("Error reading captured headers:", error);
    return NextResponse.json({ error: "Failed to read captured headers" }, { status: 500 });
  }
}

// DELETE — discard every capture so the button stops offering stale sets.
export async function DELETE() {
  return NextResponse.json({ cleared: clearClientHeaderCaptures() });
}
