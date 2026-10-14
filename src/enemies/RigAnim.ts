import type * as THREE from "three";
import { PX } from "./SpriteBaker";
import { roleCount } from "./rig/bake";
import { HEAD, L_ARM, LEGS, R_ARM, type Role } from "./rig/kit";
import { fallT } from "./Corpse";
import { HURT_LEN } from "./HitReact";

/**
 * WHICH FRAME A RIGGED MONSTER SHOWS (`docs/superpowers/plans/2026-10-13-enemies.md`).
 *
 * `enemyTick` has always chosen a sprite frame with two toggles — the walk's
 * `a`/`b` swap and the one attack frame — for the ten enemies that have art
 * for them, and nothing at all for the rest. A monster with a rig
 * (`PX[key].rig`) has a frame for every moment, and these functions pick it
 * from the state the game already keeps (`animT`, `frame`, `hurt`, `atkAnim`,
 * `sever`, `deathT`, `deathKind`, `deathDir`): they add no state to the
 * simulation and draw no dice. A legacy monster never comes through here.
 *
 * - **alive**: pain while `hurt` runs (two frames, the jerk and the flinch);
 *   the three phases of the attack over `atkAnim`'s .22 s; the walk cycle's
 *   step while it moves (it runs from the first step: the legacy walk
 *   waited for the first attack, a quirk `tests/enemies/walkFrames.test.ts`
 *   still pins for legacy art); the idle otherwise. A monster that has lost
 *   its legs crawls, one that has lost an arm is drawn without it, in every
 *   one of those frames.
 * - **dead**: the five death frames, by how far the body has fallen
 *   (`fallT`: the same curve that sinks the sprite, so the frame's floor is
 *   where the sprite's is); a headless body stands, as its sprite stumbles, for
 *   `STAGGER_SECS` and then falls headless. The fall goes whichever way
 *   `deathDir` says.
 */

/** Seconds `atkAnim` runs from (`Behaviors.ts`, `Attacks.ts`): the three phases split it. */
const ATK_LEN = 0.22;
/** The attack's phases as shares of its time: the wind-up, the strike, the recover. */
const ATK_SPLIT: readonly [number, number] = [0.25, 0.65];
/** How far through the fall (`fallT`) each death frame starts: the jerk, the buckle, the topple, the thud, the lie. */
export const DEATH_AT: readonly number[] = [0, 0.133, 0.31, 0.53, 0.84];

interface Sprite { map: THREE.Texture | null; needsUpdate: boolean }
export interface RigShape {
  key: string;
  sp: { material: Sprite };
  sever?: { lArm?: boolean; rArm?: boolean; legs?: boolean };
  deathKind: number; deathT: number; deathDir: number;
  hurt: number; atkAnim?: number; animT: number; frame: number;
}

/** The monster's dismember mask: its torn-off arms and legs, and (once dead of it) its head. */
export function rigMask(e: Pick<RigShape, "sever" | "deathKind">, dead = false): number {
  const s = e.sever;
  return (s?.lArm ? L_ARM : 0) | (s?.rArm ? R_ARM : 0) | (s?.legs ? LEGS : 0) | (dead && e.deathKind === 2 ? HEAD : 0);
}

function show(e: RigShape, tex: THREE.Texture): void {
  const m = e.sp.material;
  if (m.map !== tex) { m.map = tex; m.needsUpdate = true; }
}

/** The attack's phase (0 wind-up, 1 strike, 2 recover) `atkAnim` seconds from its end. */
export function attackPhase(atkAnim: number): number {
  const p = 1 - Math.min(1, Math.max(0, atkAnim / ATK_LEN));
  return p < ATK_SPLIT[0] ? 0 : p < ATK_SPLIT[1] ? 1 : 2;
}

/** The frame of a living rigged monster this tick. `moving`: it stepped. `stunned`: it is held (a hit's stun), so it neither walks nor strikes. */
export function rigLive(e: RigShape, dt: number, moving: boolean, stunned: boolean): void {
  const set = PX[e.key].rig!, mask = rigMask(e), crawl = (mask & LEGS) !== 0;
  let role: Role, i = 0;
  if (e.hurt > 0) { role = crawl ? "crawlPain" : "pain"; i = e.hurt > HURT_LEN * 0.5 ? 0 : 1; }
  else if (!stunned && (e.atkAnim ?? 0) > 0) { role = crawl ? "crawlAtk" : "atk"; i = attackPhase(e.atkAnim ?? 0); }
  else if (moving && !stunned) {
    role = crawl ? "crawl" : "walk";
    const n = roleCount(set.rig, role), step = set.rig.walkStep * (crawl ? 1.7 : 1);
    e.animT = (e.animT + dt) % (n * step);
    i = Math.min(n - 1, Math.floor(e.animT / step));
    e.frame = i;
  } else role = crawl ? "crawlIdle" : "idle";
  show(e, set.tex(role, i, mask));
}

/** The frame of a rigged corpse this tick (and of a monster the moment it dies). */
export function rigDead(e: RigShape): void {
  const set = PX[e.key].rig!, mask = rigMask(e, true), crawl = (mask & LEGS) !== 0;
  const tf = fallT(e.deathKind, e.deathT);
  if (e.deathKind === 2 && tf <= 0) { show(e, set.tex(crawl ? "crawlIdle" : "idle", 0, mask)); return; }   // a headless body still on its feet
  let i = 0;
  for (let k = 0; k < DEATH_AT.length; k++) if (tf >= DEATH_AT[k]) i = k;
  show(e, set.tex(crawl ? "crawlDie" : "die", i, mask, e.deathDir < 0));
}

/** True for a creature the rig animates. */
export function isRigged(key: string): boolean { return !!PX[key]?.rig; }
