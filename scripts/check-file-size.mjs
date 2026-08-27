import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const LIMIT = 400;
const ROOT = "src";

/**
 * Exempt while the port is in progress; a burn-down prints below for
 * whatever this holds. Empty since Plan 0F Task 4 deleted `src/legacy.js`,
 * the last file it ever held — the port is complete, and the 400-line limit
 * now applies to every file in `src/` with no exceptions.
 */
const EXEMPT = new Set([]);

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name).split("\\").join("/");
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|js)$/.test(name)) out.push(p);
  }
  return out;
}

// Counts newline characters, matching `wc -l`'s definition of a line count
// rather than `split("\n").length`, which over-counts by one for any file
// ending in a trailing newline (the common case) — e.g. legacy.js reported
// 2225 here where `wc -l` said 2224. That one-line phantom once pushed an
// implementer into truncating a real source file to make a reported number
// match a figure in a planning document; this must track the same tool
// every human on the project reaches for to sanity-check it.
const lineCount = (p) => (readFileSync(p, "utf8").match(/\n/g) ?? []).length;

const files = walk(ROOT);
const offenders = files.filter((p) => !EXEMPT.has(p) && lineCount(p) > LIMIT);

if (EXEMPT.size === 0) {
  console.log("port burn-down: complete — src/legacy.js is gone, nothing in src/ is exempt");
} else {
  for (const p of EXEMPT) {
    if (existsSync(p)) console.log(`port burn-down: ${p} = ${lineCount(p)} lines remaining`);
  }
}

if (offenders.length > 0) {
  console.error(`\nFiles over ${LIMIT} lines:`);
  for (const p of offenders) console.error(`  ${lineCount(p)}\t${p}`);
  process.exit(1);
}

console.log(`file-size gate OK — ${files.length} files checked, limit ${LIMIT}`);
