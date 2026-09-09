import type { Enemy } from "../enemies/Enemy";

/**
 * Everything loadLevel() builds and the systems read for the rest of the
 * level: the tile grid and its dimensions, the height map and wall
 * segments used by collision, and the live entity lists.
 *
 * The spec's inventory also assigns challenge/bossRef/poisonZones/rings/
 * strikes/cine/eventT/idleT to this owner (spec §3) — they are the eight
 * fields below. They were bare mutable globals in src/legacy.js, declared
 * on the continuation line of the very same `let` statement as this
 * module's other 13 fields; Task 8 migrated those 13 here and deliberately
 * left these eight behind as a standalone statement, migrated separately
 * as Task 8b — see the plan doc's "Correction, found during Task 8" note.
 *
 * Element types are deliberately loose — **except `enemies`/`bossRef`,
 * which are no longer**. Phase 3 Part A derived one `Enemy`
 * (`src/enemies/Enemy.ts`) from `spawnEnemy`'s object literal, made
 * `spawnEnemy` return it, and typed this array with it. That is what turns
 * the shared interface from a convention into a checked contract: before
 * it, every one of the fifteen consumers reached this array through its own
 * `as unknown as …[]` cast, so a consumer could invent any field it liked
 * and the compiler had nothing to compare the claim against (KNOWN-13).
 * Now a read of a field `Enemy` does not declare is an error at the read
 * site. `bossRef` holds one of this array's elements — `spawnEnemy` assigns
 * the very object it just pushed — so it carries the same type.
 *
 * The other element types are still loose: those arrays hold object
 * literals built inline by loadLevel and mutated by half a dozen systems;
 * giving each of them the `Enemy` treatment is later work.
 */
export const world = {
  grid: [] as string[][],
  GW: 0,
  GH: 0,
  heightMap: null as number[][] | null,
  wallSegs: [] as Array<Record<string, unknown>>,
  doors: {} as Record<string, Record<string, unknown>>,
  enemies: [] as Enemy[],
  props: [] as Array<Record<string, unknown>>,
  items: [] as Array<Record<string, unknown>>,
  torches: [] as Array<Record<string, unknown>>,
  candles: [] as Array<Record<string, unknown>>,
  exitPos: null as Record<string, unknown> | null,
  pianoPos: null as Record<string, unknown> | null,
  challenge: null as Record<string, unknown> | null,
  bossRef: null as Enemy | null,
  poisonZones: [] as Array<Record<string, unknown>>,
  rings: [] as Array<Record<string, unknown>>,
  strikes: [] as Array<Record<string, unknown>>,
  cine: null as Record<string, unknown> | null,
  eventT: 40,
  idleT: 28,
};
