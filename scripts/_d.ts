import { LEVELS } from "../src/world/levels/index";
import { measureLevel } from "../src/world/density";
import { PIECES } from "../src/world/decor/registry";
import { massCells } from "../src/world/decor/masses";

const i = Number(process.argv[2] ?? 2);
const L = LEVELS[i].build();
const d = measureLevel(L);
console.log("walkable", d.walkable, "bare", d.bareCells, (d.bareCells / d.walkable).toFixed(3), "emptiest", d.emptiest, "longest", d.longestRun, "pickups", d.pickupsTotal, "decor", d.decor, "lights", d.lights);
console.log("decor kinds", JSON.stringify(d.decorByKind));
const masses = L.decor!.filter((s) => PIECES[s.k]?.mass).map((s) => `${s.k}@${massCells(s).map((c) => c.join(",")).join("/")}`);
console.log("masses", masses.length, masses.join(" "));
void d.map;
if (process.argv[3] === "bare") console.log(d.map);
