import { PX } from "./SpriteBaker";
import { rigLive } from "./RigAnim";
import { HURT_LEN } from "./HitReact";
import { hoverY } from "./Hover";
import { blood } from "../fx/Particles";
import { at } from "../audio/AudioEngine";
import { monsterPain } from "../audio/sounds/monsters";
import type { Enemy } from "./Enemy";

/**
 * THE STAGGER (owner, 2026-10-22: "stagger state'e girebilsinler, yani çok çok az canları kalınca bazen, her zaman olmasın; öyle olunca
 * da E tuşu ile animasyonlu öldürme olsun"). A monster brought down to the last sliver of its health may — not always — reel: it stops
 * where it stands, hunched in its pain pose, swaying, bleeding, glowing a sick orange, unable to fight back. For those seconds the player
 * can walk up to it and press E to finish it with their hands (`src/player/Execution.ts`). Left alone it gathers itself and fights on,
 * and it does not reel twice. Bosses never reel.
 *
 * The roll is the game's own `Math.random` (the trace fixtures are recorded under it), made once per monster, the first time a hit
 * leaves it at or under `STAGGER_AT` of its health.
 */

/** The share of its health at or under which a monster may reel. */
export const STAGGER_AT = 0.2;
/** The chance it does, once, the first time it is brought that low. */
export const STAGGER_CHANCE = 0.45;
/** Seconds it reels for, if nobody finishes it. */
export const STAGGER_T = 4.2;

type Reeler = Pick<Enemy, "boss" | "hp" | "maxhp" | "x" | "z" | "h" | "fy" | "key" | "dead" | "stagger" | "staggerTried" | "stun" | "kx" | "kz">;

/** After a hit that left it alive: perhaps it reels. Called by `damageEnemy`. */
export function tryStagger(e: Reeler): void {
  if (e.boss || e.dead || e.hp <= 0 || e.staggerTried || e.hp > e.maxhp * STAGGER_AT) return;
  e.staggerTried = true;
  if (Math.random() >= STAGGER_CHANCE) return;
  e.stagger = STAGGER_T;
  e.kx *= 0.3; e.kz *= 0.3;
  at(e.x, e.h * 0.6 + (e.fy || 0), e.z, () => monsterPain(e.key, e));
}

/** True while it reels (or is being finished). */
export const reeling = (e: Pick<Enemy, "stagger" | "dead">): boolean => !e.dead && (e.stagger ?? 0) > 0;

/**
 * One frame of a reeling monster, from `enemyTick`: held in its pain pose, swaying and sagging, pulsing orange, bleeding. Returns true
 * when it is reeling (the tick does nothing else with it); false when it is not, or has just gathered itself.
 */
export function staggerHeld(enemy: unknown, dt: number): boolean {
  const e = enemy as Enemy;   // enemyTick's element, which reads it through its own narrower view (the convention Damage.ts follows)
  if (!(e.stagger && e.stagger > 0)) return false;
  if (!e.executing) e.stagger -= dt;
  const mat = e.sp.material as unknown as { color: { setRGB(r: number, g: number, b: number): void; setHex(h: number): void } };
  if (e.stagger <= 0) {   // it gathers itself, and fights on
    e.stagger = 0; e.stun = Math.max(e.stun, 0.3);
    mat.color.setHex(e.elite ? 0xd8c878 : 0xffffff);
    return false;
  }
  e.reelT = (e.reelT ?? 0) + dt;
  const t = e.reelT;
  e.hurt = Math.max(e.hurt, HURT_LEN * 0.4);   // the pain frame, held
  if (PX[e.key].rig) rigLive(e, dt, false, true);
  const pulse = 0.5 + 0.5 * Math.sin(t * 9);
  mat.color.setRGB(1, 0.62 + 0.3 * (1 - pulse), 0.28 + 0.45 * (1 - pulse));
  const sway = Math.sin(t * 2.3) * 0.07, sag = 0.04 + 0.03 * Math.sin(t * 1.7);
  e.sp.position.set(e.x + sway * Math.cos(t * .7), hoverY(e) - sag, e.z + sway * Math.sin(t * .7));
  e.blob.position.set(e.x, (e.fy || 0) + 0.012, e.z);
  if (Math.random() < dt * 3) blood(e.x, e.h * 0.55 + (e.fy || 0), e.z, 2, 1.2);
  return true;
}
