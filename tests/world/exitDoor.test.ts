// @vitest-environment jsdom
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { renderState } from "../../src/render/Renderer";
import { world } from "../../src/world/WorldState";
import { player } from "../../src/player/PlayerState";
import { input } from "../../src/player/Input";
import { game } from "../../src/core/Game";
import { S } from "../../src/core/State";
import { save } from "../../src/save/SaveGame";
import { CELL } from "../../src/world/Grid";
import { LEVELS } from "../../src/world/levels/index";
import { DOOR_STYLES, STYLES, buildRig, pose, styleFor, type DoorStyle, type Rig } from "../../src/world/DoorKit";
import { EXIT_BOSSES, EXIT_CELLS, doors, doorClaims, exitCell, siteDoor, against } from "../../src/world/ExitDoor";
import { resetTransition, trans } from "../../src/world/TransitionState";
import { floorHeightAt, solidAt, ceilHeightAt } from "../../src/world/Collision";

/**
 * THE DOORS (the transitions plan, `docs/superpowers/plans/2026-10-05-transitions.md`, Task 2).
 * A level ends at a great door in its theme and the next begins at another; this boots the real game,
 * loads every level, and holds the doors to what the plan says of them:
 *
 * 1. every level but the last has an exit door, every level but the prologue (which has its grave) an
 *    entrance, and the womb has no exit (its end is the win screen);
 * 2. each theme has a door of its own: eight levels, eight styles, eight different pieces of building;
 * 3. a door stands in a wall with floor the player can reach in front of it (level 3's brings a wall of its
 *    own, and is the only one that does: level 1's did, at the grid's edge, until it was rebuilt), under the ceiling, in its cell, with the
 *    exit *cell* where it always was;
 * 4. the five boss levels' doors are sealed — dark, no light, nothing to touch — until the boss dies;
 * 5. opening one: the boss rule, E facing it, walking into it;
 * 6. nothing here draws from `Math.random`.
 */

let loadLevel: (i: number) => void;
let playerTick: (dt: number) => void;
let openExit: () => void;
let leaveLevel: () => boolean;
let tryExit: () => boolean;
let exitTick: () => void;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  (document as unknown as { exitPointerLock: () => void }).exitPointerLock = () => {};
  ({ loadLevel } = await import("../../src/world/LevelLoader"));
  ({ playerTick } = await import("../../src/player/Player"));
  ({ openExit } = await import("../../src/enemies/Death"));
  ({ leaveLevel, tryExit, exitTick } = await import("../../src/world/Transition"));
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  (await import("../../src/world/Opening")).skipOpening();
});

afterAll(() => { clearAllTimers(); clearScheduled(); });

beforeEach(() => { resetTransition(); S.won = false; S.dead = false; game.inputLock = false; });

const LAST = LEVELS.length - 1;
const deadAll = (): void => { for (const e of world.enemies) e.dead = true; };
/** The player standing at the door's cell, `out` in front of it, looking at it. */
function standAt(d: NonNullable<typeof doors.exit>, out: number, across = 0): void {
  player.px = d.x + d.nx * out + d.nz * across; player.pz = d.z + d.nz * out - d.nx * across;
  input.yaw = Math.atan2(d.nx, d.nz);
}

describe("every level has the doors it should", () => {
  for (let i = 0; i <= LAST; i++) {
    it(`level ${i} ${LEVELS[i].name.replace(/^.* — /, "")}: ${i === LAST ? "no exit" : "an exit"}, ${i === 0 ? "no entrance (a grave)" : "an entrance"}`, () => {
      loadLevel(i);
      expect(doors.exit !== null, "an exit door").toBe(i !== LAST);
      expect(doors.entrance !== null, "an entrance door").toBe(i !== 0);
      const named = (n: string) => (renderState.scene.children as THREE.Object3D[]).filter((c) => c.name === n).length;
      expect(named("exitDoor")).toBe(i !== LAST ? 1 : 0);
      expect(named("entranceDoor")).toBe(i !== 0 ? 1 : 0);
      expect(named("doorGlow")).toBe((i !== LAST ? 1 : 0) + (i !== 0 ? 1 : 0));
    });
  }
});

