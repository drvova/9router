import { NextResponse } from "next/server";
import { createProxyPool } from "@/models";
import { detectOfficialWarpProxy } from "@/lib/warp/localProxy.js";

export async function POST(request) {
  try {
    const result = await detectOfficialWarpProxy();
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const pool = await createProxyPool({
      name: typeof body?.name === "string" && body.name.trim() ? body.name.trim() : "Cloudflare WARP (official)",
      type: "http",
      proxyUrl: result.proxyUrl,
      noProxy: "",
      strictProxy: true,
      isActive: true,
    });
    return NextResponse.json({ proxyPool: pool, warp: result.warp, colo: result.colo }, { status: 201 });
  } catch (error) {
    console.error("Official WARP proxy setup failed:", error?.message || error);
    return NextResponse.json({ error: "Official WARP proxy setup failed" }, { status: 502 });
  }
}
