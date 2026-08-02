import path from "node:path";
import net from "node:net";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { DATA_DIR } from "@/lib/dataDir.js";
import { decryptWarpProfile } from "./profileCrypto.js";

const runtimes = new Map();
const READY_TIMEOUT_MS = 15000;

function helperPath() {
  return process.env.NINE_ROUTER_WARP_EGRESS || path.join(process.cwd(), "warp-egress", "warp-egress");
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

export async function startWarpEgress(profileId, encryptedProfile) {
  if (runtimes.has(profileId)) return runtimes.get(profileId).proxyUrl;
  const profilePath = path.join(DATA_DIR, "warp", `${profileId}.json`);
  const fs = await import("node:fs/promises");
  await fs.mkdir(path.dirname(profilePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(profilePath, JSON.stringify(decryptWarpProfile(encryptedProfile)), { mode: 0o600 });
  const port = nextPort();
  const child = spawn(helperPath(), ["--config", profilePath, "--bind", "127.0.0.1", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"], env: process.env });
  child.stderr?.on("data", (data) => console.error(`[WARP] ${data.toString().trim()}`));
  try {
    await waitReady(child, port);
  } catch (error) {
    child.kill("SIGTERM");
    await fs.unlink(profilePath).catch(() => {});
    throw error;
  }
  await fs.unlink(profilePath).catch(() => {});
  const runtime = { child, port, proxyUrl: `http://127.0.0.1:${port}` };
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
