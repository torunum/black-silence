import { grain } from "../../render/BandTextures";
import type { BuiltLevel, DecorSpec, Grid } from "../LevelBuilder";
import { classifyGlyph, decorCell } from "../density";
import { SIDE_D, WALL_ROT, type Side, type Theme } from "./kit";
import { PIECES, VOCAB } from "./registry";

/**
 * PLACING DRESSING — the rules, and the API a level's builder uses (levels-
 * feel-full plan, Task 1; Tasks 2-3 dress levels 1-7 with it).
 *
 * Decor is visual: it never collides and takes no shot, so the only thing
 * that keeps it from hiding a pickup, sitting in a doorway or making a
 * corridor look walled up is that the *data* obeys these rules. They are
 * checked twice, by the same function: incrementally as a `Decorator` places
 * pieces (a rejected `place` throws — authored dressing that breaks a rule is
 * a bug in the level; a rejected `clutter` candidate is just skipped), and
 * from scratch by `validateDecor` on a finished level, which is what
 * `tests/world/decorKit.test.ts` runs over every level.
 *
 * The rules, by a piece's mode (`kit.ts`):
 *  - never off the grid, on a wall or pillar (bar a `solid` piece, which
 *    *must* stand on an `I`), or more than 0.3 of a cell from its cell's centre;
 *  - never on a door cell, a pickup, the spawn or the exit;
 *  - `edge` and `free` (bulky) pieces only on a plain floor cell (`.`), never
 *    beside a door, pickup, spawn or exit, one to a cell, and never where
 *    treating the cell as blocked would cut the way through — which is what a
 *    1-wide corridor, a bend and a junction's arm are;
 *  - `edge` and `wall` pieces with their back to a plain `#` wall (the yaw
 *    `WALL_ROT` gives), one to each wall side;
 *  - `flat` pieces at most two to a cell, `hang` pieces one.
 *
 * Nothing here calls `Math.random`: positions and picks come from `grain`,
 * the integer hash of the cell and a seed, so a level always dresses the same.
 */

export interface DecorProblem { spec: DecorSpec; why: string }

const key = (x: number, z: number): number => z * 4096 + x;
const SIDES: readonly Side[] = ["n", "e", "s", "w"];
/** Where a piece's back is, from its yaw: the side it stands against, or null if it faces no side squarely. */
function sideOf(r: number): Side | null {
  const bx = -Math.sin(r), bz = -Math.cos(r);
  for (const s of SIDES) if (SIDE_D[s][0] * bx + SIDE_D[s][1] * bz > .97) return s;
  return null;
}

/** What has been placed so far on a grid, and whether one more piece may join it. */
export class Board {
  private bulky = new Set<number>();
  private walls = new Set<string>();
  private hung = new Set<number>();
  private flats = new Map<number, number>();
  constructor(readonly g: Grid) {}

  private at(x: number, z: number): string | undefined { return this.g[z]?.[x]; }
  private solid(c: string | undefined): boolean { return c === undefined || "#WI".includes(c); }
  private walkable(x: number, z: number): boolean { return !this.solid(this.at(x, z)) && !this.bulky.has(key(x, z)); }

  /** Would the cell's open neighbours still reach one another if it were blocked? False for a corridor, a bend, a junction's arm. */
  private blocksPath(cx: number, cz: number): boolean {
    const around = SIDES.map((s) => [cx + SIDE_D[s][0], cz + SIDE_D[s][1]] as const).filter(([x, z]) => this.walkable(x, z));
    if (around.length <= 1) return false;
    const seen = new Set<number>([key(cx, cz), key(around[0][0], around[0][1])]), stack = [around[0]];
    let found = 1;
    while (stack.length) {
      const [x, z] = stack.pop()!;
      for (const s of SIDES) {
        const nx = x + SIDE_D[s][0], nz = z + SIDE_D[s][1], k = key(nx, nz);
        if (seen.has(k) || !this.walkable(nx, nz)) continue;
        seen.add(k); stack.push([nx, nz] as const);
        if (around.some(([ax, az]) => ax === nx && az === nz) && ++found === around.length) return false;
      }
    }
    return true;
  }

