import { WEAPON_ART } from "../src/render/viewmodel/arts";
import { renderWeapon } from "../src/render/viewmodel/rig";
import { Raster, RW, RH } from "../src/render/viewmodel/raster";
import { restPose } from "../src/render/viewmodel/pose";

const r = new Raster();
function topAt(slot: number): number {
  renderWeapon(r, WEAPON_ART[slot], restPose(), RW / 2, 110);
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) if (r.col[y * RW + x]) return y - 20;
  return 999;
}
const TARGET = Number(process.argv[2] ?? 122);
const X: number[] = [0.085, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05];
for (const z of [0.42, 0.5, 0.55]) {
  const out: string[] = [];
  WEAPON_ART.forEach((art, slot) => {
    art.hold.x = X[slot]; art.hold.z = z;
    let lo = -0.6, hi = 0.0;   // y: top gets lower as y goes more negative
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; art.hold.y = mid; if (topAt(slot) < TARGET) hi = mid; else lo = mid; }
    out.push(`${slot}:y=${((lo + hi) / 2).toFixed(3)}(grip ${(170 * -(lo + hi) / 2 / z).toFixed(0)}px)`);
  });
  console.log(`z=${z}  ` + out.join("  "));
}
