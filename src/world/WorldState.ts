/**
 * Everything loadLevel() builds and the systems read for the rest of the
 * level: the tile grid and its dimensions, the height map and wall
 * segments used by collision, and the live entity lists.
 *
 * The spec's inventory also assigns challenge/bossRef/poisonZones/rings/
 * strikes/cine/eventT/idleT to this owner (spec §3). They are NOT here:
 * they are still bare mutable globals in src/legacy.js, declared on the
 * continuation line of the very same `let` statement as this module's own
 * 13 fields, and are migrated separately as Task 8b rather than folded into
 * this task — see the plan doc's "Correction, found during Task 8" note.
 *
 * Element types are deliberately loose. These arrays hold object literals
 * built inline by loadLevel and mutated by half a dozen systems; typing
 * them properly is Plan 0E's job, once the systems that own them have
 * moved and their real shapes are settled.
 */
export const world = {
  grid: [] as string[][],
  GW: 0,
  GH: 0,
  heightMap: null as number[][] | null,
  wallSegs: [] as Array<Record<string, unknown>>,
  doors: {} as Record<string, Record<string, unknown>>,
  enemies: [] as Array<Record<string, unknown>>,
  props: [] as Array<Record<string, unknown>>,
  items: [] as Array<Record<string, unknown>>,
  torches: [] as Array<Record<string, unknown>>,
  candles: [] as Array<Record<string, unknown>>,
  exitPos: null as Record<string, unknown> | null,
  pianoPos: null as Record<string, unknown> | null,
};
