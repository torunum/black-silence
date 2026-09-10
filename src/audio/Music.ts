import { startBossMusic, stopBossMusic } from "./Ambient";
import { world } from "../world/WorldState";
import type { Enemy } from "../enemies/Enemy";

/**
 * ADAPTIVE MUSIC — the layer *controller*. Three conceptual layers,
 * exploration/combat/boss, picked from state that already exists elsewhere
 * rather than a second definition of it (Plan 1 Task 5 brief, Step 1):
 *
 * - **"In combat" is `anyAware`** — `src/enemies/ai/Behaviors.ts`'s
 *   `enemyTick` already computes it fresh every frame (`seen&&dist<16` for
 *   any enemy) and `src/core/Loop.ts` already threads the same value into
 *   `chatterTick(dt,anyAware)`. `musicTick` takes it as a parameter for the
 *   same reason, rather than re-deriving it from `world.enemies` itself.
 * - **"A boss is live" is `src/ui/Hud.ts:63`'s shape**:
 *   `e.boss&&!e.dead&&!e.dormant`. `!e.dormant` matters — `Boss.ts`'s
 *   `wakeBoss` is what flips a boss's `dormant` off, and a boss spawns
 *   dormant (`LevelLoader.ts`'s `dormant:!!d.boss`) until the player wakes
 *   it, so a sleeping boss in the room must not start boss music.
 * - **Boss beats combat beats exploration** — `desiredLayer` checks the
 *   boss first and returns early, so a live boss wins even on a frame where
 *   `anyAware` is also true (which it usually is, since a boss is itself an
 *   enemy `enemyTick` scans for `anyAware`).
 *
 * Only the boss layer has an actual procedural sound today —
 * `startBossMusic`/`stopBossMusic`'s `setInterval` pulse, `Ambient.ts`'s
 * one piece of music before this task. Exploration and combat have no
 * procedural source of their own (the four-oscillator drone
 * `AudioEngine.ts`'s `audioInit` builds is a constant ambient bed under
 * everything, not a layer this file adapts — that file is frozen verbatim
 * against the reference and out of scope here). That asymmetry is the
 * point of the brief's charter: **this file builds the state machine, not
 * the sound** — a real `.ogg` per layer is a user-supplied dependency
 * (Task 6) this task does not block on. When those arrive, only the source
 * nodes `enter()` below drives change; the transition/hysteresis logic
 * does not.
 *
 * ## Hysteresis and fade — the two numbers that are this feature's whole feel
 *
 * `anyAware` is recomputed from line-of-sight every single frame, so in a
 * firefight it flips constantly (an enemy stepping behind a pillar, or the
 * player's own turn breaking LOS for one frame) — snapping layers on that
 * is worse than no music (brief, Step 2). Two independent knobs fix it:
 *
 * - **`MUSIC_DWELL_SECONDS = 4`** — once exploration/combat swap on
 *   `anyAware`, no further exploration<->combat swap is even considered
 *   for 4 real seconds. Chosen against the `anyAware` computation itself:
 *   it is a per-frame LOS+distance check with no debounce of its own, so a
 *   break in sight lasting anywhere from one frame to a second or two
 *   (stepping behind cover, a corner) is common in a real fight and must
 *   not read as "combat ended". Four seconds comfortably bridges that
 *   without also bridging a genuine retreat — a player who has actually
 *   disengaged is well clear of every enemy's 16-unit awareness radius
 *   long before 4s is up. **Dwell gates only that one flappy pair.** A
 *   live boss appearing or dying is a decisive, infrequent world-state
 *   change, not per-frame jitter, so entering or leaving "boss" always
 *   happens on the tick it is detected, dwell notwithstanding — see
 *   `musicTick`'s `bossInvolved` check. Delaying a boss fight's music by
 *   up to 4s because the player happened to be mid-dwell from a skirmish
 *   moments earlier would be a worse bug than the flapping this constant
 *   exists to prevent.
 * - **`MUSIC_FADE_SECONDS = 2.5`** — how long the outgoing layer is given
 *   to finish before it is actually silenced. Applied today to the one
 *   real transition that has audio to fade: leaving "boss" schedules
 *   `stopBossMusic()` 2.5s later instead of cutting the pulse on the beat
 *   it happened to be mid-bar on (the pulse's own beat is 300ms, so 2.5s
 *   is ~8 beats of natural tail-off, not an abrupt stop). Long enough to
 *   read as a deliberate wind-down, short enough that the next room's
 *   ambience does not feel delayed. `enter()` re-arms this timer to 0 the
 *   moment boss becomes the target again, so ducking in and out of a boss
 *   fight inside the fade window cancels the pending stop instead of
 *   cutting the pulse and immediately restarting it.
 *
 * `stopMusic()` deliberately does **not** go through the fade — death and
 * the win screen call it for a decisive, immediate silence (matching how
 * the four existing `stopBossMusic()` call sites already behave: an
 * instant cut, never a fade-out), not a 2.5s tail playing under a screen
 * that has already changed.
 *
 * ## Wiring
 *
 * `musicTick(dt,anyAware)` is called from `src/core/Loop.ts` beside
 * `chatterTick(dt,anyAware)`, inside the same `!paused&&!S.dead&&!S.won`
 * block — so music pauses with the game for free, with no second mechanism.
 *
 * `stopMusic()` is called from the same three places the Plan 1 Task 5
 * brief specifies: `src/player/Player.ts`'s `damagePlayer` `S.hp<=0` branch
 * (death), `src/ui/LevelEnd.ts`'s `showWin` (the win screen) — both beside
 * the `stopBossMusic()` call already there, so there is one place per
 * outcome rather than a second lifecycle — and `src/world/LevelLoader.ts`'s
 * `loadLevel`. That third call site closes a real, pre-existing gap:
 * `loadLevel` already calls `clearAllTimers()`/`clearScheduled()`, but
 * `clearAllTimers()` only tracks `setTimeout` (`src/core/Timers.ts`'s
 * `after()`); `bossPulse` is the codebase's only `setInterval` and nothing
 * cancelled it at level load before this task — it survived only because
 * the four pre-existing `stopBossMusic()` call sites happened to cover
 * every *normal* path (death, the exit pad, the win screen, a boss dying).
 * A level load that is none of those — jumping levels mid-fight — did not.
 * `stopMusic()` covers `stopBossMusic()`'s job plus resetting this file's
 * own layer/dwell/fade state, so `loadLevel` gets one call, not two.
 */

