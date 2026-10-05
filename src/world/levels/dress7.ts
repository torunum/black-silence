import type { DecorSpec, Grid } from "../LevelBuilder";
import { Decorator, type PlaceOptions } from "../decor/place";

/**
 * LEVEL 7 — THE WOMB, dressed (levels-feel-full plan, Task 3).
 *
 * The reference's womb names its rooms after a body ("the maw", "gullet", "bile junction", "artery
 * hall", "lung sac", "the great ventricle", "cloaca", "heart valve", "gland cyst") and puts no
 * flesh in any of them: the walls are the only organ. Here the body is built in:
 *
 *  - THE MAW (x 1-7, z 1-5) and THE GULLET AND BILE JUNCTION (x 9-23, z 1-5): tumours on the walls,
 *    eyes that watch the corridor, cords of sinew from floor to vault, pods, veins on the floor, a
 *    glowing bulb where the throat is longest.
 *  - THE GREAT VENTRICLE (x 9-23, z 7-17, and the nerve cluster and heart valve that open onto it:
 *    one hall 23 wide): tumours on its rim, pods and growths between them, eyes on the walls, two bulbs
 *    lighting its length. **Its floor is left open**: no solid piece stands further than one cell
 *    from a wall (the grid's own pillars are its columns), and tendrils hang in the air above.
 *  - THE BOSS HALL (x 9-23, z 19-23): tumours against the north and south walls, the three middle rows
 *    clear, a bulb over them.
 *  - Every other room: growths, pods, eyes, sinew, tendrils and veins from the womb's vocabulary.
 *
 * The tumours are masses (`decor/masses.ts`); everything else is soft and walked through. The
 * placement rules keep every mass out of every corridor, doorway and junction and off every
 * pickup. No trace fixture records this level. The four bulbs are its four extra point lights.
 */

export const VENTRICLE = (x: number, z: number): boolean => x >= 9 && x <= 31 && z >= 7 && z <= 17;
export const HALL = (x: number, z: number): boolean => x >= 9 && x <= 23 && z >= 19 && z <= 23;

export function dressLevel7(L: { g: Grid; W: number; H: number }): DecorSpec[] {
  const d = new Decorator(L, "womb");
  const at = (k: string, cells: ReadonlyArray<readonly [number, number]>, o: PlaceOptions = {}) => { for (const [x, z] of cells) d.place(k, x, z, o); };

  // THE MAW and THE GULLET
  at("growth", [[13, 1], [19, 1]], { side: "n" });
  at("tumor", [[7, 2]], { side: "e" });
  at("growth", [[7, 4]], { side: "e" });
  at("growth", [[13, 5]], { side: "s" });
  at("eye", [[3, 1], [5, 1], [14, 1], [18, 1]], { side: "n" });
  d.place("eye", 17, 5, { side: "s" });
  at("sinew", [[9, 1], [12, 1], [20, 1], [23, 1]], { side: "n" });
  at("pod", [[9, 5], [20, 5]], { side: "s" });
  at("drape", [[4, 3], [12, 3], [17, 3], [21, 3]]);

  // THE GREAT VENTRICLE — the rim only
  at("tumor", [[22, 7]], { side: "n" });
  at("growth", [[27, 7]], { side: "n" });
  at("growth", [[18, 7], [26, 7]], { side: "n" });
  at("tumor", [[13, 17]], { side: "s" });
  at("growth", [[19, 17]], { side: "s" });
  at("growth", [[27, 17]], { side: "s" });
  at("tumor", [[9, 8], [9, 10], [9, 14]], { side: "w" });
  at("eye", [[16, 7], [10, 7]], { side: "n" });
  at("eye", [[16, 17]], { side: "s" });
  at("pod", [[30, 7], [26, 13]]);
  at("drape", [[13, 10], [19, 10], [13, 14], [19, 14], [28, 9], [28, 15], [16, 9], [16, 15]]);
  d.place("glowbulb", 16, 7.28);
  d.place("glowbulb", 16, 16.72);
  d.place("glowbulb", 29, 11.28);

  // THE BOSS HALL
  at("growth", [[13, 19], [19, 19]], { side: "n" });
  at("growth", [[13, 23]], { side: "s" });
  at("growth", [[19, 23]], { side: "s" });
  at("eye", [[10, 19], [22, 19]], { side: "n" });
  at("pod", [[11, 23], [21, 23]], { side: "s" });
  at("drape", [[13, 21], [19, 21]]);
  d.place("glowbulb", 16, 23.28);

  // THE WEST SHAFT and THE MARROW CYST
  at("tumor", [[1, 8], [1, 15]], { side: "w" });
  at("pod", [[1, 18], [7, 21], [1, 21]]);

  d.clutter({ density: .5, seed: 71 });
  d.clutter({ density: .2, seed: 72, interior: true, kinds: ["vein", "drape"] });
  // THE DIM BULBS — glow only, in the side rooms the four real bulbs do not reach
  for (const [x, z] of [[1, 1], [27, 1], [31, 2], [5, 10], [1, 19], [5, 22], [9, 22], [29, 19], [25, 22]]) d.place("bulbDim", x, z);
  // THE CHECKPOINTS — a dull bulb of flesh at each of the east column's outer doors (28,6 and 28,18): it quickens when the player passes (src/world/Checkpoints.ts)
  for (const [x, z, side] of [[27, 5, "s"], [27, 19, "n"]] as const) d.place("quickening", x, z, { side });
  return d.specs;
}
