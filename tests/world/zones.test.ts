// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { player } from "../../src/player/PlayerState";
import { S } from "../../src/core/State";
import { CELL, EYE } from "../../src/world/Grid";
import { floorHeightAt } from "../../src/world/Collision";
import { LEVELS } from "../../src/world/levels/index";
import { ZONES } from "../../src/world/levels/prologue";
import { currentRoom } from "../../src/audio/AudioEngine";
import { surfaceHere } from "../../src/audio/Surface";
import { MONOLOGUE } from "../../src/content/monologue";
import type { ZoneTheme } from "../../src/world/LevelBuilder";

/**
 * ZONES — one level, regions with looks of their own (the prologue plan,
 * Task 1: `src/world/ZoneLook.ts`, `Zones.ts`, `LevelMeshes.ts`, and the
 * zone branches in `Ceiling.ts` and `Trim.ts`).
 *
 * The prologue is the one zoned level. This boots the real game (NEW GAME,
 * then `loadLevel`, the way `geometry.test.ts` does) and checks, against the
 * zone map rather than against the code under test:
 *
 * 1. every wall, floor and platform instance wears its own cell's zone
 *    texture — read back off the built scene, cell by cell;
 * 2. the other seven levels have no zones and build exactly the children
 *    they always did (one wall mesh, one floor plane, no zone meshes, no
 *    decor) in their own level's textures;
 * 3. crossing into hell eases the fog, switches the reverb room and the
 *    footsteps, and has ADEM say his hell line — once;
 * 4. the exit leads to level 1, through the real exit pad and level-end button;
 * 5. torches and items stand on the raised ground, and bob there;
 * 6. none of it draws from `Math.random`.
 */

let skipOpening: () => void;
let loadLevel: (idx: number) => void;
let zoneTick: (dt: number) => void;
let playerTick: (dt: number) => void;
let itemsTick: (dt: number) => void;
let TEX: Record<string, THREE.Texture>;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ zoneTick } = await import("../../src/world/Zones"));
  ({ playerTick } = await import("../../src/player/Player"));
  ({ itemsTick } = await import("../../src/player/Interact"));
  ({ TEX } = await import("../../src/render/ProcTextures"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  // The prologue opens in its grave, input locked (src/world/Opening.ts): skip it, as any key would.
  ({ skipOpening } = await import("../../src/world/Opening"));
  skipOpening();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

const kids = (name: string) => (renderState.scene.children as THREE.Object3D[]).filter((c) => c.name === name);

/** Each instance of an InstancedMesh, as the grid cell its translation sits in. */
function cellsOf(m: THREE.InstancedMesh): Array<{ x: number; z: number }> {
  const out: Array<{ x: number; z: number }> = [], mtx = new THREE.Matrix4(), p = new THREE.Vector3();
  for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, mtx); p.setFromMatrixPosition(mtx); out.push({ x: Math.floor(p.x / CELL), z: Math.floor(p.z / CELL) }); }
  return out;
}
const mapOf = (m: THREE.Mesh, i = 0) => {
  const mat = (Array.isArray(m.material) ? m.material[i] : m.material) as THREE.MeshLambertMaterial;
  return mat.map!;
};
/** The same texture, or a clone of it (clones share the canvas). */
const sameTex = (a: THREE.Texture, b: THREE.Texture) => a === b || a.image === b.image;
type Flags = { hell?: boolean; flesh?: boolean; dungeon?: boolean; side?: string };
const wallOf = (t: Flags) => t.hell ? TEX.hellWall : t.flesh ? TEX.fleshWall : t.dungeon ? TEX.dungeonWall : TEX.churchWall;
const floorOf = (t: Flags) => t.hell ? TEX.hellFloor : t.flesh ? TEX.fleshFloor : t.dungeon ? TEX.dungeonFloor : TEX.churchFloor;
const sideOf = (t: Flags) => t.side ? TEX[t.side] : t.flesh ? TEX.fleshWall : TEX.stair;
const zoneAt = (x: number, z: number): ZoneTheme => world.zones!.themes[world.zones!.map[z][x]];

