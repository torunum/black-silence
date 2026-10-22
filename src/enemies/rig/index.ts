import type { Rig } from "./kit";
import { GHOUL } from "./ghoul";
import { BLOAT } from "./bloat";
import { SPRINTER } from "./sprinter";
import { HORROR } from "./horror";
import { WAILER } from "./wailer";
import { HOUND } from "./hound";
import { DRAGGER } from "./dragger";
import { CULTIST } from "./cultist";
import { GARGOYLE } from "./gargoyle";
import { CACODEMON } from "./cacodemon";
import { LOST_SOUL } from "./lostSoul";
import { REIVER } from "./reiver";
import { SLAUGHTAUR } from "./slaughtaur";
import { PRIEST } from "./priest";
import { PRIEST2 } from "./priest2";
import { SOVEREIGN } from "./sovereign";
import { SOVEREIGN2 } from "./sovereign2";
import { GRAVEDIGGER } from "./gravedigger";
import { GRAVEDIGGER2 } from "./gravedigger2";
import { LEVIATHAN } from "./leviathan";
import { LEVIATHAN2 } from "./leviathan2";
import { FOREMAN } from "./foreman";
import { FOREMAN2 } from "./foreman2";
import { HEART } from "./heart";
import { HEART2 } from "./heart2";
import { GUARDIAN } from "./guardian";
import { EXECUTIONER } from "./executioner";
import { ETTIN } from "./ettin";

/**
 * The monsters that have a rig, by the grid character that spawns them. An
 * enemy in this table is baked from its rig (`SpriteBaker.buildSprites`) and
 * animated by it (`src/enemies/RigAnim.ts`); every other enemy keeps its PXDEF
 * art exactly as it was. The migration is one monster at a time
 * (`docs/superpowers/plans/2026-10-13-enemies.md`): add a key here, and
 * `tests/enemies/legacyDraws.test.ts` holds that the seeded stream the
 * fixtures are recorded under still moves exactly as the legacy bake moved it.
 */
export const RIGS: Readonly<Record<string, Rig>> = { z: GHOUL, t: BLOAT, f: SPRINTER, m: HORROR, s: WAILER, g: HOUND, w: DRAGGER, j: CULTIST, y: GARGOYLE, C: CACODEMON, L: LOST_SOUL, R: REIVER, k: SLAUGHTAUR, n: ETTIN, U: GUARDIAN, E: EXECUTIONER, Q: PRIEST, Q2: PRIEST2, Z: SOVEREIGN, Z2: SOVEREIGN2, N: GRAVEDIGGER, N2: GRAVEDIGGER2, H: LEVIATHAN, H2: LEVIATHAN2, V: FOREMAN, V2: FOREMAN2, G: HEART, G2: HEART2 };

export function rigFor(key: string): Rig | undefined { return RIGS[key]; }
