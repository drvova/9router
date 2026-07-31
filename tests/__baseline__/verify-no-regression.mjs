// Gate: so kết quả test hiện tại với baseline known-fails.
// PASS nếu KHÔNG có test nào pass(baseline) → fail(now). Test mới được phép.
// Usage: node tests/__baseline__/verify-no-regression.mjs <current-results.json>
import { readFileSync } from "fs";
import { fileURLToPath } from "node:url";

// known-fails.txt stores paths repo-root-relative with forward slashes. A results
// file may come from this checkout, from the /app container image, or from another
// root, so resolve in order of specificity instead of assuming one layout. Getting
// this wrong is not a harmless mismatch: every key becomes undefined, nothing can
// match the baseline, and the gate reports every existing failure as a regression.
const ROOT = fileURLToPath(new URL("../../", import.meta.url)).replace(/\\/g, "/");
const relPath = (p) => {
  const s = String(p).replace(/\\/g, "/");
  if (s.startsWith(ROOT)) return s.slice(ROOT.length);
  const app = s.indexOf("/app/");
  if (app !== -1) return s.slice(app + "/app/".length);
  const t = s.lastIndexOf("/tests/");
  return t !== -1 ? s.slice(t + 1) : s;
};

const knownFails = new Set(
  readFileSync(new URL("./known-fails.txt", import.meta.url), "utf8")
    .split("\n").map(s => s.trim()).filter(Boolean)
);

const resultsPath = process.argv[2];
if (!resultsPath) { console.error("Missing results.json path"); process.exit(2); }

const r = JSON.parse(readFileSync(resultsPath, "utf8"));
const nowFails = r.testResults.flatMap(f =>
  f.assertionResults.filter(a => a.status === "failed")
    .map(a => relPath(f.name) + " :: " + a.fullName)
);

// Regression = fail bây giờ NHƯNG không có trong baseline known-fails
const regressions = nowFails.filter(f => !knownFails.has(f));

// Zero overlap between a non-empty baseline and a non-empty failure set means the
// keys are not comparable — a harness/path problem masquerading as mass regression.
if (nowFails.length && knownFails.size && !nowFails.some(f => knownFails.has(f))) {
  console.error(`\n⚠  HARNESS MISMATCH: ${nowFails.length} failures, ${knownFails.size} baseline entries, 0 overlap.`);
  console.error(`   The keys are not comparable, so regressions cannot be judged. Example key built:`);
  console.error(`     ${nowFails[0]}`);
  console.error(`   Expected shape (from known-fails.txt):`);
  console.error(`     ${[...knownFails][0]}`);
  process.exit(2);
}

if (regressions.length) {
  console.error(`\n❌ REGRESSION: ${regressions.length} test pass→fail:\n`);
  regressions.forEach(f => console.error("  - " + f));
  process.exit(1);
}
console.log(`✅ No regression. (now fails=${nowFails.length}, baseline known=${knownFails.size}, all known)`);