describe("each theme has its own door", () => {
  const EXPECT: DoorStyle[] = ["crypt", "iron", "church", "tomb", "cemetery", "sluice", "freight", "sphincter"];

  it("gives the eight levels eight different styles, the crypt door to the prologue and the sphincter to the womb", () => {
    // MUTATION TARGET: make styleFor answer one style for every level
    expect(LEVELS.map((l) => styleFor(l))).toEqual(EXPECT);
    expect(new Set(EXPECT).size).toBe(8);
    expect([...DOOR_STYLES].sort()).toEqual([...EXPECT].sort());
  });

  it("builds each level's door in its style, and the eight are different buildings, not one with another colour", () => {
    const sig = new Map<DoorStyle, string>();
    for (let i = 0; i <= LAST; i++) {
      loadLevel(i);
      const d = doors.entrance ?? doors.exit!;   // the womb has only an entrance
      expect(d.rig.style, LEVELS[i].name).toBe(EXPECT[i]);
      let meshes = 0, tris = 0;
      const maps = new Set<string>();
      d.rig.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        meshes++; tris += m.geometry.index ? m.geometry.index.count / 3 : (m.geometry.attributes.position.count / 3);
        const mat = m.material as THREE.MeshLambertMaterial;
        if (mat.map) maps.add(String((mat.map.image as { width?: number } | undefined)?.width ?? "?"));
      });
      sig.set(EXPECT[i], `${meshes}/${Math.round(tris)}/${d.rig.leaves.length}/${d.rig.spec.move}/${[...maps].sort().join(",")}`);
    }
    expect(new Set(sig.values()).size, [...sig].map(([k, v]) => `${k} ${v}`).join("; ")).toBe(8);
  });

  it("opens every style: its leaves move between shut and open, shut again puts them back, and the crack of light is only for a shut door", () => {
    const state = (rig: Rig): string => rig.leaves.map((l) => [l.node.position, l.node.rotation, l.node.scale].map((v) => v.toArray().slice(0, 3).map((n) => Number(n).toFixed(3)).join(",")).join("|")).join(";");
    expect(new Set(DOOR_STYLES.map((s) => STYLES[s].glow)).size, "eight colours for the way on").toBe(8);
    for (const style of DOOR_STYLES) {
      const rig = buildRig(style, "probe");
      pose(rig, 0);
      const shut = state(rig);
      expect(rig.seam.every((m) => m.visible), `${style}: light in the crack while shut`).toBe(true);
      pose(rig, 1);
      expect(state(rig), `${style} opened`).not.toBe(shut);
      expect(rig.seam.some((m) => m.visible), `${style}: no crack of light once open`).toBe(false);
      rig.leaves.forEach((l, i) => expect(state({ ...rig, leaves: [l] } as Rig), `${style} leaf ${i} moved`).not.toBe(shut.split(";")[i]));
      pose(rig, 0);
      expect(state(rig), `${style} shut again`).toBe(shut);
    }
  });
});

