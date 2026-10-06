import { ENEMY_DEFS } from "../../enemies/EnemyDefs";
import type { BuiltLevel } from "../LevelBuilder";
import { CELL } from "../Grid";
import { classifyGlyph, decorCell } from "../density";
import { ANY, EXIT_BOSSES, EXIT_CELLS, EXIT_REACH, siteDoorIn } from "../DoorSite";
import { CHECKPOINTS, LIT_RADIUS } from "../decor/checkpoint";
import { massBlocked } from "../decor/place";
import { cellOf, chAt, idx, isFloor, terrainOf, walk, type Cell, type Terrain } from "./walk";
import { regionGraph } from "./regions";
import { encounters, isArena, verticality, type Encounter } from "./metrics";

/**
 * THE STRUCTURE OF A BUILT LEVEL — validation and metrics in one pass (deeper-levels plan, Task 2).
 *
 * `analyse(level)` reads a `BuiltLevel` (the grid with its glyphs still on it, the height map, the decor list) and
 * returns the numbers a level is designed by (`Structure`) and the hard failures a level may not have
 * (`problems`). The movement model is `walk.ts`, the room graph `regions.ts`, the fights and the heights
 * `metrics.ts`; `tests/world/structureLevels.test.ts` runs every level through it and `scripts/level-structure.ts`
 * writes `docs/level-structure.md` from it.
 *
 * **What a level must be** (each a `Problem` with a `code`):
 *  - `no-spawn`, `no-exit`: exactly one `P`, and a way to finish: an `X` pad, a boss from `EXIT_BOSSES` whose death
 *    opens the first open cell of `EXIT_CELLS` (`Death.ts`'s `openExit`), or the finale boss `G`.
 *  - `exit-unreachable`: the goals cannot be reached from the spawn through required keys, without a secret door.
 *    `needs-secret`: they can, but only through a secret: a secret is a reward, never the way on.
 *  - `softlock`: some state the player can reach cannot finish (a drop into a pit with no way out, a key taken that
 *    leaves the way shut). `key-behind-door`: a key not reachable before any locked door, which is the same trap.
 *  - `door-no-key`: a locked door and no key. (`key-no-door`, a key and no door, is level 1's KNOWN-1: a key that does nothing.)
 *  - `unreachable`: an enemy, pickup, prop, plate, torch, candle, key or checkpoint no state reaches (secrets allowed).
 *  - `secret-door-empty`, `secret-no-reward`: a secret door must be the only way into something (cells reached through it
 *    and no other way) and that something must hold a pickup.
 *  - `exit-door`: the exit door cannot be sited in a wall within reach on the exit cell's own floor (`DoorSite.ts`, the
 *    rule `ExitDoor.ts` uses to build it).
 */

export interface Problem { code: string; message: string }
export type ExitKind = "pad" | "boss" | "finale" | "none";

export interface CheckpointInfo {
  kind: string; x: number; z: number;
  reachable: boolean;
  /** Where along the critical path it stands: the nearest path cell's place, 0 (spawn) to 1 (exit). */
  fraction: number;
  /** Every way through the level passes within `LIT_RADIUS` of it: a player cannot miss it. */
  forced: boolean;
}

export interface Structure {
  spawn: Cell | null;
  exit: { kind: ExitKind; x: number; z: number; boss?: string };
  /** `wall`: a wall within reach on the exit cell's floor; `edge`: only the grid's edge; `freestanding`: nothing (the door brings its own). */
  exitSite: "wall" | "edge" | "freestanding" | "n/a";
  walkable: number;
  critical: {
    /** Steps (cells entered) from the spawn through every waypoint; 0 if there is no way. */
    length: number;
    keyRequired: boolean;
    /** Steps from the spawn to the key the route takes. */
    keyLeg: number | null;
    /** Extra steps the key costs: the route with the key to find, less the route with the key in hand. */
    detour: number;
    cells: Cell[];
  };
  rooms: number; passages: number; loops: number; branches: number; deadEnds: number;
  heights: number; transitions: number;
  keys: number; lockedDoors: number; plainDoors: number; secrets: number;
  /** Pickups behind each secret door, in the order of the doors. */
  secretRewards: number[];
  checkpoints: CheckpointInfo[];
  enemies: number; enemyHp: number; bossHp: number; plates: number;
  encounters: Encounter[];
  arenas: number;
  problems: Problem[];
}

const near = (t: Terrain, c: number, wx: number, wz: number, floor: number): boolean => {
  const x = c % t.W, z = Math.floor(c / t.W);
  return Math.hypot((x + .5) * CELL - wx, (z + .5) * CELL - wz) <= LIT_RADIUS && Math.abs(t.floor[c] - floor) <= 1.6;
};

