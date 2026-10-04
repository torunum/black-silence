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
import { ZONES } from "../../src/world/levels/prologue";
import { HELLTEX } from "../../src/render/HellTextures";
import { heatMaterial, lavaState, lavaTick } from "../../src/fx/Lava";
import { fireTick } from "../../src/fx/HellFire";
import { LIGHT_BUDGET } from "../../src/world/decor/lamps";
import { LIT, lightAt, staticLights } from "../../src/world/lightmap";
import { LEVELS } from "../../src/world/levels/index";
import type { ZoneTheme } from "../../src/world/LevelBuilder";

/**
 * HELL'S SHELL AND LAKE (`src/world/HellShell.ts`, `src/fx/Lava.ts`; the prologue's hell rework,
 * `docs/superpowers/plans/2026-10-04-hell-rework.md`).
 *
 * Boots the real game and loads the prologue. What it checks, against the grid and the height map rather than
 * against the code under test:
 *
 * 1. every face the cavern exposes is a quad of the rock mesh — walls, and the cliffs where ground drops —
 *    and every raised cell has its top; the loader builds no box, platform or floor quad in hell, and still
 *    builds the climb's first step, which is another zone's;
 * 2. the rock is mapped in **world space**: two quads that meet share the texture coordinate at the corner they
 *    share, so a crack runs the length of a wall and not the length of a tile;
 * 3. the lake is unlit (a basic material, whatever the lamp does), alpha-tested crust over it, and it flows —
 *    from a clock, with nothing allocated and nothing drawn from `Math.random`;
 * 4. the pit's own lights light the banks and stay inside the level's light budget;
 * 5. no other level builds any of it.
 */

let loadLevel: (idx: number) => void;
let skipOpening: () => void;

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
  ({ skipOpening } = await import("../../src/world/Opening"));
  skipOpening();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

const kids = (name: string) => (renderState.scene.children as THREE.Object3D[]).filter((c) => c.name === name) as THREE.Mesh[];
const zoneAt = (x: number, z: number): ZoneTheme => world.zones!.themes[world.zones!.map[z][x]];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const open = (x: number, z: number): boolean => { const c = world.grid[z]?.[x]; return c !== undefined && !"#W+DS".includes(c); };
const floor = (x: number, z: number): number => (world.heightMap && world.heightMap[z] && world.heightMap[z][x]) || 0;

/** What the grid says the shell must contain, counted without the code that builds it. */
function expected(): { walls: number; cliffs: number; tops: number; pit: Array<[number, number]> } {
  let walls = 0, cliffs = 0, tops = 0;
  const pit: Array<[number, number]> = [];
  for (let z = 0; z < world.GH; z++) for (let x = 0; x < world.GW; x++) {
    if (!zoneAt(x, z).shell) continue;
    const c = world.grid[z][x];
    if (c === "#" || c === "W") { for (const [dx, dz] of DIRS) if (open(x + dx, z + dz)) walls++; continue; }
    if (!open(x, z)) continue;
    const h = floor(x, z);
    if (h <= 0) { pit.push([x, z]); continue; }
    tops++;
    for (const [dx, dz] of DIRS) if (open(x + dx, z + dz) && floor(x + dx, z + dz) < h) cliffs++;
  }
  return { walls, cliffs, tops, pit };
}

function cellsOf(m: THREE.InstancedMesh): Array<{ x: number; z: number }> {
  const out: Array<{ x: number; z: number }> = [], mtx = new THREE.Matrix4(), p = new THREE.Vector3();
  for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, mtx); p.setFromMatrixPosition(mtx); out.push({ x: Math.floor(p.x / CELL), z: Math.floor(p.z / CELL) }); }
  return out;
}

