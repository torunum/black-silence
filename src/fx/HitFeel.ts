import { screenShake } from "./ShakeState";
import { showMarker, type MarkerKind } from "./HitMarker";
import { addHitPunch } from "./ViewPunch";
import { renderState } from "../render/Renderer";
import { hitArmour, hitFlesh, hitHead, hitKill } from "../audio/sounds/hits";

/**
 * HIT FEEL — what the player gets back when a shot, a kick or a blast lands
 * on a monster: a hit-stop, a punch of the camera toward it, a marker at the
 * crosshair and a crisp confirming sound. `docs/superpowers/plans/
 * 2026-10-08-impact.md`, Task 1.
 *
 * **One feedback per volley, not per pellet.** `damageEnemy` (and nothing
 * else) calls `registerHit` for every body it damages; the events of one
 * frame are folded into `pending` and `feelTick` — once a frame, after the
 * gameplay tick — turns them into one stop, one punch, one marker and one
 * sound. Eight shotgun pellets are one thump, not eight jolts; a nail cannon
 * is a stream whose hits do not freeze the game at all (its kills do).
 *
 * **What it costs the simulation** (it is the one place this plan touches
 * it): a hit-stop of S seconds runs the game at 8% for S seconds of real
 * time, so each stop takes about 0.92·S of game time out of the fight. The
 * table below is the whole budget; STATUS.md records the totals.
 *
 * Nothing here draws from `Math.random()` (the fixtures are seeded) or
 * allocates per frame: `pending` is one object, rewritten in place.
 */

/** One row of the feel table, per weapon (indexed by `wIdx`), the kick (-1), a wall (-2) and blasts (`EXPLOSIVE`). */
export interface FeelRow {
  /** Seconds of hit-stop on a hit that does not kill; 0 for a stream. */
  hit: number;
  /** Seconds of hit-stop on a kill. */
  kill: number;
  /** Camera punch strength (0..1) on a hit, and on a kill. */
  punch: number;
  killPunch: number;
  /** How long the sprite stays white after a hit, in seconds of game time (HitReact.ts). */
  flash: number;
}

export const EXPLOSIVE = 8;
/** Keyed by `wIdx`; the weapons are `src/weapons/definitions.ts`'s slots. */
export const FEEL: Readonly<Record<number, FeelRow>> = {
  0: { hit: 0.030, kill: 0.075, punch: 0.35, killPunch: 0.6, flash: 0.05 },    // flare pistol
  1: { hit: 0.050, kill: 0.110, punch: 0.6, killPunch: 1.0, flash: 0.08 },     // sawed-off shotgun: the volley, once
  2: { hit: 0, kill: 0.045, punch: 0.12, killPunch: 0.3, flash: 0.035 },       // combat rifle
  3: { hit: 0, kill: 0.040, punch: 0.08, killPunch: 0.25, flash: 0.03 },       // tommy gun
  4: { hit: 0.085, kill: 0.150, punch: 0.8, killPunch: 1.0, flash: 0.09 },     // BMG sniper
  6: { hit: 0, kill: 0.035, punch: 0.05, killPunch: 0.22, flash: 0.02 },       // nail cannon: a stream
  7: { hit: 0.060, kill: 0.120, punch: 0.6, killPunch: 0.9, flash: 0.08 },     // soul reaper
  [-1]: { hit: 0.060, kill: 0.100, punch: 0.9, killPunch: 1.0, flash: 0.08 },  // the kick
  [-2]: { hit: 0.050, kill: 0.090, punch: 0.6, killPunch: 0.8, flash: 0.08 },  // a body into a wall
  [EXPLOSIVE]: { hit: 0.020, kill: 0.060, punch: 0.5, killPunch: 0.7, flash: 0.08 },   // a blast, the cross
};
/** Hit-stop is never longer than this, however many hits fold into one frame (seconds). */
export const STOP_MAX = 0.16;
/** A hit that does not kill freezes the game at most this often (seconds of real time): no weapon can chain-lock the game. */
export const STOP_GAP = 0.2;
/** Each further hit in one frame adds this much to the stop, up to `MORE_MAX` (eight pellets in a chest are a bigger thump than one). */
export const MORE_EACH = 0.1, MORE_MAX = 0.5;
/** Minimum real seconds between two confirming sounds of the same kind (a stream is a stream, not a machine gun of ticks). */
export const SOUND_GAP = 0.08;

