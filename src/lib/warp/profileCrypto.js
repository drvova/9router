import crypto from "node:crypto";

const PREFIX = "v1:";

function key() {
  const secret = process.env.JWT_SECRET || process.env.API_KEY_SECRET;
  if (!secret) throw new Error("JWT_SECRET or API_KEY_SECRET is required for WARP profile encryption");
  return crypto.createHash("sha256").update(secret).digest();
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
