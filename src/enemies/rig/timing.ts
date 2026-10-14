/**
 * THE TIMES A RIGGED MONSTER'S FRAMES ARE SHOWN FOR, in one place with no imports:
 * `src/enemies/RigAnim.ts` (the game) and `src/bestiary/` (the page that plays
 * them for the owner to judge) both read them, and the page must not load the
 * game. `tests/enemies/ghoulRig.test.ts` holds each equal to the game's own
 * constant it mirrors (`HURT_LEN` in `HitReact.ts`, `STAGGER_SECS` and
 * `FALL_SECS` in `Corpse.ts`).
 */

/** Seconds `atkAnim` runs from (`Behaviors.ts`, `Attacks.ts`): the three phases split it. */
export const ATK_LEN = 0.22;
/** The attack's phases as shares of its time: the wind-up ends at the first, the strike at the second, then the recover. */
export const ATK_SPLIT: readonly [number, number] = [0.25, 0.65];
/** How far through the fall (`fallT`) each death frame starts: the jerk, the buckle, the topple, the thud, the lie. */
export const DEATH_AT: readonly number[] = [0, 0.133, 0.31, 0.53, 0.84];
/** The hurt timer (`HURT_LEN`): the pain frames split it. */
export const PAIN_LEN = 0.12;
/** A plain kill's fall (`fallT`'s .45 s), and a beheaded body's stagger and fall. */
export const KILL_FALL = 0.45, STAGGER = 0.28, BEHEAD_FALL = 0.42;
