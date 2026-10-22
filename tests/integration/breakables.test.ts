// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import type { world as World } from "../../src/world/WorldState";
import type { renderState as RenderState } from "../../src/render/Renderer";
import type { loadLevel as LoadLevel } from "../../src/world/LevelLoader";
import type * as WindowsMod from "../../src/world/Windows";
import type * as PropsMod from "../../src/world/Props";
import type * as CollisionMod from "../../src/world/Collision";
import type * as HitscanMod from "../../src/weapons/Hitscan";
import { BREAKABLE } from "../../src/world/decor/breakable";

/**
 * WHAT BREAKS (owner: "kırılabilir cam pencereler ve daha fazla kırılabilir eşya"). Boots the real game: the stained-glass windows
 * break from a shot into them or a blast beside them, and turn to a hole onto the night with the moon's light; the level kit's urns,
 * benches, lecterns, crate piles, bones and the womb's sacs stand as props of their own and break — without a draw from the game's
 * dice, and without ever being in anyone's way.
 */

let world: typeof World;
let renderState: typeof RenderState;
let loadLevel: typeof LoadLevel;
let W: typeof WindowsMod, P: typeof PropsMod, C: typeof CollisionMod, H: typeof HitscanMod;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = () => 1;
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  ({ world } = await import("../../src/world/WorldState"));
  ({ renderState } = await import("../../src/render/Renderer"));
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  W = await import("../../src/world/Windows");
  P = await import("../../src/world/Props");
  C = await import("../../src/world/Collision");
  H = await import("../../src/weapons/Hitscan");
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  (newGame as HTMLElement).click();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

type Soft = { soft?: boolean; dead: boolean; kind: string; x: number; z: number; r: number; hgt: number; m: THREE.Object3D };
const softs = (): Soft[] => (world.props as unknown as Soft[]).filter((p) => p.soft);
const glass = (): THREE.Mesh[] => renderState.scene.children.filter((c) => c.name === "window") as THREE.Mesh[];

describe("the windows", () => {
  it("a level's windows are registered, one pane to a W cell, whole", () => {
    loadLevel(2);
    const n = W.windowCount();
    expect(n.panes).toBeGreaterThan(0);
    expect(n.panes).toBe(glass().length);
    expect(n.broken).toBe(0);
  });

  it("a shot into the glass breaks it: the pane turns to a hole onto the night and its light to the moon's", () => {
    loadLevel(2);
    const pane = glass()[0], light = renderState.scene.children.find((c) => (c as THREE.PointLight).isPointLight && (c as THREE.PointLight).distance === 9) as THREE.PointLight;
    expect(light).toBeDefined();
    const mat0 = pane.material;
    // stand in front of it, looking straight into it
    const n = new THREE.Vector3(); pane.getWorldDirection(n);
    renderState.camera.position.set(pane.position.x + n.x * 3, pane.position.y, pane.position.z + n.z * 3);
    for (const e of world.enemies) e.dead = true;
    H.hitscan(new THREE.Vector3(-n.x, 0, -n.z).normalize(), 10, 0);
    expect(W.windowCount().broken).toBe(1);
    expect(pane.material, "a new face on the pane").not.toBe(mat0);
    expect(W.hitWindow(pane.position.x - n.x * 1.1, pane.position.y, pane.position.z - n.z * 1.1), "broken stays broken").toBe(false);
  });

  it("a blast breaks every pane near it and none far from it", () => {
    loadLevel(2);
    const [a] = glass();
    W.blastWindows(a.position.x, a.position.z, 1);
    const n = W.windowCount();
    expect(n.broken).toBeGreaterThanOrEqual(1);
    expect(n.broken).toBeLessThan(n.panes);
  });

  it("a level change starts with every pane whole", () => {
    loadLevel(2);
    W.blastWindows(0, 0, 999);
    expect(W.windowCount().broken).toBe(W.windowCount().panes);
    loadLevel(2);
    expect(W.windowCount().broken).toBe(0);
  });
});

describe("the dressing that breaks", () => {
  it("stands in world.props as pieces of their own, on the monastery and the womb", () => {
    loadLevel(9);
    const s = softs();
    expect(s.length).toBeGreaterThan(20);
    for (const p of s) {
      expect(BREAKABLE[p.kind], p.kind).toBeDefined();
      expect(renderState.scene.children).toContain(p.m);
      expect(p.hgt).toBeGreaterThan(.1);
    }
    loadLevel(8);
    expect(softs().some((p) => p.kind === "pod" || p.kind === "tumor" || p.kind === "growth")).toBe(true);
  });

  it("is never in the way: the player walks where it stands", () => {
    loadLevel(9);
    const p = softs()[0];
    const others = (world.props as unknown as Soft[]).filter((o) => !o.soft && !o.dead);
    for (const o of others) o.dead = true;
    expect(C.collides(p.x, p.z) && !C.solidAt(p.x, p.z) ? "blocked" : "clear").not.toBe("blocked");
  });

  it("breaks: gone from the scene, and not a draw from Math.random", () => {
    loadLevel(9);
    const p = softs()[0];
    const real = Math.random;
    let draws = 0;
    Math.random = () => { draws++; return real(); };
    try { P.breakProp(p as never); } finally { Math.random = real; }
    expect(p.dead).toBe(true);
    expect(renderState.scene.children).not.toContain(p.m);
    expect(draws).toBe(0);
  });
});
