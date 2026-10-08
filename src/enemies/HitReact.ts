import { feelRow } from "../fx/HitFeel";
import type { Enemy } from "./Enemy";

/**
 * A monster's reaction to being hit, as the player sees it: the sprite goes
 * white for a frame or three (longer for a heavier weapon — the table is
 * `src/fx/HitFeel.ts`'s `FEEL.flash`), leans away from the shot and settles,
 * and the old red tint (`0xff8866`, `damageEnemy`'s since the port) takes
 * over for the rest of the `hurt` timer.
 * `docs/superpowers/plans/2026-10-08-impact.md`, Task 1.
 *
 * It rides on the `hurt` timer the game already counts down (`enemyTick`'s
 * `if(e.hurt>0)` branch, in game time, so a hit-stop holds the flash and
 * the lean at their peak through the freeze) and adds two optional fields
 * to the enemy, `flashT` and `lean`. Nothing here moves, draws a die or
 * touches a stat: it is the sprite's colour and its rotation, and the
 * rotation is overwritten by the death collapse, which sets it every frame.
 */

/** How long the `hurt` timer runs (seconds) — `damageEnemy`'s own `.12`, unchanged. */
export const HURT_LEN = 0.12;
/** The tint for the rest of the timer once the white has gone. */
export const HURT_TINT = 0xff8866;
/** The white is a colour multiplier above 1 (the sprite goes through the tone mapper): brighter for a heavier flash. */
export const flashLevel = (flash: number): number => 1.6 + flash * 38;
/** The lean at its fullest, radians, by the strength of the punch. */
export const leanFor = (punch: number): number => 0.06 + 0.07 * punch;

export type Reactor = Pick<Enemy, "hp" | "hurt" | "sp" | "flashT" | "lean">;

/**
 * The enemy has just taken `info`'s blow. `push` is the shot's direction
 * across the screen (-1 left .. 1 right), which way it leans.
 */
export function startHitReact(e: Reactor, wIdx: number | undefined, explosive: boolean | undefined, push: number): void {
  e.hurt = HURT_LEN;
  const m = e.sp.material;
  if (e.hp > 0) {
    const row = feelRow(wIdx, explosive);
    const k = flashLevel(row.flash);
    m.color.setRGB(k, k, k);
    e.flashT = row.flash;
    e.lean = -Math.max(-1, Math.min(1, push)) * leanFor(row.punch);
  } else {
    m.color.setHex(HURT_TINT);
    e.flashT = 0; e.lean = 0;
  }
}

/** Once a frame while `hurt` runs (after it has been aged by `dt`). */
export function tickHitReact(e: Reactor, dt: number): void {
  if ((e.flashT ?? 0) > 0) {
    e.flashT = (e.flashT ?? 0) - dt;
    if (e.flashT <= 0) e.sp.material.color.setHex(HURT_TINT);
  }
  e.sp.material.rotation = e.hurt > 0 ? (e.lean ?? 0) * (e.hurt / HURT_LEN) : 0;
}