  /** Why this spec may not go here, or null if it may. */
  why(d: DecorSpec): string | null {
    const info = PIECES[d.k];
    if (!info) return "no piece called " + d.k;
    if (info.mode === "cover") return null;
    const { x: cx, z: cz } = decorCell(d), c = this.at(cx, cz);
    if (c === undefined) return "off the grid";
    if (info.mode === "solid") return c === "I" ? null : "a solid piece must stand on an I cell";
    if (Math.abs(d.x - cx) > .3 || Math.abs(d.z - cz) > .3) return "too far from its cell's centre";
    if (this.solid(c)) return "on a wall or pillar";
    const cls = classifyGlyph(c);
    if (cls === "door") return "on a door cell";
    if (cls === "pickup" || cls === "spawn" || cls === "exit" || cls === "plate") return "on a pickup, the spawn or the exit";
    const bulky = info.mode === "edge" || info.mode === "free";
    if (bulky) {
      if (c !== ".") return "on an occupied cell";
      for (const s of SIDES) {
        const n = classifyGlyph(this.at(cx + SIDE_D[s][0], cz + SIDE_D[s][1]) || "#");
        if (n === "door") return "beside a door";
        if (n === "pickup" || n === "spawn" || n === "exit" || n === "plate") return "beside a pickup, the spawn or the exit";
      }
      if (this.bulky.has(key(cx, cz))) return "a second bulky piece in the cell";
      if (this.blocksPath(cx, cz)) return "blocks the way (a 1-wide corridor, a bend or a junction)";
    }
    if (info.mode === "edge" || info.mode === "wall") {
      const side = sideOf(d.r || 0);
      if (!side) return "not squarely against a side";
      if (this.at(cx + SIDE_D[side][0], cz + SIDE_D[side][1]) !== "#") return "no wall behind it";
      if (this.walls.has(cx + "," + cz + "," + side)) return "that wall is already dressed";
    }
    if (info.mode === "hang" && this.hung.has(key(cx, cz))) return "a second hanging piece in the cell";
    if (info.mode === "flat" && (this.flats.get(key(cx, cz)) || 0) >= 2) return "the floor there is already covered";
    return null;
  }

  /** Records a spec `why` has passed. */
  add(d: DecorSpec): void {
    const info = PIECES[d.k];
    if (!info || info.mode === "cover" || info.mode === "solid") return;
    const { x, z } = decorCell(d), k = key(x, z);
    if (info.mode === "edge" || info.mode === "free") this.bulky.add(k);
    if (info.mode === "edge" || info.mode === "wall") this.walls.add(x + "," + z + "," + sideOf(d.r || 0));
    if (info.mode === "hang") this.hung.add(k);
    if (info.mode === "flat") this.flats.set(k, (this.flats.get(k) || 0) + 1);
  }
}

/** Every rule a finished level's decor list breaks. Empty means the dressing is safe. Run on a builder's own output (its grid still has its glyphs). */
export function validateDecor(L: Pick<BuiltLevel, "g" | "decor">): DecorProblem[] {
  const board = new Board(L.g), out: DecorProblem[] = [];
  for (const spec of L.decor || []) {
    const why = board.why(spec);
    if (why) out.push({ spec, why }); else board.add(spec);
  }
  return out;
}

export interface PlaceOptions { side?: Side; r?: number; s?: number; h?: number }
export interface ClutterOptions {
  /** Chance a wall-side cell is dressed, 0-1 (a corner counts 1.6 times). Default .3. */
  density?: number;
  /** Any integer: another seed, another (still fixed) dressing. Default 1. */
  seed?: number;
  /** Restrict to these kinds of the theme's vocabulary. */
  kinds?: readonly string[];
  /** Only cells this returns true for — a room's bounds, or "not the boss's arena". */
  where?: (x: number, z: number) => boolean;
}

/**
 * Dresses one level's grid. Build the level's glyphs first, then:
 *
 *     const dress = new Decorator(L, "dungeon");
 *     dress.place("shackles", 12, 3);                 // a wall piece: the side is found from the grid
 *     dress.place("cage", 20, 9, { h: 0 });           // a set-piece, exactly here
 *     dress.layer(["....s....", "..b......"], { s: "straw", b: "bench" });   // or a glyph layer over the grid
 *     dress.clutter({ density: .4, seed: 3 });        // the walls, filled in by the theme's vocabulary
 *     L.decor = dress.specs;
 */