export function analyse(L: Pick<BuiltLevel, "g" | "hmap" | "decor">): Structure {
  const t = terrainOf(L, massBlocked(L.decor)), N = t.W * t.H, problems: Problem[] = [];
  const say = (code: string, message: string): void => { problems.push({ code, message }); };
  const at = (c: number): string => { const p = cellOf(t, c); return `(${p.x},${p.z})`; };
  const cells = (ch: string): number[] => { const out: number[] = []; for (let c = 0; c < N; c++) if (chAt(t, c) === ch) out.push(c); return out; };

  // ---- spawn, exit, keys, doors, enemies
  const spawns = cells("P");
  if (spawns.length !== 1) say("no-spawn", `${spawns.length} spawn cells (P), wanted exactly one`);
  const start = spawns[0] ?? 0;
  let exitKind: ExitKind = "none", exitCell = -1, bossCell = -1, bossKey: string | undefined;
  const pads = cells("X");
  if (pads.length) { exitKind = "pad"; exitCell = pads[0]; }
  else {
    for (let c = 0; c < N && bossCell < 0; c++) { const ch = chAt(t, c); if (ch && EXIT_BOSSES.includes(ch)) { bossCell = c; bossKey = ch; } }
    if (bossCell >= 0) {
      exitKind = "boss";
      // `openExit` puts the pad on the first of EXIT_CELLS that is open ground (a door reads open statically but is solid until used)
      const open = EXIT_CELLS.find(([x, z]) => isFloor(L.g[z]?.[x]) && !"+DS".includes(L.g[z][x]));
      if (open) exitCell = idx(t, open[0], open[1]); else say("no-exit", `boss ${bossKey} would open the exit, but none of the cells it tries (${EXIT_CELLS.map((c) => c.join(",")).join(" ")}) is open ground`);
    } else if (cells("G").length) { exitKind = "finale"; exitCell = cells("G")[0]; }
    else say("no-exit", "no exit pad (X), no boss whose death opens an exit, and no finale boss (G)");
  }
  const waypoints = exitKind === "boss" ? [bossCell, exitCell].filter((c) => c >= 0) : exitCell >= 0 ? [exitCell] : [];
  const keyCells = cells("K"), locked = cells("D"), secretDoors = cells("S"), plain = cells("+");

  // ---- reachability: everything a state reaches with every secret open
  const everything = walk(t, start, { secrets: "all" });
  // ---- the way through: the waypoints in order, no secret door, the key found on the way if it is needed
  const through = walk(t, start, { secrets: "none", waypoints });
  const keyless = walk(t, start, { secrets: "none", waypoints, noKey: true });
  const withKey = walk(t, start, { secrets: "none", waypoints, startKey: true });
  if (waypoints.length && !through.route) {
    const withSecrets = walk(t, start, { secrets: "all", waypoints });
    if (withSecrets.route) say("needs-secret", "the way to the exit goes through a secret door");
    else say("exit-unreachable", `the spawn ${at(start)} cannot reach ${waypoints.map(at).join(" then ")} (through the required keys)`);
  }
  if (through.route && through.trapped.length) say("softlock", `${through.trapped.length} reachable cell(s) from which the exit can no longer be reached, first ${at(through.trapped[0])}`);
  for (const k of keyCells) if (!through.reachedKeyless[k]) say("key-behind-door", `the key at ${at(k)} cannot be reached before a locked door (or at all)`);
  if (locked.length && !keyCells.length) say("door-no-key", `${locked.length} locked door(s) and no key`);
  if (keyCells.length && !locked.length) say("key-no-door", `a key (${at(keyCells[0])}) and no locked door to open with it`);

  // ---- everything on the grid is somewhere a player can stand
  let enemies = 0, enemyHp = 0, bossHp = 0, plates = 0;
  for (let c = 0; c < N; c++) {
    const ch = chAt(t, c)!;
    const cls = classifyGlyph(ch);
    if (cls === "enemy") { enemies++; const d = ENEMY_DEFS[ch]; if (d.boss || d.hp >= 600) bossHp += d.hp; else enemyHp += d.hp; }
    if (cls === "plate") plates++;
    if (["enemy", "pickup", "prop", "plate", "torch", "candle", "exit"].includes(cls) && !everything.reached[c]) say("unreachable", `'${ch}' (${cls}) stranded at ${at(c)}`);
  }

  // ---- secrets: each door is the only way into something, and that something holds a reward
  const sealed = walk(t, start, { secrets: "none" });
  const secretRewards: number[] = [];
  for (const d of secretDoors) {
    const one = walk(t, start, { secrets: new Set([d]) });
    let rewards = 0, pocket = 0;
    for (let c = 0; c < N; c++) if (one.reached[c] && !sealed.reached[c] && c !== d) { pocket++; if (classifyGlyph(chAt(t, c)!) === "pickup") rewards++; }
    secretRewards.push(rewards);
    if (!sealed.reached[d] && !everything.reached[d]) say("unreachable", `the secret door at ${at(d)} cannot be reached`);
    else if (!pocket) say("secret-door-empty", `the secret door at ${at(d)} opens onto nothing that is not reachable without it`);
    else if (!rewards) say("secret-no-reward", `nothing is behind the secret door at ${at(d)}: no pickup in the ${pocket} cells only it reaches`);
  }

  // ---- the exit door's wall
  let exitSite: Structure["exitSite"] = "n/a";
  if (exitKind !== "finale" && exitCell >= 0) {
    const { x, z } = cellOf(t, exitCell), floorOf = (cx: number, cz: number): number => t.floor[cz * t.W + cx] || 0;
    // as `ExitDoor.ts` asks it, the grid's edge counting: the nearest wall wins, a tie goes to the earlier of south, north, east, west
    const site = siteDoorIn(L.g, floorOf, x, z, EXIT_REACH, ANY, true);
    exitSite = !site ? "freestanding" : site.slab ? "edge" : "wall";
    if (exitSite !== "wall") say("exit-door", `the exit door at ${at(exitCell)} has no wall within ${EXIT_REACH} cells on its own floor (${exitSite})`);
  }

  // ---- the critical path
  const route = through.route ?? [], length = route.length ? route.length - 1 : 0;
  const cp = route.map((c) => cellOf(t, c));
  const keyRequired = waypoints.length > 0 && !!through.route && !keyless.route;
  const keyLeg = through.routeKey !== null ? route.indexOf(through.routeKey) : null;
  const detour = keyRequired && withKey.route ? length - (withKey.route.length - 1) : 0;

  // ---- checkpoints, and whether a player can miss them
  const checkpoints: CheckpointInfo[] = [];
  for (const d of L.decor || []) {
    if (!(d.k in CHECKPOINTS)) continue;
    const { x, z } = decorCell(d), c = idx(t, x, z), wx = (d.x + .5) * CELL, wz = (d.z + .5) * CELL;
    const reachable = !!everything.reached[c];
    if (!reachable) say("unreachable", `the checkpoint ${d.k} at (${x},${z}) is on ground no state reaches`);
    let fraction = 0, forced = false;
    if (route.length > 1) {
      let best = Infinity;
      route.forEach((rc, i) => { const p = cellOf(t, rc), dd = Math.hypot((p.x + .5) * CELL - wx, (p.z + .5) * CELL - wz); if (dd < best) { best = dd; fraction = i / (route.length - 1); } });
      const disc = new Set<number>();
      for (let m = 0; m < N; m++) if (near(t, m, wx, wz, t.floor[c])) disc.add(m);
      forced = !walk(t, start, { secrets: "none", waypoints, extraBlocked: disc }).route;
    }
    checkpoints.push({ kind: d.k, x, z, reachable, fraction, forced });
  }

  // ---- rooms, loops, branches, heights, fights
  const graph = regionGraph(t);
  const goal = new Set([start, exitCell, bossCell].filter((c) => c >= 0).map((c) => graph.of[c]));
  let branches = 0, deadEnds = 0;
  for (const r of graph.regions) {
    if (r.kind === "secret") continue;
    const deg = [...graph.adj[r.id]].filter((o) => graph.regions[o].kind !== "secret").length;
    if (deg >= 3) branches++;
    if (deg === 1 && !goal.has(r.id)) deadEnds++;
  }
  const vert = verticality(t), fights = encounters(t, graph.regions, graph.of, through.dist);
  let walkable = 0;
  for (let c = 0; c < N; c++) { const ch = chAt(t, c); if (ch !== undefined && !"#WI".includes(ch)) walkable++; }
  return {
    spawn: spawns.length ? cellOf(t, start) : null,
    exit: { kind: exitKind, ...(exitCell >= 0 ? cellOf(t, exitCell) : { x: -1, z: -1 }), ...(bossKey ? { boss: bossKey } : {}) },
    exitSite, walkable,
    critical: { length, keyRequired, keyLeg, detour, cells: cp },
    rooms: graph.regions.filter((r) => r.kind === "room").length,
    passages: graph.regions.filter((r) => r.kind === "passage").length,
    loops: graph.loops, branches, deadEnds, ...vert,
    keys: keyCells.length, lockedDoors: locked.length, plainDoors: plain.length, secrets: secretDoors.length, secretRewards,
    checkpoints, enemies, enemyHp, bossHp, plates,
    encounters: fights, arenas: fights.filter(isArena).length,
    problems,
  };
}