describe("a door stands in a wall, in front of floor the player can reach", () => {
  const slabs: number[] = [];
  for (let i = 0; i <= LAST; i++) {
    it(`level ${i}: the exit and entrance doors stand in '#' walls on floor within a step of the cell they serve, under the ceiling, inside their cell`, () => {
      loadLevel(i);
      for (const [name, d] of [["exit", doors.exit], ["entrance", doors.entrance]] as const) {
        if (!d) continue;
        const { sx, sz, dx, dz } = d.site;
        expect(solidAt((sx + .5) * CELL, (sz + .5) * CELL), `${name}: the cell in front of the door is open ground`).toBe(false);
        if (!d.site.slab) expect(world.grid[sz + dz][sx + dx], `${name}: the wall it stands in`).toBe("#");
        else slabs.push(i);
        const here = floorHeightAt((sx + .5) * CELL, (sz + .5) * CELL), serves = floorHeightAt((d.from.cx + .5) * CELL, (d.from.cz + .5) * CELL);
        expect(Math.abs(here - serves), `${name}: the floor at the door against the floor of the cell it serves`).toBeLessThanOrEqual(.9);
        expect(d.y).toBeCloseTo(here, 6);
        // it faces out of the wall into the room: the unit vector is the opposite of the way to the wall
        expect([d.nx, d.nz]).toEqual([-dx, -dz]);
        // the solid part of the door is under the ceiling over its cell, and no wider than the cell and a jamb or two
        const box = new THREE.Box3().setFromObject(d.rig.group);
        expect(box.max.y - d.y, `${name}: the door's height`).toBeLessThan(ceilHeightAt((sx + .5) * CELL, (sz + .5) * CELL) - here + 1e-6);
        const wide = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
        if (!d.site.slab) expect(wide, `${name}: the door's width`).toBeLessThanOrEqual(CELL + .5);
      }
    });
  }

  it("brings a wall of its own at level 3's ledge, and nowhere else (level 1's grid edge went with the rebuild: its exit stands in a wall)", () => {
    expect([...new Set(slabs)].sort()).toEqual([3]);
  });

  it("is reached on foot: from the spawn, over the game's step-up of 1.2, to the cell in front of every exit", () => {
    for (let i = 0; i < LAST; i++) {
      loadLevel(i);
      const start = [player.px / CELL | 0, player.pz / CELL | 0] as const, d = doors.exit!;
      const seen = new Set<string>([start.join(",")]), stack = [start];
      const open = (x: number, z: number): boolean => {
        const ch = world.grid[z]?.[x];
        if (ch === undefined || "#IW".includes(ch)) return false;
        return "+DS".includes(ch) || !solidAt((x + .5) * CELL, (z + .5) * CELL);
      };
      while (stack.length) {
        const [x, z] = stack.pop()!;
        for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + ox, nz = z + oz, k = nx + "," + nz;
          if (seen.has(k) || !open(nx, nz)) continue;
          if (floorHeightAt((nx + .5) * CELL, (nz + .5) * CELL) - floorHeightAt((x + .5) * CELL, (z + .5) * CELL) > 1.2) continue;
          seen.add(k); stack.push([nx, nz]);
        }
      }
      expect(seen.has(d.site.sx + "," + d.site.sz), `level ${i}: ${d.rig.style} door's cell ${d.site.sx},${d.site.sz} from the spawn ${start}`).toBe(true);
    }
  });

  it("lets the entrance walk be walked: no wall or mass between the entrance's cell and the spawn", () => {
    for (let i = 1; i <= LAST; i++) {
      loadLevel(i);
      const e = doors.entrance!, x0 = (e.site.sx + .5) * CELL, z0 = (e.site.sz + .5) * CELL;
      for (let t = 0; t <= 1; t += .05) {
        const x = x0 + (player.px - x0) * t, z = z0 + (player.pz - z0) * t;
        expect(solidAt(x, z), `level ${i}: ${t.toFixed(2)} of the way from the door to the spawn`).toBe(false);
      }
    }
  });
});

describe("the exit is where it always was", () => {
  it("keeps world.exitPos at the X cell on the two levels that write one", () => {
    loadLevel(0);
    expect(world.exitPos).toEqual({ x: 25.5 * CELL, z: 9.5 * CELL });
    loadLevel(1);
    expect(world.exitPos).toEqual({ x: 31.5 * CELL, z: 36.5 * CELL });   // (31.5, 33.5 before level 1 was rebuilt)
  });

  it("builds the five boss levels' doors for the cell openExit takes — the first of EXIT_CELLS that is open ground — and no other level's", () => {
    for (let i = 2; i <= 6; i++) {
      loadLevel(i);
      expect([doors.exit!.from.cx, doors.exit!.from.cz]).toEqual([...exitCell()]);
      expect([...exitCell()]).toEqual([...EXIT_CELLS[0]]);
    }
    expect(EXIT_BOSSES).toBe("QZNHV");
  });

  it("goes by the boss glyphs the grid writes: Q Z N H V on levels 2-6 (a sealed door), and on no other level", () => {
    for (let i = 0; i <= LAST; i++) {
      const g = LEVELS[i].build().g.flat().join("");
      expect([...EXIT_BOSSES].some((c) => g.includes(c)), LEVELS[i].name).toBe(i >= 2 && i <= 6);
    }
  });
});

