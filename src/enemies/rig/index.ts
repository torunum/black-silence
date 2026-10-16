import type { Rig } from "./kit";
import { GHOUL } from "./ghoul";
import { BLOAT } from "./bloat";
import { SPRINTER } from "./sprinter";
import { HORROR } from "./horror";
import { WAILER } from "./wailer";
import { HOUND } from "./hound";
import { DRAGGER } from "./dragger";
import { CULTIST } from "./cultist";
import { LOST_SOUL } from "./lostSoul";
import { CACODEMON } from "./cacodemon";
import { ETTIN } from "./ettin";
import { SLAUGHTAUR } from "./slaughtaur";
import { GARGOYLE } from "./gargoyle";
import { REIVER } from "./reiver";

/**
 * The monsters that have a rig, by the grid character that spawns them. An
 * enemy in this table is baked from its rig (`SpriteBaker.buildSprites`) and
 * animated by it (`src/enemies/RigAnim.ts`); every other enemy keeps its PXDEF
 * art exactly as it was. The migration is one monster at a time
 * (`docs/superpowers/plans/2026-10-13-enemies.md`): add a key here, and
 * `tests/enemies/legacyDraws.test.ts` holds that the seeded stream the
 * fixtures are recorded under still moves exactly as the legacy bake moved it.
 */
export const RIGS: Readonly<Record<string, Rig>> = { z: GHOUL, t: BLOAT, f: SPRINTER, m: HORROR, s: WAILER, g: HOUND, w: DRAGGER, j: CULTIST, L: LOST_SOUL, C: CACODEMON, n: ETTIN, k: SLAUGHTAUR, y: GARGOYLE, R: REIVER };

export function rigFor(key: string): Rig | undefined { return RIGS[key]; }
