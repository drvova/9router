import { NextResponse } from "next/server";
import { createProxyPool } from "@/models";
import { registerWarpProfile } from "@/lib/warp/manager.js";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Cloudflare Free WARP";
    const encryptedProfile = await registerWarpProfile({ deviceName: body?.deviceName || "9Router", acceptTos: body?.acceptTos === true });
    const pool = await createProxyPool({ name, type: "warp", encryptedProfile, proxyUrl: "", noProxy: "", strictProxy: true, isActive: true });
    const { encryptedProfile: _, ...safePool } = pool;
    return NextResponse.json({ proxyPool: safePool }, { status: 201 });
  } catch (error) {
    console.error("Free WARP activation failed:", error?.message || error);
    return NextResponse.json({ error: "Free WARP activation failed" }, { status: 502 });
  }
}