describe("a boss level's door is sealed until the boss dies", () => {
  for (let i = 2; i <= 6; i++) {
    it(`level ${i}: dark, lightless and untouchable at the start, lit with its light when openExit runs`, () => {
      loadLevel(i);
      const d = doors.exit!;
      expect(world.exitPos).toBeNull();
      expect(d.lit).toBe(false);
      expect(d.rig.glow.visible, "the glow is hidden").toBe(false);
      expect(d.light, "no light yet").toBeNull();
      // touching the sealed door does nothing: there is nothing to open
      deadAll(); standAt(d, .4); game.inputLock = false; S.won = false;
      playerTick(1 / 60);
      expect(S.won).toBe(false);
      expect(trans.phase).toBe("idle");

      openExit();
      expect(world.exitPos).not.toBeNull();
      expect(d.lit).toBe(true);
      expect(d.rig.glow.visible, "the glow comes up").toBe(true);
      expect(d.light, "and the pad's old light").not.toBeNull();
      expect(renderState.scene.children).toContain(d.light);
    });
  }

  it("is not built twice: openExit with the door already there adds the light and no second door", () => {
    loadLevel(2);
    const before = renderState.scene.children.filter((c) => c.name === "exitDoor").length;
    openExit();
    expect(renderState.scene.children.filter((c) => c.name === "exitDoor").length).toBe(before);
  });
});

describe("opening the exit", () => {
  it("honours the boss rule: with a boss alive the door does not open, by touch, by E or by hand, and says why", () => {
    loadLevel(1);
    const d = doors.exit!;
    expect(world.enemies.some((e) => e.boss && !e.dead), "level 1 has its Guardian").toBe(true);
    standAt(d, .4);
    const msg = document.getElementById("msg")!;
    msg.textContent = "";
    // MUTATION TARGET: drop the boss check in leaveLevel
    expect(leaveLevel()).toBe(false);
    expect(S.won).toBe(false);
    expect(msg.textContent).toBe("SOMETHING STILL BREATHES HERE");
    msg.textContent = "";
    exitTick();
    expect(msg.textContent, "walking up to it says the same").toBe("SOMETHING STILL BREATHES HERE");
    tryExit();   // E at the door: the key is spent on it (it returns true), and the door refuses
    expect(S.won).toBe(false);
    expect(trans.phase).toBe("idle");
    expect(game.inputLock).toBe(false);
  });

  it("opens by touch once the boss is dead: walking into it starts the walk", () => {
    loadLevel(1);
    deadAll();
    standAt(doors.exit!, .4);
    playerTick(1 / 60);
    expect(S.won).toBe(true);
    expect(trans.phase).toBe("walk");
    expect(game.inputLock).toBe(true);
  });

  it("opens with E at the door, facing it, within reach — and not facing away, nor from across the room", () => {
    loadLevel(1);
    deadAll();
    const d = doors.exit!;
    standAt(d, 2);
    input.yaw += Math.PI;   // facing away
    expect(tryExit(), "back to it").toBe(false);
    standAt(d, 4);
    expect(tryExit(), "too far").toBe(false);
    standAt(d, 2, 3);
    expect(tryExit(), "too far across").toBe(false);
    expect(trans.phase).toBe("idle");
    standAt(d, 2);
    expect(tryExit(), "facing it, two units off").toBe(true);
    expect(trans.phase).toBe("walk");
  });

  it("says what it is when the player comes up to it, once per approach", () => {
    loadLevel(1);
    deadAll();
    const msg = document.getElementById("msg")!;
    msg.textContent = "";
    standAt(doors.exit!, 3); exitTick();
    expect(msg.textContent).toBe("");
    standAt(doors.exit!, 1.6); exitTick();
    expect(msg.textContent).toBe("PRESS E — THE IRON DOOR");
    msg.textContent = ""; exitTick();
    expect(msg.textContent, "not again while he stands there").toBe("");
  });

  it("saves maxLevel at the moment the door is taken, as the pad did, and not before", () => {
    loadLevel(1);
    deadAll();
    save.maxLevel = 1;
    standAt(doors.exit!, 3); exitTick();
    expect(save.maxLevel, "walking up to the door is not taking it").toBe(1);
    // MUTATION TARGET: move the save out of leaveLevel
    expect(leaveLevel()).toBe(true);
    expect(save.maxLevel, "taking it is").toBe(2);
    expect(JSON.parse(localStorage.getItem("blacksilence.save") || "{}").maxLevel, "and it is on disk").toBe(2);
  });

  it("claims the cells in front of it from the dressing: no wall piece or bulky one where it stands, nor a bulky one at the exit cell", () => {
    loadLevel(2);
    const d = doors.exit!;
    expect(doorClaims(d.site.sx, d.site.sz, "wall")).toBe(true);
    expect(doorClaims(d.site.sx, d.site.sz, "free")).toBe(true);
    expect(doorClaims(d.site.sx, d.site.sz, "flat"), "a rug may lie there").toBe(false);
    expect(doorClaims(d.from.cx, d.from.cz, "edge")).toBe(true);
    expect(doorClaims(d.from.cx, d.from.cz, "wall")).toBe(false);
    expect(doorClaims(d.site.sx + 3, d.site.sz, "free")).toBe(false);
  });

  it("measures how squarely a player stands to a door", () => {
    loadLevel(1);
    const d = doors.exit!;
    standAt(d, 2);
    const a = against(d, player.px, player.pz, input.yaw);
    expect(a.out).toBeCloseTo(2, 6); expect(a.across).toBeCloseTo(0, 6); expect(a.facing).toBeCloseTo(1, 6);
    standAt(d, 2, 1);
    expect(Math.abs(against(d, player.px, player.pz, input.yaw).across)).toBeCloseTo(1, 6);
  });
});

