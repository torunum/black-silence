// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { CELL } from "../../src/world/Grid";
import { DEPTH, floodCells, waterState, waterTick } from "../../src/fx/Water";
import { LEVELS } from "../../src/world/levels/index";
import { paintScum, paintWater, TONES } from "../../src/render/SewerWater";

/**
 * THE SEWERS' WATER (`src/fx/Water.ts`, painted by `src/render/SewerWater.ts`; 2026-10-22). Boots the real game and loads the sewers:
 * the flood lies over exactly the open cells of the level's water rectangles, at each one's floor plus the depth, the scum over it;
 * it flows from a clock with nothing allocated and nothing drawn from `Math.random`; no other level builds any; and it is dressing —
 * no cell of the grid or the height map is touched by it.
 */

let loadLevel: (idx: number) => void;
const SEWERS = LEVELS.findIndex((l) => l.name.includes("SEWERS"));

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
  const { skipOpening } = await import("../../src/world/Opening");
  skipOpening();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

const kids = (name: string) => (renderState.scene.children as THREE.Object3D[]).filter((c) => c.name === name) as THREE.Mesh[];

describe("the sewers' water", () => {
  it("floods the open cells of the sewers' rectangles, at each one's floor plus the depth, and only them", () => {
    loadLevel(SEWERS);
    const rects = LEVELS[SEWERS].build().water!;
    expect(rects.length).toBeGreaterThanOrEqual(4);
    const cells = floodCells(world.grid, rects);
    expect(cells.length, "a real flood, not a puddle").toBeGreaterThan(300);
    const [sheet] = kids("water"), [scum] = kids("waterScum");
    expect(sheet && scum).toBeTruthy();
    const pos = sheet.geometry.getAttribute("position");
    expect(pos.count).toBe(cells.length * 6);
    for (let i = 0; i < cells.length; i++) {
      const [x, z] = cells[i];
      expect("#WDS+".includes(world.grid[z][x]), `(${x},${z}) is open`).toBe(false);
      const y = pos.getY(i * 6), floor = world.heightMap?.[z]?.[x] || 0;
      expect(y).toBeCloseTo(floor + DEPTH, 5);
      expect(Math.floor(pos.getX(i * 6) / CELL)).toBe(x);
      expect(Math.floor(pos.getZ(i * 6) / CELL)).toBe(z);
    }
    expect(scum.position.y, "the scum rides on the water").toBeGreaterThan(0);
    expect((scum.material as THREE.MeshLambertMaterial).alphaTest).toBeGreaterThan(0);
  });

  it("flows: the sheet and the scum move at different speeds and the same clock gives the same water", () => {
    const run = (): number[] => {
      loadLevel(SEWERS);
      const s = waterState();
      for (let i = 0; i < 600; i++) waterTick(1 / 60);
      return [s.sheet!.offset.x, s.sheet!.offset.y, s.scum!.offset.x, s.scum!.offset.y];
    };
    const a = run();
    expect(a).toEqual(run());
    expect(Math.hypot(a[0], a[1]), "the water flows").toBeGreaterThan(.2);
    expect(Math.hypot(a[0], a[1]) / Math.hypot(a[2], a[3]), "the scum slower").toBeGreaterThan(1.3);
  });

  it("allocates nothing and draws no dice per frame", () => {
    const src = readFileSync(join(__dirname, "../../src/fx/Water.ts"), "utf8");
    const body = src.slice(src.indexOf("export function waterTick"), src.indexOf("/** What the flood holds"));
    expect(body.length).toBeGreaterThan(100);
    for (const bad of [/\bnew\b/, /\.clone\(/, /Math\.random/, /=> /, /= \[/]) expect(body, String(bad)).not.toMatch(bad);
    expect(src + readFileSync(join(__dirname, "../../src/render/SewerWater.ts"), "utf8")).not.toMatch(/Math\.random\(/);
  });

  it("the womb's is blood: the same flood in red", () => {
    const WOMB = LEVELS.findIndex((l) => l.name.includes("WOMB"));
    const L = LEVELS[WOMB].build();
    expect(L.fluid).toBe("blood");
    loadLevel(WOMB);
    expect(kids("water").length).toBe(1);
    const b = paintWater(81, TONES.blood);
    let r = 0, g = 0;
    for (let i = 0; i < b.data.length; i += 4) { r += b.data[i]; g += b.data[i + 1]; }
    expect(r, "red, not green").toBeGreaterThan(g * 2.5);
  });

  it("is built nowhere else, and changes nothing a body walks on", () => {
    for (let i = 0; i < LEVELS.length; i++) {
      if (i === SEWERS || LEVELS[i].name.includes("WOMB")) continue;
      loadLevel(i);
      expect(kids("water").length, LEVELS[i].name).toBe(0);
      expect(waterState().built).toBe(false);
    }
    const L = LEVELS[SEWERS].build(), dry = { ...L, water: undefined };
    expect(JSON.stringify(L.g)).toBe(JSON.stringify(dry.g));
    expect(JSON.stringify(L.hmap)).toBe(JSON.stringify(dry.hmap));
  });

  it("paints wrapping textures: a sheet with no holes and a scum that is opaque or gone", () => {
    const w = paintWater(81), s = paintScum(91);
    let holes = 0, filth = 0, half = 0;
    for (let i = 3; i < w.data.length; i += 4) if (w.data[i] !== 255) holes++;
    for (let i = 3; i < s.data.length; i += 4) { if (s.data[i] === 255) filth++; else if (s.data[i] !== 0) half++; }
    expect(holes).toBe(0);
    expect(half).toBe(0);
    expect(filth / (s.w * s.h)).toBeGreaterThan(.05);
    expect(filth / (s.w * s.h)).toBeLessThan(.45);
  });
});
