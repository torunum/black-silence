// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { LEVELS } from "../../src/world/levels/index";
import { measureLevel } from "../../src/world/density";
import { LIGHT_BUDGET, lampsOf } from "../../src/world/decor/lamps";

/**
 * THE EMPTINESS MEASURE AGREES WITH THE LOADER (levels-feel-full plan, Task 1).
 * `src/world/density.ts` counts a `BuiltLevel`'s glyphs by `loadLevel`'s own
 * dispatch order; this loads every level for real and holds each count equal
 * to what the loader put in the world — enemies, props (the piano included),
 * items by kind, torches, candles — and the measured lights equal to the
 * scene's point lights less the four every level has (the player's lamp and
 * its core, the muzzle flash, the explosion). If the loader learns a new
 * glyph, or a level table a new kind of light, this goes red and
 * `docs/level-density.md` is not to be trusted until the measure is taught it.
 */

let loadLevel: (idx: number) => void;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
});

describe.each(LEVELS.map((l, i) => ({ i, name: l.name })))("$name", ({ i }) => {
  it("is counted the way the loader builds it", () => {
    const d = measureLevel(LEVELS[i].build());   // the builder's own grid, before `loadLevel` empties it
    loadLevel(i);
    expect(world.enemies.length, "enemies").toBe(d.enemies);
    expect(world.props.length, "props (the piano is one)").toBe(d.propsTotal);
    expect(world.items.length, "pickups").toBe(d.pickupsTotal);
    expect(world.torches.length, "torches").toBe(d.torches);
    expect(world.candles.length, "candles").toBe(d.candles);

    const kinds: Record<string, number> = {};
    for (const it of world.items as unknown as Array<{ kind: string }>) {
      const k = /^w\d$/.test(it.kind) ? "weapon" : it.kind;
      kinds[k] = (kinds[k] || 0) + 1;
    }
    expect(kinds, "pickups by kind").toEqual(d.pickups);

    let point = 0;
    renderState.scene.traverse((o) => { if ((o as THREE.PointLight).isPointLight) point++; });
    expect(point - 4, "lights").toBe(d.lights);
    // the light budget (levels-feel-full plan, Task 3): no level's scene holds more point lights than level 3's 21, and each
    // light-bearing decor piece is exactly one of them, named `decorLamp`
    expect(point, "point lights in the scene, the player's four included").toBeLessThanOrEqual(LIGHT_BUDGET);
    const lamps: string[] = [];
    renderState.scene.traverse((o) => { if (o.name === "decorLamp") lamps.push(o.name); });
    expect(lamps.length, "decorLamp lights").toBe(lampsOf(LEVELS[i].build().decor).length);
  });
});
