import { LEVELS } from "../src/world/levels/index";
import { analyse } from "../src/world/structure/analyse";
import { findAll } from "../src/world/analysis";
import { checkTargets } from "../src/world/structure/targets";
import { measureLevel } from "../src/world/density";

const idx = Number(process.argv[2] ?? 2);
const L = LEVELS[idx].build();
const roster: Record<string, number> = {};
const all = new Set<string>();
for (const row of L.g) for (const c of row) { all.add(c); if (/[a-zA-Z0-9]/.test(c)) roster[c] = (roster[c] || 0) + 1; }
console.log("glyph counts", JSON.stringify(roster));
console.log("lights", measureLevel(L).lights, "W,H", L.W, L.H);
const s = analyse(L);
console.log(JSON.stringify({ ...s, critical: { ...s.critical, cells: undefined }, encounters: undefined }, null, 1));
for (const e of s.encounters) console.log(`enc ${e.kind} x${e.x0}-${e.x1} z${e.z0}-${e.z1} cells ${e.cells} n ${e.enemies} boss ${e.bosses} hp ${e.hp}+${e.bossHp} supply ${Math.round(e.supply)} health ${e.health} armour ${e.armour} ratio ${e.ratio.toFixed(2)}`);
void findAll;
console.log("TARGETS:", JSON.stringify(checkTargets(idx, s), null, 1));
if (process.argv[3] === "map") {
  const path = new Set(s.critical.cells.map((c) => `${c.x},${c.z}`));
  console.log("    " + Array.from({ length: L.W }, (_, i) => i % 10).join(""));
  L.g.forEach((row, z) => console.log(String(z).padStart(3) + " " + row.map((c, x) => (c === "." ? (path.has(`${x},${z}`) ? "*" : (L.hmap?.[z][x] ?? 0) >= 3 ? "^" : (L.hmap?.[z][x] ?? 0) >= 2 ? "u" : (L.hmap?.[z][x] ?? 0) > 1.19 ? " " : "_") : c)).join("")));
}