describe("the prologue's zones dress the right cells", () => {
  it("every wall instance wears its own cell's zone wall texture", () => {
    loadLevel(0);
    const walls = kids("wall") as THREE.InstancedMesh[];
    // one wall mesh per look: the churchyard and the climb both wear the
    // dungeon's stone, so four zones are three looks
    expect(walls.length, "one wall mesh per zone look").toBe(3);
    let n = 0;
    const looks = new Set<string>();
    for (const m of walls) for (const c of cellsOf(m)) {
      n++; looks.add(zoneAt(c.x, c.z).id);
      expect(sameTex(mapOf(m), wallOf(zoneAt(c.x, c.z))), `wall at ${c.x},${c.z} (${zoneAt(c.x, c.z).id})`).toBe(true);
    }
    expect(n).toBeGreaterThan(150);
    expect(looks).toEqual(new Set(["churchyard", "crypt", "hell", "climb"]));
  });

  it("every floor cell and every raised platform wears its zone's floor (and side) texture", () => {
    loadLevel(0);
    expect(kids("floor"), "no single floor plane on a zoned level").toHaveLength(0);
    let cells = 0;
    for (const m of kids("floorCells") as THREE.InstancedMesh[]) for (const c of cellsOf(m)) {
      cells++;
      expect(sameTex(mapOf(m), floorOf(zoneAt(c.x, c.z))), `floor at ${c.x},${c.z}`).toBe(true);
    }
    expect(cells).toBe(world.GW * world.GH);
    let plats = 0;
    for (const m of kids("platform") as THREE.InstancedMesh[]) for (const c of cellsOf(m)) {
      plats++;
      const t = zoneAt(c.x, c.z);
      expect(sameTex(mapOf(m, 2), floorOf(t)), `platform top at ${c.x},${c.z}`).toBe(true);
      expect(sameTex(mapOf(m, 0), sideOf(t)), `platform side at ${c.x},${c.z}`).toBe(true);
    }
    expect(plats).toBeGreaterThan(300);
  });

  it("starts in the churchyard's fog, light and room", () => {
    loadLevel(0);
    const yard = ZONES[0], scene = renderState.scene as THREE.Scene;
    expect((scene.fog as THREE.FogExp2).color.getHex()).toBe(yard.fog);
    expect((scene.background as THREE.Color).getHex()).toBe(yard.fog);
    expect(renderState.ambLight.color.getHex()).toBe(yard.amb);
    expect(currentRoom().wanted).toBe("graveyard");
    expect(surfaceHere(false)).toBe("dirt");
  });
});

describe("the other seven levels are unzoned and build what they always built", () => {
  it.each([1, 2, 3, 4, 5, 6, 7])("level %i: one wall mesh, one floor plane, no zone meshes, its own textures", (i) => {
    loadLevel(i);
    const def = LEVELS[i];
    expect(world.zones).toBeNull();
    const walls = kids("wall") as THREE.Mesh[];
    expect(walls).toHaveLength(1);
    expect(mapOf(walls[0])).toBe(wallOf(def));
    const fl = kids("floor") as THREE.Mesh[];
    expect(fl).toHaveLength(1);
    expect((fl[0].geometry as THREE.BufferGeometry).type).toBe("PlaneGeometry");
    expect(sameTex(mapOf(fl[0]), floorOf(def))).toBe(true);
    expect(mapOf(fl[0]).repeat.toArray()).toEqual([world.GW, world.GH]);
    for (const name of ["floorCells", "decor", "decorLight", "moon", "stars"]) expect(kids(name), name).toHaveLength(0);
    expect(kids("platform").length).toBeLessThanOrEqual(1);
    expect(kids("wallCourse").length).toBeLessThanOrEqual(1);
    const scene = renderState.scene as THREE.Scene;
    expect((scene.fog as THREE.FogExp2).color.getHex()).toBe(def.fog);
    expect(renderState.ambLight.color.getHex()).toBe(def.amb);
    // zoneTick is a no-op here: nothing it could touch moves
    const before = [(scene.fog as THREE.FogExp2).density, renderState.ambLight.intensity, currentRoom().wanted];
    player.px = CELL * 3.5; player.pz = CELL * 3.5;
    for (let k = 0; k < 30; k++) zoneTick(1 / 60);
    expect([(scene.fog as THREE.FogExp2).density, renderState.ambLight.intensity, currentRoom().wanted]).toEqual(before);
  });
});

