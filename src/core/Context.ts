/**
 * The service locator, and deliberate debt — now down to its one permanent
 * entry, `wakeBoss`.
 *
 * Plan 0E moves functions, and a system that has already moved sometimes
 * has to call one that has not: this module is born in the level-loader
 * task because `explodeBarrel` calls `damagePlayer` and `damageEnemy`,
 * neither of which becomes a module until Tasks 7 and 9. It briefly also
 * held a `wakeBoss` entry for the same reason (Task 9's `damageEnemy` was a
 * module before Task 10's boss brain), plus `damagePlayer` and `damageEnemy`
 * themselves stayed here even after they moved, for `Props.ts`/`Hitscan.ts`/
 * `WeaponState.ts` to call — that was Plan 0E's other reason to route
 * through the locator instead of a direct import: two modules calling each
 * other **both ways**, which `madge --circular` forbids. Task 10 (Step 6 of
 * its brief) tested all three against `madge` once the AI section's
 * four-way split (`ai/Behaviors.ts`/`ai/Locomotion.ts`/`ai/Attacks.ts`/
 * `Boss.ts`) made every one of those edges one-way, and retired all three —
 * wrongly, for `wakeBoss` (see below).
 *
 * The locator's entries have always been one of two kinds: a bridge to code
 * that had not moved yet (dissolved by extraction, once its target has a
 * module of its own), or a genuine cycle-break (not fixable by extraction
 * at all). Every bridge is gone now. `openPiano` (`src/player/Interact.ts`'s
 * piano-proximity branch) retired in Plan 0F Task 1, once `src/ui/Piano.ts`
 * existed and `madge --circular src/` confirmed `Interact.ts` importing it
 * directly added no cycle. `endLevel` (the level-exit pad,
 * `src/player/Player.ts`) and `showWin` (`src/enemies/Death.ts`'s
 * `bossDeath`) retired in Plan 0F Task 2 the same way, once
 * `src/ui/LevelEnd.ts` existed: `Player.ts` and `Death.ts` each import it
 * directly now, confirmed clean against `madge --circular --extensions
 * ts,js src/` one retirement at a time so a cycle would be attributable to
 * whichever one caused it (neither did).
 *
 * `wakeBoss` is the only cycle-break, and stays. `Damage.ts` importing it
 * from `Boss.ts` closes
 * `Damage.ts -> Boss.ts -> ai/Attacks.ts -> world/Props.ts -> Damage.ts`.
 * It was wrongly retired in Plan 0E Task 10 against a `madge` invocation
 * that was scanning only `src/legacy.js` (its default extensions exclude
 * `.ts`, so the four-file cycle above was never actually checked), and
 * restored in Plan 0F Task 1 once that gate was fixed
 * (`--extensions ts,js`). Unlike the three retired above, extracting more
 * code does not make this one removable — nothing is left to extract, the
 * four files it closes are all real modules already; only breaking one of
 * the other three edges would, and that is a redesign, not a port task.
 *
 * This is NOT the end state. `docs/known-issues.md` KNOWN-2 tracks it: the
 * long-term rule is that systems talk over `core/Events.ts` and never reach
 * into each other, and each phase after this one migrates the systems it
 * touches. By the end of Phase 5 this should hold the renderer and the audio
 * engine and nothing else. `wakeBoss` is a natural first candidate for that
 * bus, once it exists. It is written down as debt rather than hidden.
 */
export const ctx: {
  wakeBoss?: (e: unknown) => void;
} = {};
