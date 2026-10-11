import { world } from "../world/WorldState";
import { WALLH } from "../world/Grid";
import { solidAt, segBlocked, wallNormal } from "../world/Collision";
import { at } from "../audio/AudioEngine";
import { boneSnap, gibMeat } from "../audio/sounds/gore";
import { PX } from "../enemies/SpriteBaker";
import { crawlFactor } from "../enemies/Sever";
import { legRows } from "./GoreTex";
import { viewYaw } from "../render/ViewYaw";
import { fxr, fxRange } from "./FxRand";
import { buildDrops, dropTick, goutFx, mistFx, resetDrops } from "./GoreDrops";
import { buildChunks, burstChunks, chunkTick, resetChunks } from "./GoreChunks";
import { buildSplats, dripWall, resetSplats, splatFloor, splatTick, splatWall } from "./Splats";
import { makePart, type PartHost } from "./Parts";
import { HIP, NECK, SHOULDER, resetSpurts, spurtTick, startSpurt, type SpurtHost } from "./Spurt";

/**
 * THE GORE, COMPOSED (`docs/superpowers/plans/2026-10-08-impact.md`, Task 3):
 * what a decapitation, a torn-off limb and an overkill each throw into the
 * pools (`GoreDrops`, `GoreChunks`, `Splats`, `Parts`, `Spurt`). The
 * monster's code (`Death.ts`, `Damage.ts`) calls these once, on top of what
 * it has always drawn (the game's own blood, gibs and pools stay exactly as
 * they were, draws and all); everything here is `FxRand`'s.
 */

export type GoreHost = PartHost & SpurtHost & { sever?: { legs?: boolean } };

/** What the sprite of `e` shows: the rows it is drawn over (a crawler's are the upper ones), and the height those rows stand for in the monster's own scale. */
function shape(e: GoreHost): { rows: number; H: number; host: PartHost } {
  const P = PX[e.key], H = P ? P.regions.H : 24;
  const crawl = !!(e.sever && e.sever.legs);
  const full = crawl ? e.h / crawlFactor(e.key) : e.h;   // a part is cut from the whole monster, at the whole monster's scale
  return { rows: crawl ? H - legRows(H) : H, H, host: { x: e.x, z: e.z, h: full, w: e.w, fy: e.fy, key: e.key } };
}
export interface Shot { dir?: { x: number; z: number } }

const HIT = { x: 0, z: 0, nx: 0, nz: 0 };
/** Seconds of flight a body's own parts have had when a burst throws them: long enough that they are no longer where they were on the body. */
const PART_START = 0.16;

/** Marches from (`x`,`z`) along the unit vector (`dx`,`dz`) for a wall within `reach`; fills `HIT` with where and which way it faces. */
function wallAhead(x: number, z: number, dx: number, dz: number, reach: number): boolean {
  for (let t = 0.15; t < reach; t += 0.12) {
    const sx = x + dx * t, sz = z + dz * t;
    if (solidAt(sx, sz) || (world.wallSegs.length && segBlocked(sx, sz, 0.12))) {
      const n = wallNormal(sx, sz, { x: dx, z: dz });
      HIT.x = sx - dx * 0.05; HIT.z = sz - dz * 0.05; HIT.nx = n.x; HIT.nz = n.z;
      return true;
    }
  }
  return false;
}

/**
 * Blood on the nearest wall along (`dx`,`dz`) from (`x`,`y`,`z`), if there is one within `reach`: a main splat the size
 * of `size`, a spray of small ones round it, and a drip or two running down. Returns whether a wall was there.
 */
export function splatter(x: number, y: number, z: number, dx: number, dz: number, reach: number, size: number): boolean {
  if (!wallAhead(x, z, dx, dz, reach)) return false;
  const hy = Math.min(WALLH - 0.3, Math.max(0.3, y + fxRange(-0.2, 0.25)));
  splatWall(HIT.x, hy, HIT.z, HIT.nx, HIT.nz, size, 1);
  const tx = -HIT.nz, tz = HIT.nx;
  const n = 4 + Math.floor(size * 6);
  for (let i = 0; i < n; i++) {
    const u = fxRange(-1, 1) * size * 1.4, v = fxRange(-1, 1) * size * 1.2;
    splatWall(HIT.x + tx * u, Math.min(WALLH - 0.2, Math.max(0.2, hy + v)), HIT.z + tz * u, HIT.nx, HIT.nz, size * fxRange(0.12, 0.34), 0.95);
  }
  const drips = 1 + Math.floor(fxr() * 3);
  for (let i = 0; i < drips; i++) {
    const u = fxRange(-0.6, 0.6) * size;
    dripWall(HIT.x + tx * u, hy - size * 0.2, HIT.z + tz * u, HIT.nx, HIT.nz, fxRange(0.35, 0.8) * (0.6 + size));
  }
  return true;
}

