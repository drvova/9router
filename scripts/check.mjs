// Repo Preflight Monitor — one command that fails when a derived artifact has
// drifted from its source of truth.
//
//   node scripts/check.mjs        (or: npm run check)
//
// Scope is deliberately narrow: derived-artifact drift only. That is the failure
// class this repo actually suffers from — 62 of 78 registry-touching commits
// shipped without regenerating providers-baseline.json, and provider icons and
// registry entries have repeatedly gone live unreachable because a hand-run
// generator was skipped.
//
// Every check here is READ-ONLY by construction and the run is verified
// side-effect-free at the end, because a preflight that dirties the working tree
// trains people to ignore it.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Node prints this on every .mjs that imports untyped ESM from this package; it
// drowns real output and says nothing about correctness.
const NOISE = /MODULE_TYPELESS_PACKAGE_JSON|Reparsing as ES module|add "type": "module"|--trace-warnings|^\(Use `node/;
const clean = (s) =>
  (s || "")
    .split("\n")
    .filter((l) => l.trim() && !NOISE.test(l))
    .join("\n");

const CHECKS = [
  {
    name: "provider icon map",
    artifact: "src/shared/utils/providerIconFiles.js",
    argv: ["scripts/gen-provider-icons.mjs", "--check"],
    fix: "node scripts/gen-provider-icons.mjs",
  },
  {
    name: "providers baseline",
    artifact: "tests/__baseline__/providers-baseline.json",
    argv: ["tests/__baseline__/verify-providers.mjs"],
    fix: "node tests/__baseline__/snapshot-providers.mjs",
  },
  {
    name: "alias baseline",
    artifact: "tests/__baseline__/alias-baseline.json",
    argv: ["tests/__baseline__/verify-alias.mjs"],
    fix: "node tests/__baseline__/verify-alias.mjs --snapshot",
  },
  {
    name: "oauth url baseline",
    artifact: "tests/__baseline__/oauth-urls-baseline.json",
    argv: ["tests/__baseline__/verify-oauth-urls.mjs"],
    fix: "node tests/__baseline__/verify-oauth-urls.mjs --snapshot",
  },
];

const gitTree = () => {
  const r = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout : null;
};

const before = gitTree();
const failures = [];

console.log("Preflight — derived-artifact drift\n");

for (const check of CHECKS) {
  const r = spawnSync(process.execPath, check.argv, { cwd: root, encoding: "utf8" });
  const detail = clean(`${r.stdout}\n${r.stderr}`);
  if (r.status === 0) {
    console.log(`  PASS  ${check.name}`);
    continue;
  }
  console.log(`  FAIL  ${check.name}  (${check.artifact})`);
  failures.push({ ...check, detail, code: r.status });
}

if (failures.length) {
  console.log(`\n${"-".repeat(72)}`);
  for (const f of failures) {
    console.log(`\nFAIL  ${f.name}`);
    console.log(`  artifact: ${f.artifact}`);
    if (f.detail) console.log(f.detail.split("\n").map((l) => `  ${l}`).join("\n"));
    console.log(`  regenerate with: ${f.fix}`);
  }
}

// A checker that mutates the tree it is checking cannot be trusted twice.
const after = gitTree();
if (before !== null && after !== null && before !== after) {
  console.error("\nPREFLIGHT BUG: a check modified the working tree. Diff of git status:");
  console.error(`  before:\n${before.trim() || "    (clean)"}`);
  console.error(`  after:\n${after.trim() || "    (clean)"}`);
  process.exit(2);
}

if (failures.length) {
  console.log(`\n${failures.length} of ${CHECKS.length} checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${CHECKS.length} checks passed.`);
