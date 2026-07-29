import { NextResponse } from "next/server";
import { getClientHeaderCapture, clearClientHeaderCapture } from "@/lib/headerCapture";
import { templatiseHeaders, formatKeyValueLines } from "@/shared/utils";

export const dynamic = "force-dynamic";

// GET /api/provider-nodes/[id]/captured-headers
// Headers observed arriving from a client for this provider, already turned into a
// template so the identifiers regenerate per request instead of repeating the snapshot.
export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const capture = getClientHeaderCapture(id);
    if (!capture) return NextResponse.json({ capture: null });

    const { headers, replaced } = templatiseHeaders(capture.headers);
    return NextResponse.json({
      capture: {
        at: capture.at,
        count: Object.keys(headers).length,
        lines: formatKeyValueLines(headers),
        replaced,
      },
    });
  } catch (error) {
    console.log("Error reading captured headers:", error);
    return NextResponse.json({ error: "Failed to read captured headers" }, { status: 500 });
  }
}

// DELETE — discard the capture so the prompt stops offering it.
export async function DELETE(_request, { params }) {
  const { id } = await params;
  return NextResponse.json({ cleared: clearClientHeaderCapture(id) });
}
