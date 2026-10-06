import { writeFileSync } from "node:fs";
import { LEVELS } from "../src/world/levels/index";
import { analyse } from "../src/world/structure/analyse";
import { structureMarkdown } from "../src/world/structure/markdown";

/**
 * Builds every level through its real builder, runs it through the structure analysis and writes
 * `docs/level-structure.md` (deeper-levels plan, Task 2).
 *
 *   npx vite-node scripts/level-structure.ts          write docs/level-structure.md
 *   npx vite-node scripts/level-structure.ts --print  print it instead
 */
const md = structureMarkdown(LEVELS.map((def, index) => ({ index, name: def.name, s: analyse(def.build()) })));
if (process.argv.includes("--print")) console.log(md);
else { writeFileSync(new URL("../docs/level-structure.md", import.meta.url), md); console.log("wrote docs/level-structure.md"); }
