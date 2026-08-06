// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { TEX, buildTextures } from "../../src/render/ProcTextures";

describe("buildTextures", () => {
  beforeAll(() => {
    installDomStubs();
    buildTextures();
  });

  it("produces every texture the game looks up by name", () => {
    // Every key read off TEX anywhere in the codebase. A missing one is a
    // material with an undefined map — an invisible or black surface.
    const expected = [
      "dungeonWall", "churchWall", "window", "dungeonFloor", "churchFloor",
      "ceil", "door", "doorLocked", "pillar", "wood", "barrel",
      "fleshWall", "fleshFloor", "fleshCeil", "fleshDoor",
      "hellWall", "hellFloor", "hellCeil", "stair",
    ];
    for (const key of expected) {
      expect(TEX[key], `TEX.${key} missing`).toBeDefined();
    }
  });

  it("gives every texture nearest-neighbour filtering and repeat wrapping", () => {
    // The pixelated look is art direction, not a default. Linear filtering
    // here would silently blur every surface in the game.
    for (const [key, tex] of Object.entries(TEX)) {
      expect(tex.magFilter, `${key} magFilter`).toBe(1003); // THREE.NearestFilter
      expect(tex.minFilter, `${key} minFilter`).toBe(1003);
      expect(tex.wrapS, `${key} wrapS`).toBe(1000);         // THREE.RepeatWrapping
      expect(tex.wrapT, `${key} wrapT`).toBe(1000);
    }
  });
});
