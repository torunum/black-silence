import type { Grid } from "../LevelBuilder";

/**
 * HOW A PLAYER MOVES THROUGH A GRID — the model every structural question is asked of (deeper-levels plan,
 * Task 2). Pure: a grid, a height map and a set of blocked cells in, distances and routes out. Nothing here
 * loads a level.
 *
 * **The step.** Four-way, cell to cell. A grounded player cannot walk onto ground more than `STEP_UP` above
 * the floor under them (`src/player/Player.ts`: `floorHeightAt(nx, pz) - fh > 1.2` refuses the step); going
 * down is always allowed, so the graph is *directed*: a drop is a one-way door. The jump (7.4 up, 20 down:
 * about 1.37) is not counted, on purpose: a level has to be walkable, and a ledge only a jump climbs is a
 * route a player may not find. `tests/world/structure.test.ts` reads `Player.ts` and fails if the 1.2 moves.
 *
 * **Doors.** `+` always opens. `D` opens once the red key is held (`S.key` is one boolean: one key opens every
 * `D`, and holding it is permanent for the level). `S` is a secret, passable only when the question allows
 * secrets: the way through a level never needs one. A decor mass (`blocked`) and the piano `p` (an unbreakable
 * prop that fills its cell) are walls.
 *
 * **State.** Where the player stands, whether they hold the key, and how many of an ordered list of
 * waypoints they have already visited. That is enough to answer, exactly and by search: how far is the exit
 * through the required keys, which cells can be reached at all, and whether any reachable state can no longer
 * finish (a softlock: a key behind its own door, a drop into a pit with no way out).
 */

/** The most a grounded player steps up (`Player.ts`). */
export const STEP_UP = 1.2;

export interface Cell { x: number; z: number }

export interface Terrain {
  g: Grid;
  W: number;
  H: number;
  /** The floor's world-y under each cell, `z * W + x`. */
  floor: number[];
  /** Cells nothing walks through (decor masses). */
  blocked: ReadonlySet<number>;
}

export const idx = (t: Pick<Terrain, "W">, x: number, z: number): number => z * t.W + x;
export const cellOf = (t: Pick<Terrain, "W">, i: number): Cell => ({ x: i % t.W, z: Math.floor(i / t.W) });

/** `blocked` is keyed `z * 4096 + x`, as `massBlocked` (`decor/place.ts`) makes it. */
export function terrainOf(L: { g: Grid; hmap?: number[][] }, blocked: ReadonlySet<number> = new Set()): Terrain {
  const H = L.g.length, W = Math.max(...L.g.map((r) => r.length));
  const floor: number[] = [];
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) floor.push(L.hmap?.[z]?.[x] || 0);
  const b = new Set<number>();
  for (const k of blocked) { const x = k % 4096, z = (k - x) / 4096; b.add(z * W + x); }
  return { g: L.g, W, H, floor, blocked: b };
}

export const chAt = (t: Terrain, i: number): string | undefined => t.g[Math.floor(i / t.W)]?.[i % t.W];

/** A cell the architecture leaves open: not a wall, a pillar, a window, the piano or off the grid. Doors count (they are cells). */
export function isFloor(ch: string | undefined): boolean {
  return ch !== undefined && !"#IWp".includes(ch);
}

/** Which secret doors may be opened: all, none, or these cells. */
export type Secrets = "all" | "none" | ReadonlySet<number>;

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

export interface WalkOpts {
  secrets: Secrets;
  /** Visited in this order to finish. Empty: no goal, so no softlock to find. */
  waypoints?: readonly number[];
  /** Cells the player may not enter, beyond the terrain's (a marker's reach, say). */
  extraBlocked?: ReadonlySet<number>;
  /** The key cannot be picked up: what a level needs if no `D` is ever opened. */
  noKey?: boolean;
  /** The key is already held at the start: how far the way would be if no key had to be found. */
  startKey?: boolean;
}

