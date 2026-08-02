import { NextResponse } from "next/server";

const TEAM = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const team = typeof body?.team === "string" ? body.team.trim().toLowerCase() : "";
  if (!TEAM.test(team)) {
    return NextResponse.json({ error: "Enter a valid Cloudflare Zero Trust team name" }, { status: 400 });
  }
  return NextResponse.json({
    team,
    authorizationUrl: `https://${team}.cloudflareaccess.com/warp`,
    protocol: "com.cloudflare.warp",
    next: "Complete login in the official Cloudflare WARP client, then return here.",
  });
}
