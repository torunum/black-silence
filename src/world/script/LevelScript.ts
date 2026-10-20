/**
 * A LEVEL'S SCRIPT (the Ash Bell Monastery, owner 2026-10-20): the few things a grid of cells cannot say, written as data beside the
 * grid and run by `./ScriptRun.ts`. Every door below is an ordinary door on the grid (`+`); the script only says when it may open.
 *
 *  - **seals**: pickups a gate wants (the grid's `J` and `M`: the Ash Seal and the Bell Seal), shown by the HUD's key line;
 *  - **gate**: a door that opens when every seal it names is held — and says which it still wants when it does not;
 *  - **oneWay**: a door barred on one side, opened only from the other (a service door that is a shortcut only once it is earned);
 *  - **niches**: doors that will not move until the bell is rung, and then all open at once (what waited behind them comes out);
 *  - **lever**: a cell where `E` rings the great bell: one toll, the niches open, the lift's chain comes loose;
 *  - **lift**: a cage of cells whose floor rides between two heights, chained at the top until the lever frees it; `E` in it, or at its
 *    foot, sends it to the other end.
 */

export type Side = "n" | "s" | "e" | "w";
export type Cell2 = readonly [number, number];

export interface SealDef { kind: string; name: string }
export interface GateDef {
  at: Cell2; needs: readonly string[];
  /** The side it is approached from, where its marks hang (default south). */
  face?: Side;
}
export interface OneWayDef { at: Cell2; from: Side; barred: string }
export interface LiftDef {
  /** The cage's cells. */
  cells: readonly Cell2[];
  /** Its two floors, world units. It starts at `high`. */
  low: number; high: number;
  /** World units a second. */
  speed: number;
  /** The cells beside its foot where `E` calls it down. */
  foot: readonly Cell2[];
}

export interface LevelScript {
  seals?: readonly SealDef[];
  gates?: readonly GateDef[];
  oneWay?: readonly OneWayDef[];
  niches?: readonly Cell2[];
  lever?: Cell2;
  lift?: LiftDef;
}

/** Where the player stands relative to a door at `at`, by the larger offset (for `oneWay`). */
export function sideOf(at: Cell2, px: number, pz: number, cell: number): Side {
  const dx = px / cell - (at[0] + 0.5), dz = pz / cell - (at[1] + 0.5);
  return Math.abs(dx) > Math.abs(dz) ? (dx < 0 ? "w" : "e") : (dz < 0 ? "n" : "s");
}
