import path from "node:path";
import fs from "node:fs";
import net from "node:net";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { DATA_DIR } from "@/lib/dataDir.js";
import { decryptWarpProfile, encryptWarpProfile } from "./profileCrypto.js";

const runtimes = new Map();
const starting = new Map();
const READY_TIMEOUT_MS = 15000;

function helperPath(requiredFlag = "") {
  const name = process.platform === "win32" ? "warp-egress.exe" : "warp-egress";
  const target = `${process.platform}-${process.arch}`;
  const candidates = [
    process.env.NINE_ROUTER_WARP_EGRESS,
    path.join(process.cwd(), "dist", "warp-egress", `warp-egress-${target}${process.platform === "win32" ? ".exe" : ""}`),
    path.join(process.cwd(), "cli", "app", "warp-egress", name),
    path.join(process.cwd(), "warp-egress", name),
  ].filter(Boolean);
  const found = candidates.find((candidate) => {
    if (!fs.existsSync(candidate)) return false;
    if (!requiredFlag) return true;
    const result = spawnSync(candidate, ["--help"], { encoding: "utf8", timeout: 5000 });
    return `${result.stdout || ""}${result.stderr || ""}`.includes(requiredFlag);
  });
  if (found) return found;
  throw new Error(`WARP helper is missing required capability ${requiredFlag}. Run \"npm run build:warp\" and restart 9Router (tried: ${candidates.join(", ")})`);
}

function proxyUrl(port, token) {
  const url = new URL(`http://127.0.0.1:${port}`);
  url.username = "9router";
  url.password = token;
  return url.href;
}

function waitReady(child, port) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + READY_TIMEOUT_MS;
    const attempt = () => {
      if (Date.now() >= deadline) return reject(new Error("WARP helper readiness timed out"));
      const socket = net.connect({ host: "127.0.0.1", port });
      socket.once("connect", () => { socket.destroy(); resolve(); });
      socket.once("error", () => { socket.destroy(); setTimeout(attempt, 100); });
    };
    child.once("error", reject);
    child.once("exit", (code) => reject(new Error(`WARP helper exited during startup (${code ?? "unknown"})`)));
    attempt();
  });
}

function nextPort() {
  return 17080 + runtimes.size;
}

export async function registerWarpProfile(input = {}) {
  if (input.jwt !== undefined && typeof input.jwt !== "string") throw new Error("Invalid Cloudflare enrollment token");
  const child = spawn(helperPath("-register-stdin"), ["--register-stdin"], { stdio: ["pipe", "pipe", "pipe"], env: process.env });
  child.stdin.end(JSON.stringify({ jwt: input.jwt, device_name: input.deviceName || "9Router", accept_tos: input.acceptTos === true }));
  const [stdout, stderr] = await Promise.all([
    collect(child.stdout),
    collect(child.stderr),
  ]);
  const [code] = await once(child, "exit");
  if (code !== 0) throw new Error(stderr.trim() || `WARP registration failed (${code})`);
  const profile = JSON.parse(stdout);
  return encryptWarpProfile(profile);
}

async function collect(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

export async function startWarpEgress(profileId, encryptedProfile) {
  if (runtimes.has(profileId)) return runtimes.get(profileId).proxyUrl;
  if (starting.has(profileId)) return starting.get(profileId);
  const promise = startWarpEgressInternal(profileId, encryptedProfile);
  starting.set(profileId, promise);
  try { return await promise; } finally { starting.delete(profileId); }
}

async function startWarpEgressInternal(profileId, encryptedProfile) {
  const profilePath = path.join(DATA_DIR, "warp", `${profileId}.json`);
  const fs = await import("node:fs/promises");
  await fs.mkdir(path.dirname(profilePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(profilePath, JSON.stringify(decryptWarpProfile(encryptedProfile)), { mode: 0o600 });
  const port = nextPort();
  const token = crypto.randomUUID().replaceAll("-", "");
  const child = spawn(helperPath(), ["--config", profilePath, "--bind", "127.0.0.1", "--port", String(port), "--token", token], { stdio: ["ignore", "pipe", "pipe"], env: process.env });
  child.stderr?.on("data", (data) => console.error(`[WARP] ${data.toString().trim()}`));
  try { await waitReady(child, port); } catch (error) {
    child.kill("SIGTERM");
    await fs.unlink(profilePath).catch(() => {});
    throw error;
  }
  await fs.unlink(profilePath).catch(() => {});
  const runtime = { child, port, proxyUrl: proxyUrl(port, token) };
  runtimes.set(profileId, runtime);
  child.once("exit", () => { if (runtimes.get(profileId) === runtime) runtimes.delete(profileId); });
  return runtime.proxyUrl;
}

export async function stopWarpEgress(profileId) {
  const runtime = runtimes.get(profileId);
  if (!runtime) return false;
  runtime.child.kill("SIGTERM");
  await Promise.race([once(runtime.child, "exit"), new Promise((resolve) => setTimeout(resolve, 3000))]);
  runtimes.delete(profileId);
  return true;
}

export async function stopAllWarpEgress() {
  await Promise.all([...runtimes.keys()].map(stopWarpEgress));
}
