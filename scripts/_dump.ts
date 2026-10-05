import { LEVELS } from "../src/world/levels/index";
import { analyse } from "../src/world/structure/analyse";
import { checkTargets } from "../src/world/structure/targets";

const idx = Number(process.argv[2] ?? 1);
const L = LEVELS[idx].build();
const s = analyse(L);
const path = new Set(s.critical.cells.map((c) => c.x + "," + c.z));
const rows: string[] = [];
const hm = L.hmap;
for (let z = 0; z < L.H; z++) {
  let r = String(z).padStart(2) + " ";
  for (let x = 0; x < L.W; x++) {
    const c = L.g[z][x];
    if (process.argv.includes("--path") && path.has(x + "," + z) && c === ".") r += "*";
    else if (process.argv.includes("--h") && c === "." && hm) { const h = hm[z][x]; r += h === 0 ? "." : h < 1.5 ? (h < 1.2 ? "o" : "1") : h < 2.4 ? "u" : "2"; }
    else r += c;
  }
  rows.push(r);
}
console.log("   " + Array.from({ length: L.W }, (_, i) => i % 10).join(""));
console.log(rows.join("\n"));
const { critical, ...rest } = s as any;
console.log(JSON.stringify({ ...rest, encounters: undefined, checkpoints: s.checkpoints, critical: { length: critical.length, keyRequired: critical.keyRequired, keyLeg: critical.keyLeg, detour: critical.detour } }, null, 0));
console.log("problems", s.problems);
console.log("targets", checkTargets(idx, s));
for (const e of s.encounters) console.log(`enc ${e.kind} x${e.x0}-${e.x1} z${e.z0}-${e.z1} cells ${e.cells} n ${e.enemies} bosses ${e.bosses} hp ${e.hp}+${e.bossHp} supply ${Math.round(e.supply)} ratio ${e.ratio.toFixed(2)} health ${e.health} armour ${e.armour}`);
