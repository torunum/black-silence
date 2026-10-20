import { beforeEach, describe, expect, it } from "vitest";
import { world } from "../../src/world/WorldState";
import { CELL } from "../../src/world/Grid";
import { alertSound, soundStep, REACH } from "../../src/enemies/ai/Perception";
import type { Enemy } from "../../src/enemies/Enemy";

/**
 * SOUND, AS DOOM CARRIES IT (owner, 2026-10-20) — `src/enemies/ai/Perception.ts`'s `alertSound` and `soundStep`.
 * A noise floods the grid from where it was made: open floor and open doors carry it, walls and closed doors stop it,
 * and an enemy it reaches walks down the flood to it, round the corner, instead of into the wall between.
 */

/**
 *   0123456789012
 * 0 #############
 * 1 #.....#.....#    the west room (x 1-5) and the east room (x 7-11), a door at (6,2) between them;
 * 2 #.....+.....#    a corridor (x 1, z 4-6) bends south out of the west room into the south room
 * 3 #.....#.....#
 * 4 #.###########
 * 5 #.......E...#    the south room (x 1-11, z 5-6)
 * 6 #...........#
 * 7 #############
 */
const MAP = [
  "#############",
  "#.....#.....#",
  "#.....+.....#",
  "#.....#.....#",
  "#.###########",
  "#...........#",
  "#...........#",
  "#############",
];
const at = (gx: number, gz: number) => ({ x: (gx + .5) * CELL, z: (gz + .5) * CELL });
function enemyAt(gx: number, gz: number): Enemy {
  const { x, z } = at(gx, gz);
  return { x, z, dead: false, dormant: false, alertX: -1, alertZ: -1 } as unknown as Enemy;
}

beforeEach(() => {
  world.grid = MAP.map((r) => r.split(""));
  world.GW = MAP[0].length; world.GH = MAP.length;
  world.doors = { "6,2": { open: false } };
  world.enemies = [];
});

describe("a noise is carried through open ground, not through walls", () => {
  it("reaches an enemy in the same room, and not one behind a closed door, however near", () => {
    const near = enemyAt(4, 2), behindDoor = enemyAt(8, 2);
    world.enemies = [near, behindDoor];
    const shot = at(3, 2);
    alertSound(shot.x, shot.z, 18);
    expect([near.alertX, near.alertZ]).toEqual([shot.x, shot.z]);
    expect(behindDoor.alertX).toBe(-1);
  });

  it("an open door lets it through", () => {
    const behindDoor = enemyAt(8, 2);
    world.enemies = [behindDoor];
    (world.doors["6,2"] as { open: boolean }).open = true;
    const shot = at(3, 2);
    alertSound(shot.x, shot.z, 18);
    expect(behindDoor.alertX).toBe(shot.x);
  });

  it("does not pass a solid wall even when the enemy is a stone's throw away as the crow flies, but goes round by the corridor", () => {
    // (8,5) in the south room is 3 cells below (8,2) through the wall at z 4; by the corridor it is far further
    const south = enemyAt(8, 5);
    world.enemies = [south];
    const shot = at(8, 2);
    (world.doors["6,2"] as { open: boolean }).open = true;
    alertSound(shot.x, shot.z, 4);                 // a short reach: the long way round is beyond it
    expect(south.alertX).toBe(-1);
    alertSound(shot.x, shot.z, 30);                // a loud one (seventeen cells round by the door, the west room and the corridor)
    expect(south.alertX).toBe(shot.x);
  });

  it("leads the enemy that heard it round the corner, cell by cell, to the noise", () => {
    const south = enemyAt(8, 5);
    world.enemies = [south];
    const shot = at(3, 2);
    alertSound(shot.x, shot.z, 18);
    expect(south.alertX).toBe(shot.x);
    // walk the flood: every step is to a neighbouring open cell, and it arrives
    let x = south.x, z = south.z;
    const visited: string[] = [];
    for (let i = 0; i < 40; i++) {
      const st = soundStep(x, z, south.alertX, south.alertZ);
      if (!st) break;
      const [gx, gz] = [Math.floor(st.x / CELL), Math.floor(st.z / CELL)];
      expect(MAP[gz][gx]).not.toBe("#");
      visited.push(`${gx},${gz}`);
      x = st.x; z = st.z;
    }
    expect(visited).toContain("1,4");                                    // through the corridor's bend
    expect([Math.floor(x / CELL), Math.floor(z / CELL)]).toEqual([3, 2]); // and at the noise
  });

  it("is no guide to an enemy chasing some other alert", () => {
    const south = enemyAt(8, 5);
    const shot = at(3, 2);
    alertSound(shot.x, shot.z, 18);
    expect(soundStep(south.x, south.z, 1, 1)).toBeNull();
  });

  it("carries a gunshot (radius 18) about REACH times as far, walking, as it used to reach in a line", () => {
    expect(REACH).toBeGreaterThanOrEqual(1.2);
    expect(REACH).toBeLessThanOrEqual(2);
  });

  it("draws nothing from Math.random", () => {
    const original = Math.random; let n = 0;
    Math.random = () => { n++; return original(); };
    try { world.enemies = [enemyAt(8, 5)]; alertSound(at(3, 2).x, at(3, 2).z, 18); soundStep(at(8, 5).x, at(8, 5).z, at(3, 2).x, at(3, 2).z); }
    finally { Math.random = original; }
    expect(n).toBe(0);
  });
});