export type MusicLayer = "exploration" | "combat" | "boss";

/** How long an outgoing layer is given to finish before it is actually silenced. See the module doc comment. */
export const MUSIC_FADE_SECONDS = 2.5;
/** Minimum time a layer holds before another swap is even considered. See the module doc comment. */
export const MUSIC_DWELL_SECONDS = 4;

/** What this file reads off a `world.enemies` element — the same boss check `src/ui/Hud.ts` uses. */
type MusicBossEnemy = Pick<Enemy, "boss" | "dead" | "dormant">;

let active: MusicLayer = "exploration";
let dwellRemaining = 0;
/** Time left before a pending `stopBossMusic()` (queued by leaving "boss") actually fires. 0 means nothing pending. */
let bossFadeOutRemaining = 0;

function liveBossExists(): boolean {
  // A checked widening, not a cast: `world.enemies` is `Enemy[]`, and this
  // binding narrows the view to the three fields the check below reads.
  const enemies: readonly MusicBossEnemy[] = world.enemies;
  return enemies.some((e) => e.boss && !e.dead && !e.dormant);
}

/** Boss beats combat beats exploration — checked in that order, first match wins. */
function desiredLayer(anyAware: boolean): MusicLayer {
  if (liveBossExists()) return "boss";
  return anyAware ? "combat" : "exploration";
}

function enter(next: MusicLayer): void {
  if (active === "boss" && next !== "boss") {
    bossFadeOutRemaining = MUSIC_FADE_SECONDS; // let the pulse ring out instead of cutting mid-beat
  }
  if (next === "boss") {
    bossFadeOutRemaining = 0; // cancel a pending fade-out if boss becomes live again first
    startBossMusic(); // no-ops if already running (bossPulse guard) or before audioInit() (ctx() guard)
  }
  active = next;
  dwellRemaining = MUSIC_DWELL_SECONDS;
}

/** The layer the state machine has settled on. A query accessor, the same shape as AudioEngine.ts's isReady()/getMasterVolume(). */
export function musicLayer(): MusicLayer {
  return active;
}

/**
 * Advances the music state machine by one frame. `anyAware` is the exact
 * value `enemyTick` returned this frame — see the module doc comment for
 * why this file takes it rather than recomputing it.
 */
export function musicTick(dt: number, anyAware: boolean): void {
  if (dwellRemaining > 0) dwellRemaining -= dt;
  const desired = desiredLayer(anyAware);
  // Dwell only throttles the flappy exploration<->combat pair (see the
  // module doc comment); a boss appearing or dying is decisive world
  // state, not per-frame jitter, so it always transitions immediately.
  const bossInvolved = desired === "boss" || active === "boss";
  if (desired !== active && (bossInvolved || dwellRemaining <= 0)) enter(desired);
  if (bossFadeOutRemaining > 0) {
    bossFadeOutRemaining -= dt;
    if (bossFadeOutRemaining <= 0) stopBossMusic();
  }
}

/** Silences every layer immediately (no fade) and resets the state machine. See the module doc comment for call sites. */
export function stopMusic(): void {
  stopBossMusic();
  active = "exploration";
  dwellRemaining = 0;
  bossFadeOutRemaining = 0;
}
