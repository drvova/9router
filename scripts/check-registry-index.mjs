// Guard: open-sse/providers/registry/index.js must stay consistent with the files
// beside it. That file is hand-maintained despite its "Auto-generated" header, and
// it is the only thing that makes a provider reachable: PROVIDERS is built solely
// from its export array. A provider file that exists on disk but is missing from
// the import list does not fail, it silently does not exist. Devin CLI shipped
// that way and was dead code for four days.
//
//   node scripts/check-registry-index.mjs
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "open-sse/providers/registry");
const src = readFileSync(join(dir, "index.js"), "utf8");

const onDisk = new Set(
  readdirSync(dir)
    .filter((f) => f.endsWith(".js") && f !== "index.js")
    .map((f) => f.slice(0, -3))
);

const active = [...src.matchAll(/^import (p\d+) from "\.\/(.+)\.js";$/gm)].map((m) => ({ id: m[1], mod: m[2] }));
// Commented-out imports are the documented way to keep a provider on disk but out
// of the registry, so they count as deliberate rather than missing.
const hidden = [...src.matchAll(/^\/\/\s*import (p\d+) from "\.\/(.+)\.js";$/gm)].map((m) => ({ id: m[1], mod: m[2] }));
const exported = new Set([...src.matchAll(/^ {2}(p\d+),$/gm)].map((m) => m[1]));

const list = (xs) => xs.join(", ");
const problems = [];

const declared = new Set([...active, ...hidden].map((i) => i.mod));
const orphans = [...onDisk].filter((m) => !declared.has(m)).sort();
if (orphans.length) {
  problems.push(
    `${orphans.length} provider file(s) exist but are absent from index.js, so they never reach PROVIDERS: ${list(orphans)}` +
      `\n    fix: in index.js add an 'import pN from "./<name>.js";' line and a matching 'pN,' entry in the export array`
  );
}

const dangling = [...active, ...hidden].filter((i) => !onDisk.has(i.mod));
if (dangling.length) {
  problems.push(`index.js references ${dangling.length} module(s) with no file on disk: ${list(dangling.map((d) => d.mod))}`);
}

const unexported = active.filter((i) => !exported.has(i.id));
if (unexported.length) {
  problems.push(
    `${unexported.length} import(s) are missing from the export array, so they load but register nothing: ` +
      list(unexported.map((i) => `${i.id} (${i.mod})`))
  );
}

// A commented import whose symbol is still live in the array throws at import time.
const ghosts = hidden.filter((i) => exported.has(i.id));
if (ghosts.length) {
  problems.push(
    `${ghosts.length} entr(ies) are commented out of the imports but still listed in the export array, ` +
      `which throws a ReferenceError on load: ` +
      list(ghosts.map((i) => `${i.id} (${i.mod})`))
  );
}

const seen = new Map();
for (const i of active) seen.set(i.mod, (seen.get(i.mod) || 0) + 1);
const twice = [...seen].filter(([, n]) => n > 1).map(([m]) => m);
if (twice.length) {
  problems.push(`module(s) imported more than once, double-registering the provider: ${list(twice)}`);
}

if (problems.length) {
  console.error("registry/index.js is INCONSISTENT with open-sse/providers/registry/:");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log(
  `registry/index.js consistent (${active.length} active, ${hidden.length} deliberately hidden` +
    `${hidden.length ? ` [${list(hidden.map((h) => h.mod))}]` : ""}, ${onDisk.size} files on disk).`
);
