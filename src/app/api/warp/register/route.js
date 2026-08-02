import { NextResponse } from "next/server";
import { createProxyPool } from "@/models";
import { registerWarpProfile } from "@/lib/warp/manager.js";

export async function POST(request) {
  try {
    const body = await request.json();
    const jwt = typeof body?.jwt === "string" ? body.jwt.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "Cloudflare WARP";
    const deviceName = typeof body?.deviceName === "string" ? body.deviceName.trim() : "9Router";
    if (!jwt) return NextResponse.json({ error: "Cloudflare Zero Trust team token is required" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const encryptedProfile = await registerWarpProfile({ jwt, deviceName, acceptTos: body?.acceptTos === true });
    const proxyPool = await createProxyPool({
      name,
      type: "warp",
      encryptedProfile,
      proxyUrl: "",
      noProxy: "",
      strictProxy: true,
      isActive: true,
    });
    const { encryptedProfile: _, ...safePool } = proxyPool;
    return NextResponse.json({ proxyPool: safePool }, { status: 201 });
  } catch (error) {
    console.error("WARP registration failed:", error?.message || error);
    return NextResponse.json({ error: "Cloudflare WARP enrollment failed" }, { status: 502 });
  }
}
