import { S } from "../core/State";
import { pick } from "../utils/math";
import { MONOLOGUE as M } from "../content/monologue";
import { checkpoint as CP } from "../world/CheckpointState";
import { hasCheckpoint } from "../world/Checkpoints";
import { riseAgain, restartLevel } from "../world/Respawn";
import { el } from "./dom";

/**
 * THE DEATH SCREEN (deeper-levels plan, Task 1). Death no longer reloads the page. The screen offers
 * two choices, and says why when it offers one:
 *
 *  - **RISE AGAIN AT THE LAST SHRINE** — only if a checkpoint marker was lit on this level
 *    (`Checkpoints.ts`); `Respawn.ts` says what it restores;
 *  - **RESTART THE LEVEL** — the level over, in the engine, as it was when entered.
 *
 * Both take deliberate input, as the chapter card does (`src/world/Transition.ts`): nothing is taken
 * in the first `DEATH_HOLD` seconds (a player who dies mid-burst must not skip the screen with a
 * held key or a click that was already on its way), a key's auto-repeat does nothing, and a click
 * counts only on the button, so a mouse button already held when the screen came up does nothing.
 * Space or Enter takes the first choice on offer (the shrine if there is one, else a restart), R
 * restarts. The keys are not the ones the game uses while alive beyond Space (jump) and R (reload),
 * which do nothing while dead.
 *
 * The page-reload buttons of the win screen are untouched.
 */

/** Seconds the screen is up before a choice is taken. */
export const DEATH_HOLD = 1.0;

let wired = false;

/** Whether a choice would be taken now: the screen is up and has been for `DEATH_HOLD`. */
function ready(): boolean {
  return S.dead && !el("dead").classList.contains("hidden") && performance.now() - CP.deadAt >= DEATH_HOLD * 1000;
}

function choose(rise: boolean): void {
  if (!ready()) return;
  if (rise) riseAgain(); else restartLevel();
}

function wire(): void {
  if (wired) return;
  wired = true;
  el("riseBtn").addEventListener("click", () => choose(true));
  el("restartBtn").addEventListener("click", () => choose(false));
  addEventListener("keydown", (e) => {
    if (e.repeat || !S.dead) return;
    if (e.code === "KeyR") choose(false);
    else if (e.code === "Space" || e.code === "Enter" || e.code === "NumpadEnter") choose(hasCheckpoint());
  });
}

/** The player has died: counts it, and puts the screen up. Called from `damagePlayer`. */
export function showDeath(): void {
  wire();
  S.deaths++;
  CP.deadAt = performance.now();
  const rise = hasCheckpoint();
  el("deadquip").textContent = 'ADEM: “' + pick(M.dead) + '”';
  el("deadwhere").textContent = rise ? "THE LAST SHRINE REMEMBERS YOU" : "NO SHRINE HAS BEEN LIT HERE";
  el("riseBtn").classList.toggle("hidden", !rise);
  el("restartBtn").textContent = rise ? "[ RESTART THE LEVEL — R ]" : "[ RESTART THE LEVEL — SPACE ]";
  el("dead").classList.remove("hidden");
}
