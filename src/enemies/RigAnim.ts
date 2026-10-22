import type * as THREE from "three";
import { PX } from "./SpriteBaker";
import { roleCount } from "./rig/bake";
import { HEAD, L_ARM, LEGS, R_ARM, type Role } from "./rig/kit";
import { fallT } from "./Corpse";
import { HURT_LEN } from "./HitReact";
import { ATK_LEN, ATK_SPLIT, DEATH_AT, LUNGE_AIR, LUNGE_SECS, LUNGE_SPLIT, SCREAM_SPLIT, SCREAM_STUN } from "./rig/timing";

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

export { DEATH_AT };

interface Sprite { map: THREE.Texture | null; needsUpdate: boolean }
export interface RigShape {
  key: string;
  /** A priest boss's second form (`Q2`, `Z2`...: `Boss.ts` sets it in its last phase): its frames are that rig's, where it has one. */
  formKey?: string;
  sp: { material: Sprite };
  sever?: { lArm?: boolean; rArm?: boolean; legs?: boolean };
  deathKind: number; deathT: number; deathDir: number;
  hurt: number; atkAnim?: number; animT: number; frame: number;
  /** What a monster does that is not `atkAnim`: the wailer's scream (a stun) and the hound's leap (a timer). */
  scream?: boolean; screamT?: number; stun?: number; lunge?: boolean; lungeT?: number;
}

/** The monster's dismember mask: its torn-off arms and legs, and (once dead of it) its head. */
export function rigMask(e: Pick<RigShape, "sever" | "deathKind">, dead = false): number {
  const s = e.sever;
  return (s?.lArm ? L_ARM : 0) | (s?.rArm ? R_ARM : 0) | (s?.legs ? LEGS : 0) | (dead && e.deathKind === 2 ? HEAD : 0);
}

/** The rig whose frames `e` shows: its second form's once it has taken it (and that form has a rig), else its own. */
function rigOf(e: RigShape): NonNullable<(typeof PX)[string]["rig"]> {
  const f = e.formKey ? PX[e.formKey]?.rig : undefined;
  return f ?? PX[e.key].rig!;
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

/** Which of three phases `t` seconds in falls in, given the two split times. */
export function phaseAt(t: number, split: readonly [number, number]): number { return t < split[0] ? 0 : t < split[1] ? 1 : 2; }

/** The frame of a living rigged monster this tick. `moving`: it stepped. `stunned`: it is held (a hit's stun), so it neither walks nor strikes. */
export function rigLive(e: RigShape, dt: number, moving: boolean, stunned: boolean): void {
  const set = rigOf(e), mask = rigMask(e), crawl = (mask & LEGS) !== 0;
  let role: Role, i = 0;
  if (e.hurt > 0) { role = crawl ? "crawlPain" : "pain"; i = e.hurt > HURT_LEN * 0.5 ? 0 : 1; }
  else if (!stunned && (e.atkAnim ?? 0) > 0) { role = crawl ? "crawlAtk" : "atk"; i = attackPhase(e.atkAnim ?? 0); }
  else if (stunned && e.scream && (e.screamT ?? 0) > 8.5 && (e.stun ?? 0) > 0) { role = crawl ? "crawlAtk" : "atk"; i = phaseAt(SCREAM_STUN - (e.stun ?? 0), SCREAM_SPLIT); }   // it is screaming: held where it stands
  else if (!stunned && e.lunge && LUNGE_SECS - (e.lungeT ?? 0) < LUNGE_AIR && LUNGE_SECS - (e.lungeT ?? 0) >= 0) { role = crawl ? "crawlAtk" : "atk"; i = phaseAt(LUNGE_SECS - (e.lungeT ?? 0), LUNGE_SPLIT); }   // in the air
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
  const set = rigOf(e), mask = rigMask(e, true), crawl = (mask & LEGS) !== 0;
  const tf = fallT(e.deathKind, e.deathT);
  if (e.deathKind === 2 && tf <= 0) { show(e, set.tex(crawl ? "crawlIdle" : "idle", 0, mask)); return; }   // a headless body still on its feet
  let i = 0;
  for (let k = 0; k < DEATH_AT.length; k++) if (tf >= DEATH_AT[k]) i = k;
  show(e, set.tex(crawl ? "crawlDie" : "die", i, mask, e.deathDir < 0));
}

/** True for a creature the rig animates. */
export function isRigged(key: string): boolean { return !!PX[key]?.rig; }