describe("the shell is built from the grid", () => {
  it("has a quad for every wall face, every cliff and every raised cell's top, and a lake over every pit cell", () => {
    loadLevel(0);
    const want = expected();
    expect(want.walls).toBeGreaterThan(60);
    expect(want.cliffs, "the pit's two cliffs and the steps").toBeGreaterThan(30);
    expect(want.tops).toBeGreaterThan(250);
    expect(want.pit.length).toBeGreaterThan(80);
    expect(kids("hellRock")).toHaveLength(1);
    expect(kids("hellGround")).toHaveLength(1);
    expect(kids("hellRock")[0].geometry.getAttribute("position").count, "rock quads x 6 vertices").toBe((want.walls + want.cliffs) * 6);
    expect(kids("hellGround")[0].geometry.getAttribute("position").count).toBe(want.tops * 6);
    expect(kids("lava")[0].geometry.getAttribute("position").count, "one quad per pit cell").toBe(want.pit.length * 6);
  });

  it("builds no box, no platform and no floor quad in hell, and keeps the climb's first step, which is the climb's", () => {
    loadLevel(0);
    for (const m of kids("wall") as unknown as THREE.InstancedMesh[]) for (const c of cellsOf(m)) expect(zoneAt(c.x, c.z).shell, `a wall box in hell at ${c.x},${c.z}`).toBeFalsy();
    for (const m of kids("floorCells") as unknown as THREE.InstancedMesh[]) for (const c of cellsOf(m)) expect(zoneAt(c.x, c.z).shell, `a floor quad in hell at ${c.x},${c.z}`).toBeFalsy();
    const platforms: string[] = [];
    for (const m of kids("platform") as unknown as THREE.InstancedMesh[]) for (const c of cellsOf(m)) { platforms.push(c.x + "," + c.z); expect(zoneAt(c.x, c.z).shell, `a platform in hell at ${c.x},${c.z}`).toBeFalsy(); }
    expect(platforms).toEqual(expect.arrayContaining(["24,18", "25,18"]));
    expect(kids("ceilingRisers").length).toBeGreaterThan(0);
  });

  it("faces every quad into open space, with the normal it says, standing on a cell edge", () => {
    loadLevel(0);
    const g = kids("hellRock")[0].geometry, pos = g.getAttribute("position"), nrm = g.getAttribute("normal");
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
    for (let t = 0; t < pos.count; t += 3) {
      a.fromBufferAttribute(pos, t); b.fromBufferAttribute(pos, t + 1); c.fromBufferAttribute(pos, t + 2);
      n.crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
      const stated = new THREE.Vector3().fromBufferAttribute(nrm, t);
      expect(n.dot(stated), `triangle ${t / 3} winds against its normal`).toBeGreaterThan(.99);
      const mid = a.clone().add(b).add(c).divideScalar(3).addScaledVector(stated, .3);
      expect(open(Math.floor(mid.x / CELL), Math.floor(mid.z / CELL)), `triangle ${t / 3} faces a wall`).toBe(true);
    }
  });
});

