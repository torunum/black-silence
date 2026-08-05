import { describe, expect, it } from "vitest";
import { blankGrid, carve, emptyGrid, hall, link, pillarsRing } from "../../src/world/LevelBuilder";

describe("blankGrid", () => {
  it("produces a solid grid of the requested size", () => {
    const { g, W, H } = blankGrid(5, 3);
    expect(W).toBe(5);
    expect(H).toBe(3);
    expect(g).toHaveLength(3);
    expect(g[0]).toHaveLength(5);
    expect(g.every((row) => row.every((c) => c === "#"))).toBe(true);
  });
});

describe("carve", () => {
  it("fills the rectangle with floor and leaves the rest solid", () => {
    const { g } = blankGrid(6, 6);
    carve(g, 1, 1, 3, 2);
    expect(g[1][1]).toBe(".");
    expect(g[2][3]).toBe(".");
    expect(g[0][0]).toBe("#");
    expect(g[3][3]).toBe("#");
  });

  it("accepts reversed coordinates", () => {
    const { g } = blankGrid(6, 6);
    carve(g, 3, 2, 1, 1);
    expect(g[1][1]).toBe(".");
    expect(g[2][3]).toBe(".");
  });

  it("writes a custom character when given one", () => {
    const { g } = blankGrid(4, 4);
    carve(g, 1, 1, 1, 1, "I");
    expect(g[1][1]).toBe("I");
  });
});

describe("hall", () => {
  it("carves an L-shaped corridor connecting both endpoints", () => {
    const { g } = blankGrid(10, 10);
    hall(g, 1, 1, 8, 8, 1);
    expect(g[1][1]).toBe(".");
    expect(g[8][8]).toBe(".");
  });
});

describe("emptyGrid", () => {
  it("sizes the grid from room count and room size", () => {
    const L = emptyGrid(2, 2, 3, 3);
    expect(L.W).toBe(2 * (3 + 1) + 1);
    expect(L.H).toBe(2 * (3 + 1) + 1);
  });

  it("leaves a solid wall between adjacent rooms", () => {
    const L = emptyGrid(2, 1, 3, 3);
    expect(L.g[1][4]).toBe("#");
  });
});

describe("link", () => {
  it("'open' removes the whole wall between two rooms", () => {
    const L = emptyGrid(2, 1, 3, 3);
    link(L, [0, 0], [1, 0], "open");
    for (let z = 1; z <= 3; z++) expect(L.g[z][4]).toBe(".");
  });

  it("'door' places a single + in the shared wall", () => {
    const L = emptyGrid(2, 1, 3, 3);
    link(L, [0, 0], [1, 0], "door");
    expect(L.g[1 + (3 >> 1)][4]).toBe("+");
  });

  it("'locked' places D and 'secret' places S", () => {
    const a = emptyGrid(2, 1, 3, 3);
    link(a, [0, 0], [1, 0], "locked");
    expect(a.g[1 + (3 >> 1)][4]).toBe("D");

    const b = emptyGrid(2, 1, 3, 3);
    link(b, [0, 0], [1, 0], "secret");
    expect(b.g[1 + (3 >> 1)][4]).toBe("S");
  });
});

describe("pillarsRing", () => {
  it("places pillars along the rectangle edges", () => {
    const { g } = blankGrid(12, 12);
    carve(g, 1, 1, 10, 10);
    pillarsRing(g, 2, 2, 8, 8, 3);
    expect(g[2][2]).toBe("I");
    expect(g[8][8]).toBe("I");
    expect(g[5][5]).toBe(".");
  });
});
