import { rnd } from "../utils/math";
import { say, tickSubtitles } from "./Subtitles";
import { world } from "../world/WorldState";

/**
 * Idle quips, and the subtitle timer riding along with them.
 *
 * Moved verbatim from `src/legacy.js`'s "IDLE QUIPS + SUBTITLE TIMER"
 * section (formerly lines 62-66; `reference/sonsurum.html`'s equivalent).
 * Despite the file name, `chatterTick` drives two things per frame: it
 * ticks `src/ui/Subtitles.ts`'s subtitle countdown via `tickSubtitles`
 * first, then counts down `world.idleT` and fires an "idle" line through
 * `say` when it lapses — exactly why the original banner named both.
 */
export function chatterTick(dt: number, anyAware: boolean): void {
  tickSubtitles(dt);
  if(anyAware){world.idleT=rnd(26,40);return;}
  world.idleT-=dt;
  if(world.idleT<=0){world.idleT=rnd(26,40);say("idle");}}
