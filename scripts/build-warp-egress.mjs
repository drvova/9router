#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "warp-egress");
const output = path.join(root, "dist", "warp-egress");
const targets = [
  ["linux", "amd64", "warp-egress-linux-amd64"],
  ["linux", "arm64", "warp-egress-linux-arm64"],
  ["linux", "386", "warp-egress-linux-386"],
  ["linux", "arm", "warp-egress-linux-arm"],
  ["linux", "ppc64le", "warp-egress-linux-ppc64le"],
  ["linux", "s390x", "warp-egress-linux-s390x"],
  ["darwin", "amd64", "warp-egress-darwin-amd64"],
  ["darwin", "arm64", "warp-egress-darwin-arm64"],
  ["windows", "amd64", "warp-egress-windows-amd64.exe"],
];

fs.mkdirSync(output, { recursive: true });
for (const [goos, goarch, name] of targets) {
  const destination = path.join(output, name);
  execFileSync("go", ["build", "-trimpath", "-ldflags=-s -w", "-o", destination, "."], {
    cwd: source,
    stdio: "inherit",
    env: { ...process.env, GOOS: goos, GOARCH: goarch, CGO_ENABLED: "0", GOTOOLCHAIN: "auto" },
  });
  if (goos !== "windows") fs.chmodSync(destination, 0o755);
}

const checksums = targets.map(([, , name]) => {
  const file = path.join(output, name);
  const digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  return `${digest}  ${name}`;
}).join("\n") + "\n";
fs.writeFileSync(path.join(output, "SHA256SUMS"), checksums);
console.log(`Built ${targets.length} WARP helper targets in ${path.relative(root, output)}`);
