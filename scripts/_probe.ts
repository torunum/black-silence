import { WEAPON_ART } from "../src/render/viewmodel/arts";
import { renderWeapon } from "../src/render/viewmodel/rig";
import { Raster, RW, RH } from "../src/render/viewmodel/raster";
import { restPose, type Pose } from "../src/render/viewmodel/pose";
import { WEAPON_STATS } from "../src/weapons/definitions";
import { fireWindow } from "../src/render/viewmodel/animate";

const CY = 110, r = new Raster();
function top(pose: Pose, slot: number): { top: number; left: number; right: number; anchors: Record<string, [number, number]> } {
  const anchors = renderWeapon(r, WEAPON_ART[slot], pose, RW / 2, CY);
  let t = RH, l = RW, rr = 0;
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) if (r.col[y * RW + x]) { if (y < t) t = y; if (x < l) l = x; if (x > rr) rr = x; }
  return { top: t - 20, left: l, right: rr, anchors };
}
const f = (n: number) => n.toFixed(1);
const only = process.argv[2] === undefined ? null : Number(process.argv[2]);
WEAPON_ART.forEach((art, slot) => {
  if (only !== null && only !== slot) return;
  const w = WEAPON_STATS[slot];
  const rest = top(restPose(), slot);
  let minTop = rest.top, where = "rest";
  const consider = (name: string, p: Pose) => { const t = top(p, slot).top; if (t < minTop) { minTop = t; where = name; } };
  for (let k = 0; k <= 10; k++) {
    const p = restPose(); p.recoil = w.kick > 0 ? 1 : 0; p.action = art.action(k / 10); p.spin = 0; consider(`fire${k}`, p);
    const q = restPose(); q.recoil = 1 * (1 - k / 10); q.action = art.action(k / 10); consider(`recoil${k}`, q);
  }
  for (let k = 0; k <= 40; k++) { const p = restPose(); p.reload = k / 40; consider(`reload${k}`, p); }
  void fireWindow;
  const a = rest.anchors;
  console.log(`${slot} ${art.name.padEnd(22)} rest top ${f(rest.top)} (h ${f((180 - rest.top) / 1.8)}%) x ${rest.left}-${rest.right}  worst top ${f(minTop)} at ${where}  muzzle ${a.muzzle?.map(f)} bore ${a.bore?.map(f)} rh ${a.rightHand?.map(f)} lh ${a.leftHand?.map(f)}`);
});