/** The direction a shot was going, as a unit vector on the floor, or a random one if it has none. */
function dirOf(info: Shot | undefined): { x: number; z: number } {
  const d = info?.dir;
  if (d && Math.hypot(d.x, d.z) > 0.01) { const m = Math.hypot(d.x, d.z); return { x: d.x / m, z: d.z / m }; }
  const a = fxRange(0, Math.PI * 2);
  return { x: Math.cos(a), z: Math.sin(a) };
}

/** The sprite-plane fraction above the centre where a part's cut is: row `row` of `H` from the top. */
const rowFrac = (row: number, H: number): number => 0.5 - row / H;

/**
 * A head comes off: the neck pumps, blood goes up and out, hits the wall the shot was heading for, pools under the body, and the body staggers
 * (the stagger is `killEnemy`'s). `e` is the body, `info` the blow.
 */
export function decapFx(e: GoreHost, info?: Shot): void {
  const fy = e.fy || 0, d = dirOf(info);
  const P = PX[e.key], head = P ? P.regions.head : 8, { rows } = shape(e);
  const neckY = e.h * (0.5 + rowFrac(head + 0.5, rows)) + fy;
  startSpurt(e, NECK, 0, rowFrac(head + 0.5, rows), 0, d.x, d.z);
  goutFx(e.x, neckY, e.z, 34, 4.6, d.x, d.z, 0.8);
  mistFx(e.x, neckY, e.z, 4, 0.8);
  splatter(e.x, neckY, e.z, d.x, d.z, 7, fxRange(0.5, 0.75));
  // and to either side of the line of the shot: the spray is not a ray
  splatter(e.x, neckY - 0.2, e.z, d.x * 0.94 - d.z * 0.34, d.z * 0.94 + d.x * 0.34, 5, 0.3);
  splatter(e.x, neckY - 0.2, e.z, d.x * 0.94 + d.z * 0.34, d.z * 0.94 - d.x * 0.34, 5, 0.3);
  splatFloor(e.x, e.z, fxRange(1.1, 1.5), 1);
  splatFloor(e.x + d.x * 0.9, e.z + d.z * 0.9, fxRange(0.5, 0.8), 0.95);
  splatFloor(e.x + d.x * 1.8, e.z + d.z * 1.8, fxRange(0.3, 0.5), 0.9);
  at(e.x, neckY, e.z, () => boneSnap());
}

/**
 * A limb is torn off a living monster: `kind` "arm" on the screen's `side` ("L" or "R"), or "legs". The part flies along the shot with a trail,
 * the stump pumps, the wall and the floor take blood.
 */
