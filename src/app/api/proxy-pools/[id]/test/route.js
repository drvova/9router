import { NextResponse } from "next/server";
import { getProxyPoolById, updateProxyPool } from "@/models";
import { testProxyUrl } from "@/lib/network/proxyTest";
import { startWarpEgress } from "@/lib/warp/manager.js";
import { fetch as undiciFetch } from "undici";

async function testVercelRelay(relayUrl, timeoutMs = 10000) {
  const controller = new AbortController();
  const startedAt = Date.now();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await undiciFetch(relayUrl, {
      method: "GET",
      headers: {
        "x-relay-target": "https://httpbin.org",
        "x-relay-path": "/get",
      },
      signal: controller.signal,
    });
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err?.name === "AbortError" ? "Relay test timed out" : (err?.message || String(err)),
    };
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/proxy-pools/[id]/test - Test proxy pool entry
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const proxyPool = await getProxyPoolById(id);

    if (!proxyPool) {
      return NextResponse.json({ error: "Proxy pool not found" }, { status: 404 });
    }
    const isWarp = proxyPool.type === "warp";
    if (isWarp && !proxyPool.encryptedProfile) {
      return NextResponse.json({ error: "WARP proxy pool has no profile — re-enter the WARP profile in the pool settings" }, { status: 400 });
    }

    let result;
    if (proxyPool.type === "vercel" || proxyPool.type === "cloudflare" || proxyPool.type === "deno") {
      result = await testVercelRelay(proxyPool.proxyUrl);
    } else if (isWarp) {
      const proxyUrl = await startWarpEgress(proxyPool.id, proxyPool.encryptedProfile);
      result = await testProxyUrl({ proxyUrl });
      if (!result.ok) {
        for (let i = 0; i < 2; i++) {
          await new Promise((r) => setTimeout(r, 3000));
          result = await testProxyUrl({ proxyUrl });
          if (result.ok) break;
        }
      }
    } else {
      result = await testProxyUrl({ proxyUrl: proxyPool.proxyUrl });
    }
    const now = new Date().toISOString();

    await updateProxyPool(id, {
      testStatus: result.ok ? "active" : "error",
      lastTestedAt: now,
      lastError: result.ok ? null : (result.error || `Proxy test failed with status ${result.status}`),
      isActive: result.ok,
    });

    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      statusText: result.statusText || null,
      error: result.error || null,
      elapsedMs: result.elapsedMs || 0,
      testedAt: now,
    });
  } catch (error) {
    console.log("Error testing proxy pool:", error);
    return NextResponse.json({ error: "Failed to test proxy pool" }, { status: 500 });
  }
}
