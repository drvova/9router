import { NextResponse } from "next/server";
import { detectOfficialWarpProxy } from "@/lib/warp/localProxy.js";

export async function POST() {
  const result = await detectOfficialWarpProxy();
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}
