/**
 * The wall-clock timer registry — `after`, the tracked replacement for a
 * bare `setTimeout`, and `clearAllTimers`, which `src/world/LevelLoader.ts`'s
 * `loadLevel` calls at its top so nothing scheduled by a level that no
 * longer exists can fire into the next one (Plan 0F Task 6, KNOWN-3).
 *
 * Every surviving `setTimeout` call site in the game is an audio tail or a
 * UI fade — never a gameplay effect — and this file's timers stay
 * **wall-clock on purpose**: an audio tail or a screen fade should not
 * stretch out just because the game hit-stopped. The four gameplay
 * callbacks that *do* need to respect hit-stop and pause were moved to
 * `src/core/Time.ts`'s scaled-time `schedule`/`tickScheduled` by Task 5;
 * this module is deliberately the other kind of clock.
 *
 * **`setTimeout` is called dynamically inside `after`, never captured at
 * module scope.** `tests/support/domStubs.ts`'s `installFakeClock()`
 * replaces `globalThis.setTimeout`/`globalThis.clearTimeout` *after*
 * modules have already been evaluated, and the trace fixtures
 * (`tests/integration/trace.test.ts`, `combatTrace.test.ts`) drain that
 * fake clock at every frame boundary. A module-scope
 * `const realSetTimeout = setTimeout;` would capture the real browser
 * timer before the fake clock is installed, bypass it entirely, and make
 * both trace fixtures diverge for reasons that have nothing to do with
 * this file.
 */

const live = new Set<ReturnType<typeof setTimeout>>();

/** setTimeout that a level load can cancel via clearAllTimers. Wall-clock, unlike Time.schedule. */
export function after(fn: () => void, ms: number): void {
  const id = setTimeout(() => { live.delete(id); fn(); }, ms);
  live.add(id);
}

/** Cancels every timer registered through `after` that has not yet fired. */
export function clearAllTimers(): void {
  for (const id of live) clearTimeout(id);
  live.clear();
}
