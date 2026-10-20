import type { LevelScript } from "../script/LevelScript";

/**
 * The Ash Bell Monastery's script (`../script/LevelScript.ts`): the two seals and the gate under the courtyard that wants both, the
 * crematorium's service door barred on the courtyard's side, the four niches the great bell opens, the bell's lever at the top of the
 * tower, and the freight lift from the bell chamber (6.0) down into the courtyard (1.2), chained at the top until the bell is rung.
 */
export const MONASTERY_SCRIPT: LevelScript = {
  seals: [{ kind: "seal_ash", name: "ASH SEAL" }, { kind: "seal_bell", name: "BELL SEAL" }],
  gates: [{ at: [41, 27], needs: ["seal_ash", "seal_bell"] }],
  oneWay: [{ at: [35, 52], from: "w", barred: "BARRED FROM THE OTHER SIDE" }],
  niches: [[42, 58], [58, 58], [64, 41], [64, 53]],
  lever: [57, 37],
  lift: { cells: [[58, 38], [59, 38]], low: 1.2, high: 6.0, speed: 2.2, foot: [[58, 39], [59, 39]] },
};
