/**
 * WHERE A DOOR CAN STAND — the pure half of `ExitDoor.ts` (deeper-levels plan, Task 2).
 *
 * The rule `ExitDoor.ts` argues at length (its header) is one function of a grid and a floor: the nearest `#`
 * wall in four directions from a cell, within `reach` cells, on a floor within `LEDGE` of the cell's own. It
 * was written against the live `world`; the level-structure validation (`src/world/structure/`) has to ask the
 * same question of a `BuiltLevel` that was never loaded, so the rule lives here, free of three.js and the
 * world, and `ExitDoor.ts` calls it with `world.grid` and the live floor. One rule, two callers.
 *
 * The raw grid and the loaded one agree for this question: the loader turns glyph cells (`P`, `X`, enemies,
 * pickups) into `.` and leaves `#`, `I`, `W`, `+`, `D` and `S` as they are, and those are the only cells the
 * search tells apart from open floor.
 */

/** The cells `openExit` tries, in order — moved here from `Death.ts` unchanged. */
export const EXIT_CELLS: ReadonlyArray<readonly [number, number]> = [[16, 16], [16, 15], [15, 16], [17, 16], [16, 17]];
/** The bosses whose death opens the exit (`bossDeath`'s `openExit` arms). */
export const EXIT_BOSSES = "QZNHV";
export const EXIT_REACH = 3, ENTRANCE_REACH = 4;

/** South, north, east, west — an exit has no side to prefer. */
export const ANY: ReadonlyArray<readonly [number, number]> = [[0, 1], [0, -1], [1, 0], [-1, 0]];
/** North first: the player starts facing south, so the way they came in is behind them. */
export const BEHIND: ReadonlyArray<readonly [number, number]> = [[0, -1], [-1, 0], [1, 0], [0, 1]];

/** Where a door stands: the cell to stand in, which way the wall is, and how far. */
export interface Site {
  /** The cell in front of the door. */
  sx: number; sz: number;
  /** The direction from that cell to the wall. */
  dx: number; dz: number;
  /** Cells from the cell searched from to the wall. */
  k: number;
  /** The door has no wall to stand in and brings a slab of its own. */
  slab: boolean;
}

/** The most the floor at a door may differ from the floor at the exit cell it serves: under the player's step-up of 1.2. */
export const LEDGE = 0.9;

/** The nearest wall from a cell on a grid. `floorOf(cx, cz)` is the floor under a cell's centre. With `edge`, the grid's own edge counts as a wall (a `slab` site). */
export function siteDoorIn(
  grid: ReadonlyArray<ArrayLike<string>>, floorOf: (cx: number, cz: number) => number,
  cx: number, cz: number, reach: number, order: ReadonlyArray<readonly [number, number]>, edge = false,
): Site | null {
  let best: Site | null = null;
  for (const [dx, dz] of order) {
    for (let k = 1; k <= reach; k++) {
      const ch = grid[cz + dz * k]?.[cx + dx * k];
      if (ch !== undefined && "IW+DS".includes(ch)) break;
      if (ch === "#" || (ch === undefined && edge)) {
        const sx = cx + dx * (k - 1), sz = cz + dz * (k - 1);
        // a wall on a ledge the player cannot step up to (level 3's south gallery, 2.3 above the nave's step) is no wall to stand at
        if (Math.abs(floorOf(sx, sz) - floorOf(cx, cz)) > LEDGE) break;
        if (!best || k < best.k) best = { sx, sz, dx, dz, k, slab: ch === undefined };
        break;
      }
      if (ch === undefined) break;
    }
  }
  return best;
}
