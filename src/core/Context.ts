/**
 * The service locator, and deliberate debt.
 *
 * Plan 0E moves functions, and two situations make a direct import
 * impossible. Some pairs call each other **both ways** — enemy AI damages the
 * player and the player queries enemies — which `madge --circular` forbids.
 * And a system that has already moved sometimes has to call one that has not:
 * this module is born in the level-loader task because `explodeBarrel` calls
 * `damagePlayer` and `damageEnemy`, neither of which becomes a module until
 * Tasks 7 and 9.
 *
 * Each entry is registered by whoever owns the function *at the time*: today
 * `legacy.js` registers both, and when Tasks 7 and 9 extract them,
 * `Player.ts` and `Damage.ts` register them instead — and no call site
 * changes. That is the property that lets the remaining tasks land in order
 * without rewriting each other's call sites.
 *
 * This is NOT the end state. `docs/known-issues.md` KNOWN-2 tracks it: the
 * long-term rule is that systems talk over `core/Events.ts` and never reach
 * into each other, and each phase after this one migrates the systems it
 * touches. By the end of Phase 5 this should hold the renderer and the audio
 * engine and nothing else. It is written down as debt rather than hidden.
 */
export const ctx: {
  damagePlayer?: (d: number, silent?: boolean) => void;
  damageEnemy?: (e: unknown, dmg: number, info?: unknown) => void;
} = {};