export function limbFx(e: GoreHost, kind: "arm" | "legs", side: string | undefined, info?: Shot): void {
  const fy = e.fy || 0, d = dirOf(info);
  const P = PX[e.key], armTop = P ? P.regions.armTop : 8, { rows: H, host } = shape(e);
  const yaw = viewYaw(), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  if (kind === "arm") {
    const s = side === "L" ? -1 : 1;
    const y = e.h * (0.5 + rowFrac(armTop + 1.5, H)) + fy;
    const x0 = e.x + rx * s * e.w * 0.3, z0 = e.z + rz * s * e.w * 0.3;
    makePart(side === "L" ? 1 : 2, host, {
      x: x0, y, z: z0,
      vx: d.x * fxRange(3.5, 6.5) + rx * s * fxRange(0.8, 2), vy: fxRange(3, 5.2), vz: d.z * fxRange(3.5, 6.5) + rz * s * fxRange(0.8, 2),
      spin: (fxr() < 0.5 ? -1 : 1) * fxRange(9, 16),
    });
    startSpurt(e, SHOULDER, s * 0.28, rowFrac(armTop + 1.5, H), s, d.x, d.z);
    goutFx(x0, y, z0, 18, 3.4, d.x, d.z, 0.6);
    splatter(x0, y, z0, d.x, d.z, 6, fxRange(0.3, 0.5));
    splatFloor(x0, z0, fxRange(0.5, 0.8), 1);
    at(x0, y, z0, () => boneSnap());
  } else {
    const y = e.h * 0.2 + fy;
    makePart(3, host, {
      x: e.x, y, z: e.z,
      vx: d.x * fxRange(2.5, 4.5), vy: fxRange(2.5, 4), vz: d.z * fxRange(2.5, 4.5),
      spin: (fxr() < 0.5 ? -1 : 1) * fxRange(6, 11),
    });
    startSpurt(e, HIP, 0, -0.5, 1, d.x, d.z);   // the cut is the bottom of the sprite now: the legs are gone and the sprite is the upper body
    goutFx(e.x, y, e.z, 20, 3.2, d.x, d.z, 0.5);
    splatter(e.x, y, e.z, d.x, d.z, 6, fxRange(0.35, 0.55));
    splatFloor(e.x, e.z, fxRange(0.9, 1.3), 1);
    at(e.x, y, e.z, () => boneSnap());
  }
}

/**
 * A body is gibbed (overkill): meat, organs, bone and sinew thrown out, its head, arms and legs coming off whole and flying,
 * a burst of gouts and a haze of mist, pools on the floor and blood on every wall within five metres.
 */
export function gibFx(e: GoreHost, info?: Shot): void {
  const fy = e.fy || 0, d = dirOf(info);
  const cy = e.h * 0.55 + fy;
  const P = PX[e.key], head = P ? P.regions.head : 0, { host } = shape(e);
  burstChunks(e.x, cy, e.z, 30, 5.4, d.x, d.z);
  const yaw = viewYaw(), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const fly = (kind: number, y: number, side: number): void => {
    const a = fxRange(0, Math.PI * 2), s = fxRange(2, 4.5);
    const vx = Math.cos(a) * s + d.x * 2.5, vy = fxRange(4.2, 7), vz = Math.sin(a) * s + d.z * 2.5;
    makePart(kind, host, {
      x: e.x + rx * side * e.w * 0.25 + vx * PART_START, y: y + vy * PART_START, z: e.z + rz * side * e.w * 0.25 + vz * PART_START,   // already apart on the frame it bursts
      vx, vy, vz, spin: (fxr() < 0.5 ? -1 : 1) * fxRange(8, 15),
    });
  };
  if (head > 0) fly(0, e.h * 0.88 + fy, 0);
  fly(1, e.h * 0.58 + fy, -1);
  fly(2, e.h * 0.58 + fy, 1);
  fly(3, e.h * 0.2 + fy, 0);
  goutFx(e.x, cy, e.z, 52, 5.2, d.x, d.z, 0.35);
  mistFx(e.x, cy, e.z, 12, 1);
  for (let i = 0; i < 4; i++) splatFloor(e.x + fxRange(-0.9, 0.9), e.z + fxRange(-0.9, 0.9), fxRange(0.7, 1.4), 1);
  const a0 = fxRange(0, Math.PI / 3);
  for (let i = 0; i < 6; i++) { const a = a0 + (i * Math.PI) / 3; splatter(e.x, cy, e.z, Math.cos(a), Math.sin(a), 5, fxRange(0.35, 0.75)); }
  at(e.x, cy, e.z, () => gibMeat());
}

/** Ages every pool of the gore. Once a frame, in `Loop.ts`'s render block, with the game's own clock. */
export function goreTick(dt: number): void {
  dropTick(dt);
  chunkTick(dt);
  splatTick(dt);
  spurtTick(dt);
}

/** Makes the level's gore pools (once the scene is new) and starts the spurts over. Called by `resetImpactFx`. */
export function buildGore(): void {
  buildSplats();
  buildChunks();
  buildDrops();
  resetSpurts();
}

/** Forgets the level's gore pools. */
export function resetGore(): void {
  resetSplats();
  resetChunks();
  resetDrops();
  resetSpurts();
}
