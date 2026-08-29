/**
 * The scaled clock. Holds the frame deltas `Loop.ts` computes, and — as of
 * Task 5 — the scheduler that replaces the four gameplay `setTimeout` calls
 * KNOWN-3 flagged: `WeaponState.ts`'s power-kick hit test and
 * `Behaviors.ts`'s Mancubus second barrel, Slaughtaur second bolt and brute
 * slam damage. Those callbacks now run off `scaledDt` — the hit-stop-scaled
 * delta — instead of wall-clock milliseconds, so they respect hit-stop and
 * pause the way every other per-frame system already does.
 */
export const time = { dt: 0, scaledDt: 0 };

interface Scheduled { fn: () => void; left: number; }
const pending: Scheduled[] = [];

/**
 * Runs `fn` once, `delaySeconds` of *scaled* time from now — matching `dt`,
 * not `setTimeout`'s milliseconds. Driven by `tickScheduled`, called from
 * `Loop.ts`'s gameplay block, so a pending call is silent during hit-stop,
 * pause, death/win, and does not survive a level unload the way a bare
 * `setTimeout` would.
 */
export function schedule(fn: () => void, delaySeconds: number): void {
  pending.push({ fn, left: delaySeconds });
}

/**
 * Advances every pending call by `scaledDt` and fires the ones that have
 * elapsed. Walks backwards so splicing a fired entry out mid-loop is safe,
 * and so a callback that itself calls `schedule` lands on next tick's list
 * rather than this one's — the same "don't run what you just queued"
 * guarantee a real event loop gives a `setTimeout(fn, 0)` called from
 * inside another timer's callback.
 */
export function tickScheduled(scaledDt: number): void {
  for (let i = pending.length - 1; i >= 0; i--) {
    pending[i].left -= scaledDt;
    if (pending[i].left <= 0) { const s = pending[i]; pending.splice(i, 1); s.fn(); }
  }
}

/** Drops every pending call unfired. Called from `src/world/LevelLoader.ts`'s `loadLevel`, alongside `src/core/Timers.ts`'s `clearAllTimers`, so a scheduled effect from the level being left behind can't land in the next one (Plan 0F Task 6, KNOWN-3). */
export function clearScheduled(): void { pending.length = 0; }
