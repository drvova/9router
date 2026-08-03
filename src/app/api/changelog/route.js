import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { GITHUB_CONFIG } from "@/shared/constants/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const changelog = await readFile(path.join(process.cwd(), "CHANGELOG.md"), "utf8");
    return new NextResponse(changelog, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
  } catch (error) {
    console.warn("Local changelog unavailable, loading the published copy:", error);
    const response = await fetch(GITHUB_CONFIG.changelogUrl, { cache: "no-store" });
    if (!response.ok) return NextResponse.json({ error: `Failed to load changelog: HTTP ${response.status}` }, { status: 502 });
    return new NextResponse(await response.text(), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
  }
}
