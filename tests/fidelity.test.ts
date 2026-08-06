import { describe, expect, it } from "vitest";
import * as Builder from "../src/world/LevelBuilder";
import { LEVELS } from "../src/world/levels";
import { ENEMY_DEFS } from "../src/enemies/EnemyDefs";
import { WEAPON_STATS } from "../src/weapons/definitions";
import { MONOLOGUE } from "../src/content/monologue";
import { evalReference, REF, refSource } from "./support/reference";

/**
 * The fidelity oracle. reference/sonsurum.html is a frozen golden master —
 * see the Phase 0 Global Constraints, "reference/sonsurum.html is never
 * edited" — but until this file, nothing in the suite actually consulted
 * it. Every "this was extracted verbatim" claim on this branch was proved
 * by a throwaway script and then discarded.
 *
 * This test parses the reference, evaluates the relevant source blocks out
 * of it (see tests/support/reference.ts), and deep-compares them against
 * what the modules now export. To extend it as later plans carve more code
 * out: add the new range to REF in tests/support/reference.ts, then add a
 * describe block here following the pattern of the ones below.
 */

const LEVEL_BUILDER_CHUNKS = [refSource(REF.levelBuilder), refSource(REF.put1)];

describe("LevelBuilder vs. reference (fixture comparison)", () => {
  const ref = evalReference<typeof Builder>(
    LEVEL_BUILDER_CHUNKS,
    "({emptyGrid,link,put,putAbs,blankGrid,carve,hall,aperture,pillarsRing,roomXZ,put1})",
  );

  it("emptyGrid/link/put/putAbs agree on a room-lattice fixture", () => {
    const run = (fns: typeof ref) => {
      const L = fns.emptyGrid(3, 2, 5, 4);
      fns.link(L, [0, 0], [1, 0], "door");
      fns.link(L, [1, 0], [2, 0], "locked");
      fns.link(L, [0, 0], [0, 1], "secret");
      fns.link(L, [1, 0], [1, 1], "open");
      fns.put(L, 0, 0, 2, 1, "K");
      fns.putAbs(L, 4, 4, "z");
      return L.g;
    };
    expect(run(Builder)).toEqual(run(ref));
  });

  it("blankGrid/carve/hall/aperture/pillarsRing/put1 agree on a free-form fixture", () => {
    const run = (fns: typeof ref) => {
      const { g } = fns.blankGrid(14, 10);
      fns.carve(g, 1, 1, 6, 6);
      fns.hall(g, 6, 3, 12, 8, 1);
      fns.aperture(g, 3, 1);
      fns.pillarsRing(g, 1, 1, 6, 6, 2);
      fns.put1(g, 2, 2, "x");
      return g;
    };
    expect(run(Builder)).toEqual(run(ref));
  });

  it("roomXZ agrees on a room-offset fixture", () => {
    const layout = { rw: 5, rh: 4 } as Builder.RoomLayout;
    expect(Builder.roomXZ(layout, 1, 1, 2, 3)).toEqual(ref.roomXZ(layout, 1, 1, 2, 3));
  });
});

interface RefLevelDef {
  name: string;
  build: () => { g: string[][]; W: number; H: number; hmap?: number[][]; segs?: unknown[] };
  fog: number;
  fogD: number;
  amb: number;
  ambI: number;
  floor: string;
  sub: string;
  hell?: boolean;
  dungeon?: boolean;
  flesh?: boolean;
}

const LEVEL_CHUNKS = [
  refSource(REF.levelBuilder),
  refSource(REF.put1),
  refSource(REF.buildPrologue),
  refSource(REF.buildLevel1),
  refSource(REF.buildLevel2),
  refSource(REF.buildLevel3),
  refSource(REF.buildLevel4),
  refSource(REF.buildLevel5),
  refSource(REF.buildLevel6),
  refSource(REF.buildLevel7),
  refSource(REF.levels),
];
const refLevels = evalReference<RefLevelDef[]>(LEVEL_CHUNKS, "LEVELS");

describe("LEVELS vs. reference", () => {
  it("declares the same eight levels, in order, with identical metadata", () => {
    const meta = (defs: ReadonlyArray<{ build: unknown }>) =>
      defs.map(({ build, ...rest }) => rest);
    expect(meta(LEVELS)).toEqual(meta(refLevels));
  });

  it.each(LEVELS.map((def, i) => [def.name, def, refLevels[i]] as const))(
    "%s builds the identical grid (plus hmap/segs where present)",
    (_name, def, refDef) => {
      const built = def.build();
      const refBuilt = refDef.build();
      expect(built.g).toEqual(refBuilt.g);
      expect(built.hmap).toEqual(refBuilt.hmap);
      expect(built.segs).toEqual(refBuilt.segs);
    },
  );
});

describe("ENEMY_DEFS vs. reference", () => {
  const refEdef = evalReference<typeof ENEMY_DEFS>([refSource(REF.enemyDefs)], "EDEF");

  it("has the identical key set", () => {
    expect(Object.keys(ENEMY_DEFS).sort()).toEqual(Object.keys(refEdef).sort());
  });

  it("matches every field of every entry", () => {
    expect(ENEMY_DEFS).toEqual(refEdef);
  });
});

describe("WEAPON_STATS vs. reference", () => {
  interface RefWeapon extends Record<string, unknown> {
    snd: () => void;
  }
  const refWeapons = evalReference<RefWeapon[]>([refSource(REF.weapons)], "WEAPONS");

  it("matches every field except snd, slot for slot, in order", () => {
    const stripped = refWeapons.map(({ snd, ...rest }) => rest);
    expect(WEAPON_STATS).toEqual(stripped);
  });
});

describe("MONOLOGUE vs. reference", () => {
  const refM = evalReference<typeof MONOLOGUE>([refSource(REF.monologue)], "M");

  it("has the identical key set", () => {
    expect(Object.keys(MONOLOGUE).sort()).toEqual(Object.keys(refM).sort());
  });

  it("matches every line of every key", () => {
    expect(MONOLOGUE).toEqual(refM);
  });
});