describe("crossing into hell", () => {
  it("eases the fog and light, switches the room and the footsteps, and ADEM says his hell line once", () => {
    loadLevel(0);
    const hell = ZONES[2], scene = renderState.scene as THREE.Scene;
    const fog = scene.fog as THREE.FogExp2;
    // the west bank, just off the crypt stair's mouth
    player.px = 10 * CELL; player.pz = 20.5 * CELL;
    expect(zoneAt(Math.floor(player.px / CELL), Math.floor(player.pz / CELL)).id).toBe("hell");
    document.getElementById("subt")!.innerHTML = "";
    zoneTick(1 / 60);
    expect(currentRoom().wanted, "the room switches on the step that crosses").toBe("hell");
    expect(surfaceHere(false)).toBe("ash");
    const said = document.getElementById("subt")!.textContent!;
    expect(MONOLOGUE.p0_hell.some((l) => said.includes(l)), said).toBe(true);
    const target = new THREE.Color(hell.fog);
    const dist = () => Math.abs(fog.color.r - target.r) + Math.abs(fog.color.g - target.g) + Math.abs(fog.color.b - target.b);
    const d0 = dist();
    expect(d0, "an ease, not a cut").toBeGreaterThan(.01);
    for (let k = 0; k < 300; k++) zoneTick(1 / 60);
    expect(dist()).toBeLessThan(d0 / 50);
    expect(fog.density).toBeCloseTo(hell.fogD * 1.5, 4);
    expect(renderState.ambLight.color.getHex()).toBe(hell.amb);
    // once: leaving and coming back says nothing new
    document.getElementById("subt")!.innerHTML = "";
    player.px = 9.5 * CELL; player.pz = 4.5 * CELL; zoneTick(1 / 60);
    expect(currentRoom().wanted).toBe("graveyard");
    player.px = 10 * CELL; player.pz = 20.5 * CELL; zoneTick(1 / 60);
    expect(document.getElementById("subt")!.innerHTML).toBe("");
  });

  it("draws from Math.random only for ADEM's line — say()'s own pick, once per zone that has one — and never standing still", () => {
    loadLevel(0);
    const spy = vi.spyOn(Math, "random");
    try {
      for (const [x, z] of [[9.5, 4.5], [9.5, 10.5], [9.5, 15.5], [10, 20.5], [14.5, 26.5], [24.5, 16.5], [25.5, 9.5]]) {
        player.px = x * CELL; player.pz = z * CELL;
        for (let k = 0; k < 20; k++) zoneTick(1 / 60);
      }
      // crypt, hell, climb: three first entries, three lines, one pick each
      // (Subtitles.ts's say() picks a line the way every say() always has)
      expect(spy).toHaveBeenCalledTimes(3);
      spy.mockClear();
      for (let k = 0; k < 60; k++) zoneTick(1 / 60);
      player.px = 9.5 * CELL; player.pz = 4.5 * CELL;
      for (let k = 0; k < 60; k++) zoneTick(1 / 60);
      player.px = 10 * CELL; player.pz = 20.5 * CELL;
      for (let k = 0; k < 60; k++) zoneTick(1 / 60);
      expect(spy, "re-entering and standing: no draws").not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
});

describe("raised ground", () => {
  it("stands torches and candles on the floor under them, and items bob there", () => {
    loadLevel(0);
    const torches = world.torches as unknown as Array<{ x: number; z: number; L: THREE.Object3D; sp: THREE.Object3D }>;
    expect(torches.length).toBeGreaterThan(8);
    for (const t of torches) {
      expect(t.L.position.y).toBeCloseTo(floorHeightAt(t.x, t.z) + 1.45, 6);
      expect(t.sp.position.y).toBeCloseTo(floorHeightAt(t.x, t.z) + 1.35, 6);
    }
    const posts = kids("torchPost");
    expect(posts).toHaveLength(torches.length);
    for (const p of posts) expect(p.position.y).toBeCloseTo(floorHeightAt(p.position.x, p.position.z) + .575, 6);
    for (const c of world.candles as unknown as Array<{ x: number; z: number; sp: THREE.Object3D }>)
      expect(c.sp.position.y).toBeCloseTo(floorHeightAt(c.x, c.z) + .18, 6);
    const items = world.items as unknown as Array<{ x: number; z: number; sp: THREE.Object3D }>;
    expect(items.length).toBeGreaterThanOrEqual(4);
    player.px = 1; player.pz = 1;   // out of reach of every item
    itemsTick(.3);
    for (const it of items) {
      const fh = floorHeightAt(it.x, it.z);
      expect(fh).toBeGreaterThan(0);
      expect(Math.abs(it.sp.position.y - (fh + .5))).toBeLessThanOrEqual(.0701);
    }
  });
});

describe("the exit", () => {
  it("leads to level 1: the pad ends the prologue and the level-end button loads the dungeon", () => {
    loadLevel(0);
    skipOpening();   // the opening locks input, and playerTick with it (src/world/Opening.ts)
    S.won = false;
    const exit = world.exitPos as unknown as { x: number; z: number };
    player.px = exit.x; player.pz = exit.z; player.pyy = EYE + floorHeightAt(exit.x, exit.z);
    playerTick(1 / 60);
    expect(S.won).toBe(true);
    expect(document.getElementById("levelend")!.classList.contains("hidden")).toBe(false);
    expect(document.getElementById("lebtn")!.textContent).toContain("THE GOTHIC DUNGEON");
    (document.getElementById("lebtn") as HTMLElement).click();
    expect(S.level).toBe(1);
    expect(world.zones).toBeNull();
  });
});
