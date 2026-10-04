import { readFileSync, writeFileSync } from "node:fs";
import { LEVELS } from "../src/world/levels/index";
import { densityMarkdown, measureLevel, type Baseline } from "../src/world/density";

/**
 * Builds every level through its real builder and writes the density table
 * (`docs/level-density.md`) — the baseline for "the levels feel very empty".
 *
 *   npx vite-node scripts/level-density.ts          write docs/level-density.md
 *   npx vite-node scripts/level-density.ts --print  print it instead
 *
 * vite-node rather than plain node because the builders are TypeScript with
 * extensionless imports; it ships with vitest and needs no test run.
 */
const rows = LEVELS.map((def, i) => ({ name: (i === 0 ? "0 " : "") + def.name.replace(/^LEVEL (\d) — /, "$1 · ").replace(/^PROLOGUE — /, "prologue · "), d: measureLevel(def.build()) }));
// the numbers from before any level was dressed (commit 64b4e8d, measured with that commit's own code): printed beside the current ones
const baseline = JSON.parse(readFileSync(new URL("../docs/level-density-baseline.json", import.meta.url), "utf8")) as Baseline;
const md = densityMarkdown(rows, baseline);
if (process.argv.includes("--print")) console.log(md);
else { writeFileSync(new URL("../docs/level-density.md", import.meta.url), md); console.log("wrote docs/level-density.md"); }