export function feelRow(wIdx: number | undefined, explosive?: boolean): FeelRow {
  if (explosive) return FEEL[EXPLOSIVE];
  return FEEL[wIdx === undefined ? 0 : wIdx] ?? FEEL[0];
}

export interface HitEvent {
  wIdx?: number;
  explosive?: boolean;
  head?: boolean;
  /** The monster died of it. */
  kill?: boolean;
  /** ... and burst into gibs. */
  gib?: boolean;
  /** The blow struck armour, not flesh. */
  plate?: boolean;
  /** The monster's place relative to the view, -1 (left) .. 1 (right). */
  side: number;
}

const RANK: Record<MarkerKind, number> = { armour: 1, flesh: 2, head: 3, kill: 4, headkill: 5, gib: 6 };

/** This frame's events folded together. Rewritten in place; never reallocated. */
const pending = { n: 0, kind: "flesh" as MarkerKind, stop: 0, stops: 0, punch: 0, side: 0, killed: false };
/** Real seconds since the last non-killing hit-stop, and per sound kind since it last played. */
const clock = { sinceStop: 9, flesh: 9, head: 9, kill: 9, armour: 9 };

export function resetHitFeel(): void {
  pending.n = 0; pending.kind = "flesh"; pending.stop = 0; pending.stops = 0; pending.punch = 0; pending.side = 0; pending.killed = false;
  clock.sinceStop = clock.flesh = clock.head = clock.kill = clock.armour = 9;
}

/** The side of the view a place is on, -1 .. 1, from where the player stands and looks. */
export function sideOf(px: number, pz: number, x: number, z: number, yaw: number): number {
  const dx = x - px, dz = z - pz, d = Math.hypot(dx, dz);
  return d < 0.001 ? 0 : (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / d;
}

/** `damageEnemy` reports a body it hit. Cheap: it only folds the event in. */
export function registerHit(ev: HitEvent): void {
  const row = feelRow(ev.wIdx, ev.explosive);
  const kind: MarkerKind = ev.plate ? "armour"
    : ev.gib ? "gib" : ev.kill ? (ev.head ? "headkill" : "kill") : ev.head ? "head" : "flesh";
  const stop = ev.plate ? 0 : ev.kill ? row.kill * (ev.gib ? 1.25 : 1) : row.hit;
  const punch = ev.plate ? row.punch * 0.4 : ev.kill ? row.killPunch : row.punch;
  pending.n++;
  if (RANK[kind] > RANK[pending.kind] || pending.n === 1) pending.kind = kind;
  if (ev.kill) pending.killed = true;
  // a volley's hits are one bigger thump, not several stops: the longest, and a tenth more for each further hit (up to half again)
  if (stop > 0) { pending.stop = Math.max(pending.stop, stop); pending.stops++; }
  if (punch > pending.punch) { pending.punch = punch; pending.side = ev.side; }
}

/**
 * Once a frame, after the gameplay tick. `realDt` is the unscaled frame time:
 * the stop's own clock, and the sounds' spacing.
 */
export function feelTick(realDt: number): void {
  clock.sinceStop += realDt; clock.flesh += realDt; clock.head += realDt; clock.kill += realDt; clock.armour += realDt;
  if (pending.n === 0) return;
  const kind = pending.kind;
  if (pending.stop > 0 && (pending.killed || clock.sinceStop >= STOP_GAP)) {
    const stop = pending.stop * (1 + Math.min(MORE_MAX, MORE_EACH * (pending.stops - 1)));
    screenShake.hitStop = Math.max(screenShake.hitStop, Math.min(STOP_MAX, stop));
    if (!pending.killed) clock.sinceStop = 0;
  }
  showMarker(kind);
  if (pending.punch > 0) addHitPunch(pending.punch, pending.side);
  const sk = kind === "gib" || kind === "kill" || kind === "headkill" ? "kill" : kind === "head" ? "head" : kind === "armour" ? "armour" : "flesh";
  if (clock[sk] >= SOUND_GAP) { clock[sk] = 0; (sk === "kill" ? hitKill : sk === "head" ? hitHead : sk === "armour" ? hitArmour : hitFlesh)(); }
  pending.n = 0; pending.kind = "flesh"; pending.stop = 0; pending.stops = 0; pending.punch = 0; pending.side = 0; pending.killed = false;
}

/** The view's yaw, for callers that have no input module to read it from. */
export function viewYaw(): number { return renderState.camera.rotation.y; }
