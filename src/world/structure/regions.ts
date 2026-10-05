import { chAt, isFloor, type Terrain } from "./walk";

/**
 * ROOMS, PASSAGES AND THE GRAPH BETWEEN THEM (deeper-levels plan, Task 2) — what "rooms", "loops",
 * "branches" and "dead ends" mean, for a level that is only a grid.
 *
 * A grid has no rooms; it has open cells. Two rules make the rooms the author meant:
 *
 *  - A cell is a **room cell** if it lies in a 2x2 block of open floor (a pillar counts as open for the shape: it stands in a room). A corridor one cell wide has none, so
 *    corridors, doorways, the cell a door stands in and a staircase's narrow run are never room cells. A
 *    **room** is a four-way connected set of at least `ROOM_MIN` room cells (a 3x2 patch), so a corridor that
 *    widens for one cell is not a room. Rooms that were merged by an open wall (level 3's great tomb, level 1's
 *    hall and east wing) are one room, because the wall is gone.
 *  - Every other open cell is a **passage** cell; a connected set of them is one passage (a corridor, a bend, a
 *    junction, a door between two rooms). A passage of `NOOK` cells or fewer that touches one region only is a
 *    nook of that region (the cell between two pillars, a one-cell alcove) and is folded into it, so it is
 *    not counted as a dead end.
 *  - Each secret door `S` is a region of its own, left out of the loop, branch and dead-end counts: a secret is a
 *    reward, not a way round.
 *
 * The **graph** has a node per region and an edge where two regions share a cell edge. Its **loops** are its
 * independent cycles, `E - V + C` (the cyclomatic number: edges, nodes, connected components): two ways between
 * the same places each make one. A locked door counts as an edge (a loop that needs the key is a loop). Height
 * is not considered: a gallery above a pit is the same room as the pit.
 */

export const ROOM_MIN = 6;
export const NOOK = 4;

export type RegionKind = "room" | "passage" | "secret";
export interface Region {
  id: number;
  kind: RegionKind;
  cells: number[];
  x0: number; z0: number; x1: number; z1: number;
}

export interface RegionGraph {
  regions: Region[];
  /** The region of each cell, or -1. */
  of: Int32Array;
  /** Neighbours of each region. */
  adj: Array<Set<number>>;
  /** E, V, C of the graph without secret doors, and the independent cycles `E - V + C`. */
  edges: number; nodes: number; components: number; loops: number;
}

/** The independent cycles of a graph: `E - V + C`. Exported so a test can hold it to a graph drawn by hand. */
export function cyclomatic(nodes: number, edges: ReadonlyArray<readonly [number, number]>): { loops: number; components: number } {
  const parent = Array.from({ length: nodes }, (_, i) => i);
  const find = (a: number): number => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  const uniq = new Set<string>();
  let e = 0, components = nodes;
  for (const [a, b] of edges) {
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    if (a === b || uniq.has(k)) continue;
    uniq.add(k); e++;
    const ra = find(a), rb = find(b);
    if (ra !== rb) { parent[ra] = rb; components--; }
  }
  return { loops: e - nodes + components, components };
}

const R4 = [[1, 0], [0, 1], [-1, 0], [0, -1]] as const;

