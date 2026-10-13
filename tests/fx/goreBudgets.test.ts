import { describe, expect, it } from "vitest";
import { CORPSE_MAX } from "../../src/enemies/Corpses";
import { CHUNK_MAX } from "../../src/fx/GoreChunks";
import { DROP_MAX, MIST_MAX } from "../../src/fx/GoreDrops";
import { PART_MAX } from "../../src/fx/Parts";
import { BLOB_MAX, GROW_MAX, STREAK_MAX } from "../../src/fx/Splats";
import { SPURT_MAX } from "../../src/fx/Spurt";

/**
 * THE GORE'S BUDGETS, AS DOCUMENTED (impact plan, Task 3; `docs/STATUS.md`).
 * The other gore tests fill each pool "to its cap" and check that it holds,
 * which is a test of the cap and not of its size: a cap raised tenfold passes
 * them all. These are the numbers the plan promised, pinned. Raising one is a
 * decision about memory and draw cost, to be taken on purpose and with
 * STATUS.md in the same commit.
 */
describe("the gore's budgets", () => {
  it("are the ones the plan states", () => {
    expect({ CORPSE_MAX, PART_MAX, BLOB_MAX, STREAK_MAX, GROW_MAX, CHUNK_MAX, DROP_MAX, MIST_MAX, SPURT_MAX }).toEqual({
      CORPSE_MAX: 60, PART_MAX: 20, BLOB_MAX: 224, STREAK_MAX: 96, GROW_MAX: 24, CHUNK_MAX: 160, DROP_MAX: 320, MIST_MAX: 48, SPURT_MAX: 12,
    });
  });
});