describe("the rock is mapped in world space", () => {
  it("shares a texture coordinate at every shared corner, steps a quarter of the texture along each face, and counts height in sevenths", () => {
    // MUTATION TARGET: give each quad the tile's 0..1 (the instanced boxes' mapping) and the shared corners disagree.
    loadLevel(0);
    const g = kids("hellRock")[0].geometry, pos = g.getAttribute("position"), uv = g.getAttribute("uv"), nrm = g.getAttribute("normal");
    const seen = new Map<string, number>();
    let shared = 0;
    for (let i = 0; i < pos.count; i++) {
      const key = [nrm.getX(i), nrm.getZ(i), pos.getX(i).toFixed(3), pos.getY(i).toFixed(3), pos.getZ(i).toFixed(3)].join(",");
      const wxz = Math.abs(nrm.getX(i)) > .5 ? pos.getZ(i) : pos.getX(i);
      const u = uv.getX(i);
      expect(Math.abs(u) , "u is the distance along the wall in eighths of a unit").toBeCloseTo(Math.abs(wxz) / 8, 4);
      expect(uv.getY(i), "v is height in sevenths of a unit").toBeCloseTo(pos.getY(i) / 7, 4);
      const prev = seen.get(key);
      if (prev !== undefined) { shared++; expect(u, `corner ${key}`).toBeCloseTo(prev, 5); } else seen.set(key, u);
    }
    expect(shared, "faces do meet along the walls").toBeGreaterThan(100);
    for (let t = 0; t < pos.count; t += 6) {   // a quad is 6 vertices; its bottom edge runs one cell, a quarter of the texture
      expect(Math.abs(uv.getX(t + 1) - uv.getX(t)), `quad ${t / 6}`).toBeCloseTo(CELL / 8, 5);
    }
  });

  it("maps the ground's tops by world position too", () => {
    loadLevel(0);
    const g = kids("hellGround")[0].geometry, pos = g.getAttribute("position"), uv = g.getAttribute("uv");
    for (let i = 0; i < pos.count; i++) {
      expect(uv.getX(i)).toBeCloseTo(pos.getX(i) / 8, 5);
      expect(uv.getY(i)).toBeCloseTo(pos.getZ(i) / 8, 5);
    }
    for (let t = 0; t < pos.count; t += 6) {   // each quad stands on its own cell's floor
      let cx = 0, cz = 0;
      for (let k = 0; k < 6; k++) { cx += pos.getX(t + k) / 6; cz += pos.getZ(t + k) / 6; }
      const x = Math.floor(cx / CELL), z = Math.floor(cz / CELL);
      expect(zoneAt(x, z).shell, `a top outside the shell zone at ${x},${z}`).toBe(true);
      for (let k = 0; k < 6; k++) expect(pos.getY(t + k), `top at ${x},${z}`).toBeCloseTo(floor(x, z), 5);
    }
  });

  it("wears hell's rock and scorched ground, with their cracks as emissive maps, and nothing else wears them", () => {
    loadLevel(0);
    const rock = kids("hellRock")[0].material as THREE.MeshLambertMaterial, ground = kids("hellGround")[0].material as THREE.MeshLambertMaterial;
    expect(rock.map).toBe(HELLTEX.rock);
    expect(rock.emissiveMap).toBe(HELLTEX.rockGlow);
    expect(rock.vertexColors).toBe(true);
    expect(ground.map).toBe(HELLTEX.scorch);
    expect(ground.emissiveMap).toBe(HELLTEX.scorchGlow);
    for (const child of renderState.scene.children as THREE.Object3D[]) {
      if (child.name === "hellRock" || child.name === "hellGround") continue;
      const m = (child as THREE.Mesh).material as THREE.MeshLambertMaterial | undefined;
      if (!m || Array.isArray(m)) continue;
      if (child.name === "wallCourse") continue;   // hell's band: tests/world/trim.test.ts
      const hell = Object.values(HELLTEX);
      if (m.map && hell.includes(m.map as THREE.CanvasTexture)) {
        expect(["ceilingCells", "ceilingRisers", "decor", "decorClutter", "lava", "lavaCrust", "lavafall"], `${child.name} wears a hell texture`).toContain(child.name);
      }
    }
  });
});

