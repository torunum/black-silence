// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { world } from "../../src/world/WorldState";
import { CELL } from "../../src/world/Grid";

/**
 * THE MINIMAP (owner, 2026-10-20: "mini map önemli. yönümüzü bulamıyoruz") — `src/ui/Minimap.ts`.
 * What the player has seen is what the map knows: a fan of rays from where they stand marks the cells it
 * reaches, the wall or closed door that stops a ray included, and nothing behind it; a door that opens lets
 * the next fan through; a new level's grid starts the record blank. The page carries both canvases.
 */

let M: typeof import("../../src/ui/Minimap");

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  M = await import("../../src/ui/Minimap");
});

/** Two rooms joined by a door at (6,2): west room x 1..5, east room x 7..10. */
function twoRooms(): void {
  const rows = [
    "############",
    "#.....#....#",
    "#.....+....#",
    "#.....#....#",
    "############",
  ];
  world.grid = rows.map((r) => r.split(""));
  world.GW = rows[0].length; world.GH = rows.length;
  world.doors = { "6,2": { open: false } };
  world.heightMap = null;
  M.resetMinimap();
}
const at = (gx: number, gz: number): [number, number] => [(gx + .5) * CELL, (gz + .5) * CELL];

describe("the minimap's record of what the player has seen", () => {
  it("the page has the corner map and the automap", () => {
    expect(document.getElementById("minimap")).toBeTruthy();
    expect(document.getElementById("automap")).toBeTruthy();
  });

  it("marks the room the player stands in, its walls and its closed door — and nothing behind the door", () => {
    twoRooms();
    M.revealAround(...at(2, 2));
    for (let x = 1; x <= 5; x++) for (let z = 1; z <= 3; z++) expect(M.seenCell(x, z), `${x},${z}`).toBe(true);
    expect(M.seenCell(0, 2)).toBe(true);    // the west wall
    expect(M.seenCell(6, 2)).toBe(true);    // the door itself
    for (let x = 7; x <= 10; x++) for (let z = 1; z <= 3; z++) expect(M.seenCell(x, z), `${x},${z}`).toBe(false);
  });

  it("an opened door lets the next look through it", () => {
    twoRooms();
    M.revealAround(...at(4, 2));
    expect(M.seenCell(8, 2)).toBe(false);
    (world.doors["6,2"] as { open: boolean }).open = true;
    M.revealAround(...at(4, 2));
    expect(M.seenCell(8, 2)).toBe(true);
  });

  it("keeps what was seen as the player moves on, and a new level's grid starts blank", () => {
    twoRooms();
    M.revealAround(...at(2, 2));
    const n = M.seenCount();
    expect(n).toBeGreaterThan(15);
    M.revealAround(...at(5, 3));
    expect(M.seenCount()).toBeGreaterThanOrEqual(n);
    twoRooms();
    expect(M.seenCount()).toBe(0);
  });

  it("casts nothing from Math.random", () => {
    twoRooms();
    const original = Math.random; let n = 0;
    Math.random = () => { n++; return original(); };
    try { M.revealAround(...at(2, 2)); M.minimapTick(0.2, 1, true); } finally { Math.random = original; }
    expect(n).toBe(0);
  });

  it("M toggles the automap", () => {
    const was = M.automapOpen();
    dispatchEvent(new KeyboardEvent("keydown", { code: "KeyM" }));
    expect(M.automapOpen()).toBe(!was);
    dispatchEvent(new KeyboardEvent("keydown", { code: "KeyM" }));
    expect(M.automapOpen()).toBe(was);
  });
});