export class Decorator {
  readonly specs: DecorSpec[];
  private board: Board;
  constructor(readonly L: Pick<BuiltLevel, "g" | "W" | "H">, readonly theme: Theme, existing: DecorSpec[] = []) {
    this.board = new Board(L.g);
    this.specs = [];
    for (const d of existing) { this.board.add(d); this.specs.push(d); }
  }

  /** The wall sides of a cell, in n e s w order. */
  wallSides(x: number, z: number): Side[] {
    return SIDES.filter((s) => this.L.g[z + SIDE_D[s][1]]?.[x + SIDE_D[s][0]] === "#");
  }

  /** Places a piece, or says why not. A wall or edge piece with no `side` or `r` picks a wall side by the hash. */
  tryPlace(k: string, x: number, z: number, o: PlaceOptions = {}): string | null {
    const info = PIECES[k];
    if (!info) return "no piece called " + k;
    const d: DecorSpec = { k, x, z };
    if (o.r !== undefined) d.r = o.r;
    else if (info.mode === "edge" || info.mode === "wall") {
      const sides = o.side ? [o.side] : this.wallSides(x, z);
      if (!sides.length) return "no wall beside it";
      d.r = WALL_ROT[sides[Math.floor(grain(x, z, 71) * sides.length)]];
    } else if (info.mode !== "solid" && info.mode !== "cover") d.r = grain(x, z, 72) * Math.PI * 2;
    if (o.s !== undefined) d.s = o.s;
    if (o.h !== undefined) d.h = o.h;
    const why = this.board.why(d);
    if (why) return why;
    this.board.add(d); this.specs.push(d);
    return null;
  }

  /** Places a piece exactly where told, or throws: authored dressing that breaks a rule is a bug in the level's data. */
  place(k: string, x: number, z: number, o: PlaceOptions = {}): this {
    const why = this.tryPlace(k, x, z, o);
    if (why) throw new Error(`decor: ${k} at (${x},${z}): ${why}`);
    return this;
  }

  /** A layer of glyphs over the grid (row z, column x), each turned into its kind by `legend`; anything the legend lacks is skipped. */
  layer(rows: readonly string[], legend: Readonly<Record<string, string>>): this {
    rows.forEach((row, z) => [...row].forEach((ch, x) => { if (legend[ch]) this.place(legend[ch], x, z); }));
    return this;
  }

  /** Dresses plain floor beside walls with the theme's vocabulary; returns how many pieces went in. Candidates that break a rule are skipped. */
  clutter(o: ClutterOptions = {}): number {
    const density = o.density ?? .3, seed = o.seed ?? 1;
    const vocab = VOCAB[this.theme].filter((v) => !o.kinds || o.kinds.includes(v.k));
    const total = vocab.reduce((n, v) => n + v.w, 0);
    let placed = 0;
    for (let z = 0; z < this.L.H; z++) for (let x = 0; x < this.L.W; x++) {
      if (this.L.g[z][x] !== "." || (o.where && !o.where(x, z))) continue;
      const sides = this.wallSides(x, z);
      if (!sides.length || grain(x, z, seed) >= density * (sides.length > 1 ? 1.6 : 1)) continue;
      for (let attempt = 0; attempt < 3; attempt++) {   // the first choice may not fit; the hash offers two more
        let at = grain(x, z, seed + 1 + attempt * 7) * total, k = vocab[0].k;
        for (const v of vocab) { if ((at -= v.w) < 0) { k = v.k; break; } }
        const side = sides[Math.floor(grain(x, z, seed + 4) * sides.length)], mode = PIECES[k].mode;
        const jitter = mode === "flat" ? (grain(x, z, seed + 5) - .5) * .5 : 0;
        const lean = mode === "free" ? .28 : 0;   // a freestanding piece stands nearer its wall
        const dx = SIDE_D[side][0], dz = SIDE_D[side][1];
        const spec: DecorSpec = { k, x: x + dx * lean + (dz ? jitter : 0), z: z + dz * lean + (dx ? jitter : 0) };
        if (mode === "edge" || mode === "wall") spec.r = WALL_ROT[side];
        else if (mode !== "cover" && mode !== "solid") spec.r = grain(x, z, seed + 6) * Math.PI * 2;
        if (this.board.why(spec)) continue;
        this.board.add(spec); this.specs.push(spec); placed++;
        break;
      }
    }
    return placed;
  }
}
