/**
 * The service locator, and deliberate debt.
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
 * `Boss.ts`) made every one of those edges one-way, and retired all three:
 * `Damage.ts` now imports `wakeBoss` from `Boss.ts` directly, and
 * `Props.ts`/`Hitscan.ts`/`WeaponState.ts` import `damageEnemy` from
 * `Damage.ts` and `damagePlayer` from `Player.ts` directly. See
 * `.superpowers/sdd/2026-08-15-phase0e-systems/task-10c-report.md` for the
 * `madge` evidence.
 *
 * The three entries left are all the second kind — a bridge to code that
 * stays in `legacy.js` for Plan 0F, so there is nothing yet to import
 * directly: `endLevel` (level-exit pad, `src/player/Player.ts`), `openPiano`
 * (`src/player/Interact.ts`) and `showWin` (`src/enemies/Death.ts`). Each is
 * registered by `legacy.js`, the only place that still owns the function it
 * points at; when Plan 0F extracts them, the module that ends up owning each
 * one registers it instead, the same handoff `Player.ts` and `Damage.ts`
 * used for `damagePlayer`/`damageEnemy` while those still lived here — and
 * no call site changes when that happens.
 *
 * This is NOT the end state. `docs/known-issues.md` KNOWN-2 tracks it: the
 * long-term rule is that systems talk over `core/Events.ts` and never reach
 * into each other, and each phase after this one migrates the systems it
 * touches. By the end of Phase 5 this should hold the renderer and the audio
 * engine and nothing else. It is written down as debt rather than hidden.
 */
export const ctx: {
  endLevel?: () => void;
  openPiano?: () => void;
  showWin?: () => void;
} = {};
