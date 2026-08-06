import { describe, expect, it } from "vitest";
import { WEAPON_STATS } from "../src/weapons/definitions";
import { ENEMY_DEFS } from "../src/enemies/EnemyDefs";
import { LEVELS } from "../src/world/levels";
import { readLegacyConst } from "./support/legacySource";

/**
 * Cheap, high-value cross-module invariants. Both guard a real way for the
 * port to break silently or loudly as later plans keep carving legacy.js
 * apart from src/weapons, src/enemies and src/world/levels.
 */

describe("WEAPON_STATS length vs. legacy.js player state", () => {
  interface PlayerState {
    mag: number[];
    weapons: boolean[];
  }
  // S.mag and S.weapons are still declared in legacy.js, not yet a module —
  // read live from source rather than importing legacy.js, which reaches
  // into `document`/THREE at module scope and cannot run in Node (see
  // tests/support/legacySource.ts).
  const S = readLegacyConst<PlayerState>("S");

  it("gives WEAPON_STATS exactly one slot per S.mag entry", () => {
    // A ninth weapon added to WEAPON_STATS without extending S.mag would
    // silently desync the magazine index for every weapon after it.
    expect(WEAPON_STATS).toHaveLength(S.mag.length);
  });

  it("gives WEAPON_STATS exactly one slot per S.weapons entry", () => {
    // Same desync risk for the 1-8 hotkey / "do I own this gun" flags.
    expect(WEAPON_STATS).toHaveLength(S.weapons.length);
  });
});

describe("every level-grid character resolves to a known tile", () => {
  // Mirrors loadLevel()'s own per-tile dispatch in legacy.js, in order:
  // SKIP_CHARS are structural, skipped before any dispatch; NAMED_CHARS are
  // handled by name (spawn/exit/torch/candle/piano/challenge plate);
  // PROP_CHARS reach spawnProp(); PICKUP_CHARS are looked up in loadLevel's
  // item map. Anything left over reaches `if(EDEF[ch])spawnEnemy(ch,...)`
  // and must be a real ENEMY_DEFS key — today an unrecognized character
  // just falls through and the tile silently vanishes, but the moment
  // spawnEnemy or its callers read a field off `d` before confirming `d`
  // exists (e.g. reordering the KNOWN-4 dispatch), the same typo throws at
  // level load instead. Either way, an unaccounted-for character is a bug.
  const SKIP_CHARS = ".#WI+DS";
  const NAMED_CHARS = "PXilpY";
  const PROP_CHARS = "xTCFVO";
  const PICKUP_CHARS = ["h", "A", "a", "b", "o", "c", "K", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  const KNOWN_NON_ENEMY = new Set([...SKIP_CHARS, ...NAMED_CHARS, ...PROP_CHARS, ...PICKUP_CHARS]);

  const built = LEVELS.map((def) => [def.name, def.build().g] as const);

  it.each(built)("%s", (_name, grid) => {
    for (const row of grid) {
      for (const ch of row) {
        if (KNOWN_NON_ENEMY.has(ch)) continue;
        expect(
          ENEMY_DEFS,
          `'${ch}' is not a structural, named, prop or pickup character and has no ENEMY_DEFS entry`,
        ).toHaveProperty(ch);
      }
    }
  });
});