describe("the lake", () => {
  it("is unlit: basic materials, so no lamp, torch or shadow has a say in it, and a crust that is alpha-tested over a sheet that is not", () => {
    loadLevel(0);
    const sheet = kids("lava")[0], crust = kids("lavaCrust")[0];
    const sm = sheet.material as THREE.MeshBasicMaterial, cm = crust.material as THREE.MeshBasicMaterial;
    expect(sm.isMeshBasicMaterial, "the sheet is a MeshBasicMaterial").toBe(true);
    expect(cm.isMeshBasicMaterial, "the crust is a MeshBasicMaterial").toBe(true);
    expect((sm as unknown as THREE.MeshLambertMaterial).emissive, "not a lit material with an emissive").toBeUndefined();
    expect(sm.map!.image).toBe(HELLTEX.lava!.image);
    expect(cm.map!.image).toBe(HELLTEX.crust!.image);
    expect(cm.alphaTest).toBeGreaterThan(0);
    expect(sm.alphaTest).toBe(0);
    expect(crust.position.y, "the crust floats just over the sheet").toBeGreaterThan(sheet.position.y);
    expect(crust.position.y).toBeLessThan(.1);
    expect(sheet.castShadow || sheet.receiveShadow || crust.castShadow || crust.receiveShadow).toBe(false);
    for (const f of kids("lavafall")) expect((f.material as THREE.MeshBasicMaterial).isMeshBasicMaterial).toBe(true);
    expect(kids("lavafall")).toHaveLength(2);
  });

  it("covers the pit and nothing else: every lava vertex is at floor level over a floor-0 cell of hell", () => {
    loadLevel(0);
    const pos = kids("lava")[0].geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i++) expect(pos.getY(i)).toBe(0);
    const want = expected().pit.map(([x, z]) => x + "," + z).sort();
    const got = new Set<string>();
    for (let t = 0; t < pos.count; t += 6) got.add(Math.floor(pos.getX(t) / CELL + .01) + "," + Math.floor(pos.getZ(t) / CELL + .01));
    expect([...got].sort()).toEqual(want);
  });

  it("flows: the sheet runs along the pit, the crust drifts at another speed and heading, and the brightness swells and gutters", () => {
    loadLevel(0);
    const s = lavaState();
    expect(s.built).toBe(true);
    const sheet0 = s.sheet!.offset.clone(), crust0 = s.crust!.offset.clone();
    let lo = 9, hi = 0;
    for (let i = 0; i < 60 * 20; i++) { lavaTick(1 / 60); const k = s.sheetMat!.color.r; lo = Math.min(lo, k); hi = Math.max(hi, k); }
    const ds = s.sheet!.offset.clone().sub(sheet0), dc = s.crust!.offset.clone().sub(crust0);
    expect(ds.length(), "the sheet moved").toBeGreaterThan(.1);
    expect(dc.length(), "the crust moved").toBeGreaterThan(.05);
    expect(Math.abs(ds.y), "along the pit's length").toBeGreaterThan(Math.abs(ds.x) * 2);
    const cos = ds.dot(dc) / (ds.length() * dc.length());
    expect(Math.abs(cos), "the two layers do not move together").toBeLessThan(.95);
    expect(ds.length() / dc.length(), "at different speeds").toBeGreaterThan(1.3);
    expect(hi - lo, "the heat pulses").toBeGreaterThan(.03);
    expect(lo).toBeGreaterThan(.7);
    expect(hi).toBeLessThan(1.06);
  });

  it("is a pure function of the clock: the same load and the same steps give the same offsets", () => {
    const run = (): number[] => {
      loadLevel(0);
      const s = lavaState();
      for (let i = 0; i < 500; i++) lavaTick(1 / 30);
      return [s.sheet!.offset.x, s.sheet!.offset.y, s.crust!.offset.x, s.crust!.offset.y, s.sheetMat!.color.r];
    };
    expect(run()).toEqual(run());
  });

  it("allocates nothing per frame: the same textures, vectors and colour objects forever, and no allocation in the function", () => {
    // MUTATION TARGET: `lava.sheet.offset = new THREE.Vector2(...)`, or any `new`, inside lavaTick.
    loadLevel(0);
    const s = lavaState();
    const held = [s.sheet, s.crust, s.sheetMat, s.sheet!.offset, s.crust!.offset, s.sheetMat!.color];
    for (let i = 0; i < 5000; i++) lavaTick(1 / 60);
    const s2 = lavaState();
    expect([s2.sheet, s2.crust, s2.sheetMat, s2.sheet!.offset, s2.crust!.offset, s2.sheetMat!.color]).toEqual(held);
    held.forEach((o, i) => expect(Object.is([s2.sheet, s2.crust, s2.sheetMat, s2.sheet!.offset, s2.crust!.offset, s2.sheetMat!.color][i], o), `object ${i} replaced`).toBe(true));
    const src = readFileSync(join(__dirname, "../../src/fx/Lava.ts"), "utf8");
    const body = src.slice(src.indexOf("export function lavaTick"), src.indexOf("/** What the lake holds"));
    expect(body.length).toBeGreaterThan(200);
    for (const bad of [/\bnew\b/, /\.clone\(/, /\.map\(/, /\.filter\(/, /\.slice\(/, /=> /, /= \[/, /: \[/, /\{ *\w+:/]) expect(body, String(bad)).not.toMatch(bad);
  });

  it("draws nothing from Math.random, in building the shell and the lake or in running them", () => {
    const real = Math.random;
    const from: string[] = [];
    Math.random = () => { const st = new Error().stack || ""; if (/Lava|HellShell|HellTextures|HellRock|HellLava|HellPaint/.test(st) && !/generateUUID/.test(st)) from.push(st.split("\n")[2] || ""); return real(); };
    try { loadLevel(0); for (let i = 0; i < 600; i++) lavaTick(1 / 60); } finally { Math.random = real; }
    expect(from).toEqual([]);
  });

  it("drops the lake when another level loads", () => {
    loadLevel(0);
    expect(lavaState().built).toBe(true);
    loadLevel(1);
    expect(lavaState().built).toBe(false);
    for (const n of ["hellRock", "hellGround", "lava", "lavaCrust", "lavafall"]) expect(kids(n), n).toHaveLength(0);
  });
});

describe("hell's cracked stone breathes with the fire", () => {
  it("registers the rock, the ground, the vault and the dressing's basalt, drives their emissive intensity from the clock, and forgets them when they are disposed", () => {
    loadLevel(0);
    const before = lavaState().heat;
    expect(before).toBeGreaterThanOrEqual(4);
    const rock = kids("hellRock")[0].material as THREE.MeshLambertMaterial;
    const seen = new Set<number>();
    for (let i = 0; i < 300; i++) { lavaTick(1 / 30); seen.add(Math.round(rock.emissiveIntensity * 1000)); expect(rock.emissiveIntensity).toBeGreaterThan(.7); expect(rock.emissiveIntensity).toBeLessThan(1.25); }
    expect(seen.size, "it changes").toBeGreaterThan(20);
    const spare = new THREE.MeshLambertMaterial();
    heatMaterial(spare);
    expect(lavaState().heat).toBe(before + 1);
    spare.dispose();
    expect(lavaState().heat).toBe(before);
  });
});

describe("the pit lights the banks, and the level stays inside its light budget", () => {
  it("has four glows low over the lava, brighter than the stock fire's, and flickering", () => {
    loadLevel(0);
    const lights = (renderState.scene.children as THREE.Object3D[]).filter((c) => c.name === "decorLight") as THREE.PointLight[];
    expect(lights).toHaveLength(4);
    for (const l of lights) {
      expect(l.intensity).toBeGreaterThanOrEqual(2);
      expect(l.position.y, "over the lava, under the banks' ceiling").toBeGreaterThan(1.5);
      expect(l.position.y).toBeLessThan(3);
      expect(l.position.x, "down the middle of the pit").toBe(29);
    }
    const base = lights.map((l) => l.intensity);
    for (let i = 0; i < 90; i++) fireTick(1 / 60);
    expect(lights.map((l) => l.intensity)).not.toEqual(base);
  });

  it("has no more point lights than the budget — the player's four, the torches, the exit and the pit's — counted off the scene", () => {
    loadLevel(0);
    const n = (renderState.scene.children as THREE.Object3D[]).filter((c) => (c as THREE.PointLight).isPointLight).length;
    expect(n).toBeLessThanOrEqual(LIGHT_BUDGET);
    expect(n).toBeGreaterThanOrEqual(20);
  });

  it("reaches both rims of the pit: every walkable cell at the lip of the lava is lit by the fire before the player's lamp comes near", () => {
    const L = LEVELS[0].build(), lights = staticLights(L);
    for (const x of [10, 18]) for (let z = 21; z <= 32; z++) expect(lightAt(lights, x, z), `rim cell ${x},${z}`).toBeGreaterThan(LIT * 3);
  });
});

describe("hell's fog and light are its own", () => {
  const hell = ZONES.find((z) => z.id === "hell")!;
  it("is a deeper, thinner dark than the reference's prologue: less fog colour, less haze, a dimmer ambient colour — the lava is the light", () => {
    const def = LEVELS[0], lum = (c: number): number => ((c >> 16) & 255) * .3 + ((c >> 8) & 255) * .59 + (c & 255) * .11;
    expect(hell.fogD).toBeLessThan(def.fogD);
    expect(lum(hell.amb)).toBeLessThan(lum(def.amb));
    expect(hell.fog).not.toBe(def.fog);
    expect(lum(hell.fog), "the haze is dark: depth reads as the far end going to dark red").toBeLessThan(25);
  });
});

describe("no other level builds any of it", () => {
  it.each([1, 2, 3, 4, 5, 6, 7])("level %i: no rock, ground, lake, crust or fall, and no hell texture", (i) => {
    loadLevel(i);
    for (const n of ["hellRock", "hellGround", "lava", "lavaCrust", "lavafall"]) expect(kids(n), `${n} on level ${i}`).toHaveLength(0);
    const hell = Object.values(HELLTEX);
    renderState.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | THREE.MeshBasicMaterial[] | undefined;
      for (const one of Array.isArray(m) ? m : m ? [m] : []) {
        if (one.map) expect(hell, `${o.name} on level ${i}`).not.toContain(one.map);
      }
    });
  });
});
