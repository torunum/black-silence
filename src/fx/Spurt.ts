import { at } from "../audio/AudioEngine";
import { spurtPulse } from "../audio/sounds/gore";
import { viewYaw } from "../render/ViewYaw";
import { goutFx } from "./GoreDrops";
import { bloodFx } from "./ImpactFx";
import { splatFloor } from "./Splats";
import { fxr, fxRange } from "./FxRand";
import { floorHeightAt } from "../world/Collision";

/**
 * A STUMP THAT SPURTS — the neck of a headless body, the shoulder of a torn
 * arm, the hip of a body without its legs
 * (`docs/superpowers/plans/2026-10-08-impact.md`, Task 3). The heart keeps
 * beating for a few seconds: the stump throws a gout of blood up and out in
 * pulses, a little further apart and a little weaker each time, with a thin
 * trickle between them, and the body's own sprite carries the fountain with
 * it as it stumbles and falls.
 *
 * - **Budget**: `SPURT_MAX` 12 at once (a thirteenth takes the oldest's
 *   slot), one record each, made once; the tick allocates nothing.
 * - **Lasts**: a neck 2.8 s, a limb 1.8 s; the pulse interval grows from
 *   .32 to .62 s as it fades; each pulse is 6 to 24 gouts. A spurt ends when
 *   its body is gibbed or gone.
 * - **Dice**: `FxRand`'s.
 */

export const SPURT_MAX = 12;
export type StumpKind = 0 | 1 | 2;   // neck, shoulder, hip
export const NECK: StumpKind = 0, SHOULDER: StumpKind = 1, HIP: StumpKind = 2;
export const LIFE: Readonly<Record<StumpKind, number>> = { 0: 2.8, 1: 1.8, 2: 2.2 };

/** What a spurt reads off the body it is on. */
export interface SpurtHost {
  x: number; z: number; h: number; w: number; fy?: number;
  gone?: boolean;
  sp: { position: { x: number; y: number; z: number }; material: { rotation: number } };
}

interface Spurter {
  on: boolean;
  e: SpurtHost | null;
  kind: StumpKind;
  /** Where on the sprite the stump is, as a fraction of its size from its centre (x to the screen's right, y up). */
  ox: number; oy: number;
  side: number;
  dx: number; dz: number;
  t: number; next: number; trickle: number;
}

const pool: Spurter[] = Array.from({ length: SPURT_MAX }, () => ({ on: false, e: null, kind: 0 as StumpKind, ox: 0, oy: 0, side: 1, dx: 0, dz: 0, t: 0, next: 0, trickle: 0 }));
let ring = 0;

export function resetSpurts(): void { for (const s of pool) { s.on = false; s.e = null; } ring = 0; }

export function spurtCount(): number { let n = 0; for (const s of pool) if (s.on) n++; return n; }

/**
 * Starts a stump of `kind` on `e`, at (`ox`,`oy`) — fractions of the sprite's width and height from its centre —
 * on the screen's `side` (1 right, -1 left; arms), thrown out along (`dx`,`dz`) if the shot gave a direction.
 */
export function startSpurt(e: SpurtHost, kind: StumpKind, ox: number, oy: number, side: number, dx: number, dz: number): void {
  const s = pool[ring]; ring = (ring + 1) % SPURT_MAX;
  s.on = true; s.e = e; s.kind = kind; s.ox = ox; s.oy = oy; s.side = side; s.dx = dx; s.dz = dz; s.t = 0; s.next = 0; s.trickle = 0;
}

/** Where the stump is in the world now: on the sprite, turned with it as it falls. Writes `out`. */
export function stumpPosition(e: SpurtHost, ox: number, oy: number, out: { x: number; y: number; z: number }): void {
  const yaw = viewYaw();
  const rot = e.sp.material.rotation, c = Math.cos(rot), sn = Math.sin(rot);
  const lx = ox * e.w, ly = oy * e.h;
  const u = lx * c - ly * sn, v = lx * sn + ly * c;   // in the sprite's plane, turned by its own rotation
  // the sprite's plane faces the camera: its right is the camera's right
  out.x = e.sp.position.x + Math.cos(yaw) * u;
  out.z = e.sp.position.z - Math.sin(yaw) * u;
  out.y = e.sp.position.y + v;
}

const AT = { x: 0, y: 0, z: 0 };

/** Pumps every live stump. Once a frame, with the game's own clock. */
export function spurtTick(dt: number): void {
  for (const s of pool) {
    if (!s.on) continue;
    const e = s.e;
    if (!e || e.gone) { s.on = false; s.e = null; continue; }
    s.t += dt;
    const life = LIFE[s.kind];
    if (s.t >= life) { s.on = false; s.e = null; continue; }
    const amp = 1 - s.t / life;
    stumpPosition(e, s.ox, s.oy, AT);
    // the pulses: the heart slowing as it empties
    if (s.t >= s.next) {
      s.next = s.t + 0.32 + 0.3 * (1 - amp);
      const n = 6 + Math.round(18 * amp), pow = 1.6 + 3.6 * amp;
      if (s.kind === NECK) goutFx(AT.x, AT.y, AT.z, n, pow, s.dx * 0.25, s.dz * 0.25, 1);
      else {
        const yaw = viewYaw();
        // out from the shoulder or the hip, to the side it is torn from, and up
        goutFx(AT.x, AT.y, AT.z, n, pow * 0.8, Math.cos(yaw) * s.side * 0.5 + s.dx * 0.3, -Math.sin(yaw) * s.side * 0.5 + s.dz * 0.3, 0.7);
      }
      if (fxr() < 0.5) splatFloor(AT.x + fxRange(-0.4, 0.4), AT.z + fxRange(-0.4, 0.4), fxRange(0.16, 0.34), 0.95);
      const px = AT.x, py = AT.y, pz = AT.z;
      at(px, py, pz, () => spurtPulse());
    }
    // between them, a thread
    s.trickle += dt;
    if (s.trickle > 0.05) { s.trickle = 0; bloodFx(AT.x, AT.y, AT.z, 1, 0.5 + 0.5 * amp, s.dx * 0.2, s.dz * 0.2); }
    // a stump that has fallen to the floor leaks onto it
    if (AT.y < floorHeightAt(AT.x, AT.z) + 0.25 && fxr() < 0.06 * dt * 60) splatFloor(AT.x, AT.z, fxRange(0.2, 0.4), 0.95);
  }
}
