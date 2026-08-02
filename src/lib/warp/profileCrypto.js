import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "@/lib/dataDir.js";

const PREFIX = "v1:";

function loadSecret() {
  const configured = process.env.JWT_SECRET || process.env.API_KEY_SECRET;
  if (configured) return configured;

  const sharedSecretPath = path.join(DATA_DIR, "jwt-secret");
  try {
    const shared = fs.readFileSync(sharedSecretPath, "utf8").trim();
    if (shared) return shared;
  } catch {}

  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const generated = crypto.randomBytes(32).toString("hex");
  const secretPath = path.join(DATA_DIR, "warp-secret");
  try {
    fs.writeFileSync(secretPath, generated, { flag: "wx", mode: 0o600 });
    return generated;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    const existing = fs.readFileSync(secretPath, "utf8").trim();
    if (!existing) throw new Error("WARP encryption secret file is empty");
    return existing;
  }
}

function key() {
  return crypto.createHash("sha256").update(loadSecret()).digest();
}

export function encryptWarpProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile) || !profile.private_key || !profile.endpoint_v4 || !profile.endpoint_pub_key) throw new Error("Invalid WARP profile");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(profile), "utf8"), cipher.final()]);
  return `${PREFIX}${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function decryptWarpProfile(value) {
  if (typeof value !== "string" || !value.startsWith(PREFIX)) throw new Error("Invalid encrypted WARP profile");
  const [iv, ciphertext, tag] = value.slice(PREFIX.length).split(".");
  if (!iv || !ciphertext || !tag) throw new Error("Malformed encrypted WARP profile");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const plain = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]);
  const profile = JSON.parse(plain.toString("utf8"));
  if (!profile.private_key || !profile.endpoint_v4 || !profile.endpoint_pub_key) throw new Error("WARP profile is incomplete");
  return profile;
}