describe("siteDoor", () => {
  const room = ["#######", "#.....#", "#..I..#", "#.....#", "#######"];
  const use = (rows: string[]): void => { world.grid = rows.map((r) => r.split("")); world.heightMap = null; };

  it("finds the nearest '#' in the order it is asked, ties to the earlier, and stops at a pillar", () => {
    use(room);
    expect(siteDoor(3, 1, 3, [[0, -1], [1, 0]])).toMatchObject({ sx: 3, sz: 1, dx: 0, dz: -1, k: 1, slab: false });
    expect(siteDoor(1, 1, 3, [[-1, 0], [0, -1]]), "west and north both one off — the earlier").toMatchObject({ dx: -1, dz: 0 });
    expect(siteDoor(1, 1, 3, [[0, -1], [-1, 0]]), "and the other way round").toMatchObject({ dx: 0, dz: -1 });
    expect(siteDoor(3, 3, 3, [[0, -1]]), "the pillar at (3,2) stops the look north").toBeNull();
    expect(siteDoor(3, 1, 1, [[0, 1]]), "reach: the wall is further than it").toBeNull();
    expect(siteDoor(1, 1, 5, [[1, 0], [0, 1]]), "the nearer of two walls, not the first asked").toMatchObject({ dx: 0, dz: 1, k: 3, sx: 1, sz: 3 });
  });

  it("does not take a door for a wall", () => {
    use(["#####", "#.+.#", "#####"]);
    expect(siteDoor(1, 1, 4, [[1, 0]])).toBeNull();
  });

  it("counts the grid's edge as a wall only when asked, and then marks the site a slab", () => {
    use(["#...#", "#...#"]);
    expect(siteDoor(2, 1, 3, [[0, 1]])).toBeNull();
    expect(siteDoor(2, 1, 3, [[0, 1]], true)).toMatchObject({ sx: 2, sz: 1, dz: 1, k: 1, slab: true });
  });

  it("will not stand at a wall on a ledge it cannot step up to", () => {
    use(["#####", "#...#", "#...#", "#####"]);
    world.heightMap = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 2.3, 2.3, 2.3, 0], [0, 0, 0, 0, 0]];
    expect(siteDoor(2, 1, 3, [[0, 1]]), "south: the cell at the wall is 2.3 up").toBeNull();
    expect(siteDoor(2, 1, 3, [[0, 1], [0, -1]]), "north is level").toMatchObject({ dz: -1, k: 1 });
  });
});

describe("draws nothing from Math.random", () => {
  it("builds every level's doors, opens one and unseals another without a draw from the door modules", () => {
    const real = Math.random, from: string[] = [];
    Math.random = () => {
      const st = new Error().stack || "";
      if (/DoorKit|DoorTextures|ExitDoor|Transition/.test(st) && !/generateUUID/.test(st)) from.push((st.split("\n")[2] || "").trim());
      return real();
    };
    try {
      for (const i of [0, 1, 7]) loadLevel(i);
      loadLevel(2); openExit();
      loadLevel(1); deadAll(); standAt(doors.exit!, .4); playerTick(1 / 60);
    } finally { Math.random = real; }
    expect(from).toEqual([]);
  });
});
