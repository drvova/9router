// Regression: createProxyPool silently dropped extra fields like
// encryptedProfile, so WARP pools created via POST /api/proxy-pools,
// /api/warp/register, /api/warp/free/register could never be tested
// (startWarpEgress got undefined → "Invalid encrypted WARP profile").
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
let tempDir;
let db;

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-warp-pool-"));
  process.env.DATA_DIR = tempDir;
  vi.resetModules();
  db = await import("@/lib/db/index.js");
  await db.initDb();
});

afterAll(() => {
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
});

describe("WARP proxy pool persistence", () => {
  it("createProxyPool persists encryptedProfile (regression: was dropped)", async () => {
    const pool = await db.createProxyPool({
      name: "warp-test",
      type: "warp",
      encryptedProfile: "v1:abc.def.ghi",
      proxyUrl: "",
      noProxy: "",
      strictProxy: true,
      isActive: true,
    });
    expect(pool.encryptedProfile).toBe("v1:abc.def.ghi");

    const round = await db.getProxyPoolById(pool.id);
    expect(round.type).toBe("warp");
    expect(round.encryptedProfile).toBe("v1:abc.def.ghi");
  });

  it("non-warp pool without a profile still round-trips", async () => {
    const pool = await db.createProxyPool({ name: "http-test", type: "http", proxyUrl: "http://127.0.0.1:1" });
    const round = await db.getProxyPoolById(pool.id);
    expect(round.type).toBe("http");
    expect(round.proxyUrl).toBe("http://127.0.0.1:1");
    expect(round.encryptedProfile).toBeUndefined();
  });
});