export function regionGraph(t: Terrain): RegionGraph {
  const { W, H } = t, N = W * H;
  // a pillar stands inside a room: for the shape of a room it is open ground, so the cells round it are room cells and not nooks
  const shape = (x: number, z: number): boolean => x >= 0 && z >= 0 && x < W && z < H && (chAt(t, z * W + x) === "I" || (isFloor(chAt(t, z * W + x)) && !"+DS".includes(chAt(t, z * W + x)!)));
  const roomCell = new Uint8Array(N);
  for (let z = 0; z < H - 1; z++) for (let x = 0; x < W - 1; x++) {
    if (!(shape(x, z) && shape(x + 1, z) && shape(x, z + 1) && shape(x + 1, z + 1))) continue;
    for (const c of [z * W + x, z * W + x + 1, (z + 1) * W + x, (z + 1) * W + x + 1]) if (chAt(t, c) !== "I") roomCell[c] = 1;
  }
  const of = new Int32Array(N).fill(-1), regions: Region[] = [];
  const grow = (seed: number, member: (c: number) => boolean, kind: RegionKind): Region => {
    const cells = [seed], r: Region = { id: regions.length, kind, cells, x0: seed % W, z0: Math.floor(seed / W), x1: seed % W, z1: Math.floor(seed / W) };
    of[seed] = r.id;
    for (let q = 0; q < cells.length; q++) {
      const x = cells[q] % W, z = Math.floor(cells[q] / W);
      r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.z0 = Math.min(r.z0, z); r.z1 = Math.max(r.z1, z);
      for (const [dx, dz] of R4) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const n = nz * W + nx;
        if (of[n] < 0 && member(n)) { of[n] = r.id; cells.push(n); }
      }
    }
    regions.push(r);
    return r;
  };
  // rooms first: connected room cells, kept if there are enough of them
  const bigRoom = new Uint8Array(N);
  const tmp = new Int32Array(N).fill(-1);
  for (let c = 0; c < N; c++) {
    if (!roomCell[c] || tmp[c] >= 0) continue;
    const comp = [c]; tmp[c] = 1;
    for (let q = 0; q < comp.length; q++) {
      const x = comp[q] % W, z = Math.floor(comp[q] / W);
      for (const [dx, dz] of R4) { const nx = x + dx, nz = z + dz, n = nz * W + nx; if (nx >= 0 && nz >= 0 && nx < W && nz < H && roomCell[n] && tmp[n] < 0) { tmp[n] = 1; comp.push(n); } }
    }
    if (comp.length >= ROOM_MIN) for (const m of comp) bigRoom[m] = 1;
  }
  for (let c = 0; c < N; c++) if (bigRoom[c] && of[c] < 0) grow(c, (n) => bigRoom[n] === 1, "room");
  // each secret door on its own
  for (let c = 0; c < N; c++) if (chAt(t, c) === "S") { of[c] = regions.length; regions.push({ id: regions.length, kind: "secret", cells: [c], x0: c % W, z0: Math.floor(c / W), x1: c % W, z1: Math.floor(c / W) }); }
  // passages: whatever open floor is left
  for (let c = 0; c < N; c++) if (of[c] < 0 && isFloor(chAt(t, c))) grow(c, (n) => of[n] < 0 && isFloor(chAt(t, n)), "passage");

  const neighbours = (r: Region): Set<number> => {
    const out = new Set<number>();
    for (const c of r.cells) {
      const x = c % W, z = Math.floor(c / W);
      for (const [dx, dz] of R4) { const nx = x + dx, nz = z + dz; if (nx >= 0 && nz >= 0 && nx < W && nz < H) { const o = of[nz * W + nx]; if (o >= 0 && o !== r.id) out.add(o); } }
    }
    return out;
  };
  // a small passage that touches one region only is that region's nook
  for (const r of regions) {
    if (r.kind !== "passage" || r.cells.length > NOOK) continue;
    const nb = [...neighbours(r)].filter((o) => regions[o].kind !== "secret");
    if (nb.length !== 1) continue;
    const into = regions[nb[0]];
    for (const c of r.cells) { of[c] = into.id; into.cells.push(c); }
    r.cells = [];
  }
  // renumber without the folded ones
  const live = regions.filter((r) => r.cells.length), remap = new Map<number, number>();
  live.forEach((r, i) => remap.set(r.id, i));
  for (let c = 0; c < N; c++) if (of[c] >= 0) of[c] = remap.get(of[c])!;
  live.forEach((r, i) => { r.id = i; });
  const adj = live.map(() => new Set<number>());
  for (const r of live) for (const o of neighbours(r)) adj[r.id].add(o);
  for (const r of live) { r.x0 = r.z0 = Infinity; r.x1 = r.z1 = -Infinity; for (const c of r.cells) { const x = c % W, z = Math.floor(c / W); r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.z0 = Math.min(r.z0, z); r.z1 = Math.max(r.z1, z); } }

  // loops: the graph without secret doors
  const keep = live.filter((r) => r.kind !== "secret"), at = new Map<number, number>();
  keep.forEach((r, i) => at.set(r.id, i));
  const edges: Array<[number, number]> = [];
  for (const r of keep) for (const o of adj[r.id]) if (at.has(o) && r.id < o) edges.push([at.get(r.id)!, at.get(o)!]);
  const { loops, components } = cyclomatic(keep.length, edges);
  return { regions: live, of, adj, edges: edges.length, nodes: keep.length, components, loops };
}
