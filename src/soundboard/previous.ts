/**
 * THE OLD VERSIONS — the sound board's "old" button for every sound a task
 * has replaced. Player feedback round 2 (`docs/superpowers/plans/2026-09-26-
 * player-feedback-2-sound.md`): the owner judges by ear, so each rebuilt
 * sound is heard beside the one it replaced.
 *
 * **Empty in Task 1**, which replaced no sound — every row on the board shows
 * one button, "current". From Task 2 on, a task that changes a sound does
 * this before changing it:
 *
 * 1. Copy the sound's function, as it stands, into a file in
 *    `src/soundboard/previous/` (for example `previous/weapons.ts` for
 *    `shotgunFire`). Copy anything it calls that the same task is about to
 *    change too — if Task 2 moves every sound onto a new reverb, the old
 *    shotgun must keep the old routing to sound old. Import only engine
 *    pieces the task leaves alone.
 * 2. Register the copy below under the row's `id` from `./registry.ts`
 *    (`"weapon-fire-1"` is the shotgun).
 * 3. Then change the real function in `src/audio/`. The board now shows
 *    **old** and **new** on that row; "new" is the game's own code.
 *
 * The game never imports this file or anything in `src/soundboard/` —
 * `tests/soundboard/soundboard.test.ts` fails if it does — so old versions
 * cost the game nothing and can be kept as long as they are useful.
 */
export const PREVIOUS: Readonly<Record<string, () => void>> = {};
