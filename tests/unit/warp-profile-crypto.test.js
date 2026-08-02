import { describe, expect, it, beforeEach } from "vitest";

const profile = {
  private_key: "private",
  endpoint_v4: "162.159.198.1",
  endpoint_pub_key: "public",
};

describe("WARP profile encryption", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "warp-test-secret";
  });

  it("round trips a valid profile", async () => {
    const { encryptWarpProfile, decryptWarpProfile } = await import("../../src/lib/warp/profileCrypto.js");
    const encrypted = encryptWarpProfile(profile);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptWarpProfile(encrypted)).toEqual(profile);
  });

  it("rejects tampering and incomplete profiles", async () => {
    const { encryptWarpProfile, decryptWarpProfile } = await import("../../src/lib/warp/profileCrypto.js");
    expect(() => encryptWarpProfile({ private_key: "only" })).toThrow("Invalid WARP profile");
    expect(() => decryptWarpProfile("v1:bad.value.data")).toThrow();
  });
});