export interface Walk {
  /** The cells some state reaches. */
  reached: Uint8Array;
  /** Fewest steps to each cell over every state (-1: never). */
  dist: Int32Array;
  /** Cells a state reaches while the key is not held: where a key can be found before any locked door. */
  reachedKeyless: Uint8Array;
  /** The shortest way through every waypoint, spawn first, or null. */
  route: number[] | null;
  /** The key cell the route takes, if it takes one. */
  routeKey: number | null;
  /** Cells where a reachable state exists from which the goal can no longer be reached. */
  trapped: number[];
}

/**
 * Searches the state graph from `start`. Cells of `K` pick the key up on entry (a `D` is walkable only with it).
 */
export function walk(t: Terrain, start: number, o: WalkOpts): Walk {
  const N = t.W * t.H, wps = o.waypoints ?? [], S = wps.length + 1;
  const sid = (c: number, key: number, stage: number): number => (stage * 2 + key) * N + c;
  const total = N * 2 * S;
  const dist = new Int32Array(total).fill(-1), parent = new Int32Array(total).fill(-1);
  const pred: number[][] | null = wps.length ? Array.from({ length: total }, () => []) : null;

  const passable = (c: number, key: number): boolean => {
    const ch = chAt(t, c);
    if (!isFloor(ch) || t.blocked.has(c) || o.extraBlocked?.has(c)) return false;
    if (ch === "D") return key === 1;
    if (ch === "S") return o.secrets === "all" || (o.secrets !== "none" && o.secrets.has(c));
    return true;
  };

  const entered = new Uint8Array(N);   // cells some keyless state steps into
  const s0 = sid(start, o.startKey || (!o.noKey && chAt(t, start) === "K") ? 1 : 0, 0);
  dist[s0] = 0;
  const queue = [s0];
  for (let q = 0; q < queue.length; q++) {
    const s = queue[q], c = s % N, rest = (s - c) / N, key = rest % 2, stage = (rest - key) / 2;
    const x = c % t.W, z = (c - x) / t.W;
    for (const [dx, dz] of DIRS) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= t.W || nz >= t.H) continue;
      const n = nz * t.W + nx;
      if (!passable(n, key) || t.floor[n] - t.floor[c] > STEP_UP) continue;
      const nkey = key || (!o.noKey && chAt(t, n) === "K" ? 1 : 0), nstage = stage < wps.length && n === wps[stage] ? stage + 1 : stage;
      const ns = sid(n, nkey, nstage);
      if (!key) entered[n] = 1;   // entered from a state with no key: the key's own cell counts
      pred?.[ns].push(s);
      if (dist[ns] >= 0) continue;
      dist[ns] = dist[s] + 1; parent[ns] = s; queue.push(ns);
    }
  }

  const reached = new Uint8Array(N), reachedKeyless = entered, cellDist = new Int32Array(N).fill(-1);
  for (const s of queue) {
    const c = s % N, key = Math.floor(s / N) % 2;
    reached[c] = 1;
    if (!key) reachedKeyless[c] = 1;
    if (cellDist[c] < 0 || dist[s] < cellDist[c]) cellDist[c] = dist[s];
  }

  let route: number[] | null = null, routeKey: number | null = null;
  const trapped: number[] = [];
  if (wps.length) {
    let best = -1;
    for (const s of queue) {
      if (Math.floor(s / (N * 2)) !== wps.length) continue;   // the stage is the top digit
      if (best < 0 || dist[s] < dist[best]) best = s;
    }
    if (best >= 0) {
      route = [];
      for (let s = best; s >= 0; s = parent[s]) { route.push(s % N); if (chAt(t, s % N) === "K" && routeKey === null) routeKey = s % N; }
      route.reverse();
    }
    // a state is alive if some chain of steps leads to a terminal state (every waypoint visited)
    const alive = new Uint8Array(total), back: number[] = [];
    for (const s of queue) if (Math.floor(s / (N * 2)) === wps.length) { alive[s] = 1; back.push(s); }
    for (let q = 0; q < back.length; q++) for (const p of pred![back[q]]) if (!alive[p]) { alive[p] = 1; back.push(p); }
    const seen = new Set<number>();
    for (const s of queue) if (!alive[s] && !seen.has(s % N)) { seen.add(s % N); trapped.push(s % N); }
  }
  return { reached, dist: cellDist, reachedKeyless, route, routeKey, trapped };
}
