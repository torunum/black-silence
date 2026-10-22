import { describe, expect, it } from "vitest";
import { WEAPON_ART } from "../../src/render/viewmodel/arts";
import { Animator } from "../../src/render/viewmodel/animate";
import { WEAPON_STATS } from "../../src/weapons/definitions";

/** The owner, 2026-10-20: "silah reload vs animasyonlarında sorun var gibi" — the reloads worked below the bottom of the screen. */
describe("a reload is brought up into view", () => {
  const still = { vx: 0, vz: 0, vy: 0, grounded: true, yaw: 0, bobT: 0, swayX: 0, swayY: 0, sprintKey: false, kickAmt: 0, muzzle: 0,
    equipT: 0.3, unequipT: 0.2, kickAnim: 0, cueHurt: 0, cueHurtAmt: 0, cuePickup: 0, cueDryFire: 0, cueInput: 0, paused: false };
  WEAPON_ART.forEach((art, slot) => {
    if (!art.present) return;   // dynamite reloads in view already
    it(`${art.name}: up and back again — raised mid-reload, exactly at rest at its ends`, () => {
      const w = WEAPON_STATS[slot];
      const at = (wstate: string, wtime: number) => new Animator().step(0.016, 0, { ...still, cur: slot, wstate, wtime } as never, w, art);
      const rest = at("idle", 0), mid = at("reload", w.reload * 0.5), start = at("reload", 0), end = at("reload", w.reload);
      expect(mid.y - rest.y).toBeCloseTo(art.present!.y, 6);
      expect(mid.pitch - rest.pitch).toBeCloseTo(art.present!.pitch, 6);
      for (const p of [start, end]) { expect(p.y).toBeCloseTo(rest.y, 9); expect(p.roll).toBeCloseTo(rest.roll, 9); }
    });
  });
});
