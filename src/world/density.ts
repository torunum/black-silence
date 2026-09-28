import { ENEMY_DEFS } from "../enemies/EnemyDefs";
import type { BuiltLevel, DecorSpec } from "./LevelBuilder";

/**
 * HOW FULL A LEVEL IS — the measurements behind "the levels feel very empty"
 * (levels-feel-full plan, Task 1). Pure: it reads a `BuiltLevel` (the grid
 * and its decor list) and counts, so `scripts/level-density.ts` can print the
 * baseline for every level, `docs/level-density.md` can carry it, and the
 * later tasks can re-run it and see what they changed.
 *
 * The glyph classification is `loadLevel`'s dispatch, in `loadLevel`'s order
 * (`LevelLoader.ts`: P, X, i, l, p, Y, then the enemy table, then the prop
 * string, then the item table), because what is counted must be what the
 * loader really builds. `tests/world/density.test.ts` loads every level for
 * real and holds these counts equal to `world.enemies`, `world.props`,
 * `world.items`, `world.torches` and the scene's point lights, so the
 * two cannot drift.
 *
 * **Bare.** A walkable cell is *bare* when nothing stands on it or beside it:
 * no glyph on the cell or any of its eight neighbours (a pillar, door, torch,
 * enemy, prop or pickup all count; a plain wall does not, or nothing along a
 * wall could ever be bare), and no decor piece there either (ground cover —
 * grass, fire, the bridge, the roof, lights — is not furniture and does not
 * count). The **longest bare run** is the most bare cells in a straight line
 * along a row or a column; the **largest bare region** is the biggest
 * four-way connected set of bare cells — the emptiest room (or corridor).
 * A cell is 2 world units wide, so a run of 10 cells is 20 metres of nothing.
 */

/** The cells a player can stand on. Doors count: a closed door is a way through. */
const SOLID = "#WI";

/** Decor that covers ground or sky rather than furnishing a place. */
const COVER = new Set(["grass", "ember", "bridge", "roof", "light"]);

/** `loadLevel`'s item table (`map2`), by glyph. Weapons are `w1`..`w7`. */
export const ITEM_KIND: Readonly<Record<string, string>> = {
  h: "health", A: "armor", r: "armor", a: "bullets", b: "shells", o: "slugs", c: "crosses", K: "key",
  "2": "w1", "3": "w2", "4": "w3", "5": "w4", "6": "w5", "7": "w6", "8": "w7", "9": "nails", "0": "souls",
};

/** The prop string `loadLevel` hands `spawnProp`, and what each glyph builds. `C` and `V` are enemies first (KNOWN-4). */
export const PROP_KIND: Readonly<Record<string, string>> = { x: "crate", T: "table", C: "chair", F: "shelf", V: "pew", O: "barrel", v: "pew" };

export type GlyphClass = "floor" | "wall" | "window" | "pillar" | "door" | "spawn" | "exit" | "torch" | "candle" | "piano" | "plate" | "enemy" | "prop" | "pickup" | "unknown";

/** What `loadLevel` makes of one grid character, in its own order. */
export function classifyGlyph(ch: string): GlyphClass {
  if (ch === ".") return "floor";
  if (ch === "#") return "wall";
  if (ch === "W") return "window";
  if (ch === "I") return "pillar";
  if (ch === "+" || ch === "D" || ch === "S") return "door";
  if (ch === "P") return "spawn";
  if (ch === "X") return "exit";
  if (ch === "i") return "torch";
  if (ch === "l") return "candle";
  if (ch === "p") return "piano";
  if (ch === "Y") return "plate";
  if (ENEMY_DEFS[ch]) return "enemy";
  if ("xTCFVOv".includes(ch)) return "prop";
  if (ITEM_KIND[ch]) return "pickup";
  return "unknown";
}

/** The grid cell a decor spec stands in (`Decor.ts` places at `(x + .5) * CELL`). */
export function decorCell(d: DecorSpec): { x: number; z: number } {
  return { x: Math.floor(d.x + .5), z: Math.floor(d.z + .5) };
}

export interface Region { cells: number; x0: number; z0: number; x1: number; z1: number }
export interface Run { cells: number; x0: number; z0: number; x1: number; z1: number }

export interface Density {
  walkable: number;
  props: Record<string, number>;
  propsTotal: number;
  decor: number;
  decorByKind: Record<string, number>;
  pickups: Record<string, number>;
  pickupsTotal: number;
  enemies: number;
  bosses: number;
  torches: number;
  candles: number;
  lights: number;
  bareCells: number;
  longestRun: Run;
  emptiest: Region;
  /** The grid drawn: `#` solid, `+` furnished, `.` bare, `R` bare and in the emptiest region. */
  map: string[];
}

const bump = (o: Record<string, number>, k: string): void => { o[k] = (o[k] || 0) + 1; };

/** Which walkable cells have nothing on or beside them. Exported for the tests. */
export function bareGrid(L: Pick<BuiltLevel, "g" | "decor">): boolean[][] {
  const g = L.g, H = g.length;
  const taken = g.map((row) => row.map((ch) => !".#W".includes(ch)));
  for (const d of L.decor || []) {
    if (COVER.has(d.k)) continue;
    const c = decorCell(d);
    if (taken[c.z] && c.x >= 0 && c.x < taken[c.z].length) taken[c.z][c.x] = true;
  }
  return g.map((row, z) => row.map((ch, x) => {
    if (SOLID.includes(ch)) return false;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const nz = z + dz, nx = x + dx;
      if (nz >= 0 && nz < H && nx >= 0 && nx < g[nz].length && taken[nz][nx]) return false;
    }
    return true;
  }));
}

function longestRun(bare: boolean[][]): Run {
  let best: Run = { cells: 0, x0: 0, z0: 0, x1: 0, z1: 0 };
  const H = bare.length, W = bare[0]?.length || 0;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!bare[z][x]) continue;
    if (!(x > 0 && bare[z][x - 1])) {   // the start of a horizontal run
      let e = x; while (e + 1 < W && bare[z][e + 1]) e++;
      if (e - x + 1 > best.cells) best = { cells: e - x + 1, x0: x, z0: z, x1: e, z1: z };
    }
    if (!(z > 0 && bare[z - 1][x])) {   // the start of a vertical run
      let e = z; while (e + 1 < H && bare[e + 1][x]) e++;
      if (e - z + 1 > best.cells) best = { cells: e - z + 1, x0: x, z0: z, x1: x, z1: e };
    }
  }
  return best;
}

function emptiestRegion(bare: boolean[][]): { region: Region; cells: Array<[number, number]> } {
  const H = bare.length, W = bare[0]?.length || 0;
  const seen = bare.map((r) => r.map(() => false));
  let best: Region = { cells: 0, x0: 0, z0: 0, x1: 0, z1: 0 }, bestCells: Array<[number, number]> = [];
  for (let z0 = 0; z0 < H; z0++) for (let x0 = 0; x0 < W; x0++) {
    if (!bare[z0][x0] || seen[z0][x0]) continue;
    const cells: Array<[number, number]> = [[x0, z0]], stack: Array<[number, number]> = [[x0, z0]];
    seen[z0][x0] = true;
    const r: Region = { cells: 0, x0, z0, x1: x0, z1: z0 };
    while (stack.length) {
      const [x, z] = stack.pop()!;
      r.x0 = Math.min(r.x0, x); r.x1 = Math.max(r.x1, x); r.z0 = Math.min(r.z0, z); r.z1 = Math.max(r.z1, z);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, nz = z + dz;
        if (nz < 0 || nz >= H || nx < 0 || nx >= W || !bare[nz][nx] || seen[nz][nx]) continue;
        seen[nz][nx] = true; stack.push([nx, nz]); cells.push([nx, nz]);
      }
    }
    r.cells = cells.length;
    if (r.cells > best.cells) { best = r; bestCells = cells; }
  }
  return { region: best, cells: bestCells };
}

/** Counts a built level: what is in it, and where it is bare. */
export function measureLevel(L: Pick<BuiltLevel, "g" | "decor">): Density {
  const props: Record<string, number> = {}, pickups: Record<string, number> = {};
  let walkable = 0, enemies = 0, bosses = 0, torches = 0, candles = 0, lights = 0;
  const g = L.g;
  for (let z = 0; z < g.length; z++) for (let x = 0; x < g[z].length; x++) {
    const ch = g[z][x], cls = classifyGlyph(ch);
    if (!SOLID.includes(ch)) walkable++;
    if (cls === "enemy") { enemies++; if (ENEMY_DEFS[ch].boss) bosses++; }
    else if (cls === "prop") bump(props, PROP_KIND[ch]);
    else if (cls === "piano") bump(props, "piano");
    else if (cls === "pickup") bump(pickups, ITEM_KIND[ch].startsWith("w") && ITEM_KIND[ch].length === 2 ? "weapon" : ITEM_KIND[ch]);
    else if (cls === "torch") { torches++; lights++; }
    else if (cls === "candle") candles++;
    else if (cls === "exit" || cls === "plate") lights++;
    else if (cls === "window") {   // only a window with an open cell in front is built (and lit)
      const open = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dz]) => {
        const c = g[z + dz]?.[x + dx];
        return c !== undefined && !"#W".includes(c);
      });
      if (open) lights++;
    }
  }
  const decorByKind: Record<string, number> = {};
  let decor = 0;
  for (const d of L.decor || []) {
    if (d.k === "light") { lights++; continue; }
    decor++; bump(decorByKind, d.k);
  }
  const bare = bareGrid(L), { region, cells } = emptiestRegion(bare);
  const inRegion = new Set(cells.map(([x, z]) => z * 4096 + x));
  const map = g.map((row, z) => row.map((ch, x) => {
    if (SOLID.includes(ch)) return "#";
    if (inRegion.has(z * 4096 + x)) return "R";
    return bare[z][x] ? "." : "+";
  }).join(""));
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  return {
    walkable, props, propsTotal: sum(props), decor, decorByKind, pickups, pickupsTotal: sum(pickups), enemies, bosses,
    torches, candles, lights, bareCells: bare.flat().filter(Boolean).length, longestRun: longestRun(bare), emptiest: region, map,
  };
}

const fmt = (o: Record<string, number>): string => Object.entries(o).sort().map(([k, v]) => `${k} ${v}`).join(", ") || "-";
const span = (r: Region): string => `x ${r.x0}-${r.x1}, z ${r.z0}-${r.z1}`;

/** The markdown `docs/level-density.md` carries: a summary table, then each level's detail and map. */
export function densityMarkdown(rows: Array<{ name: string; d: Density }>): string {
  const out: string[] = [
    "# Level density",
    "",
    "Generated by `npx vite-node scripts/level-density.ts` — do not edit by hand. The baseline for the owner's",
    "\"the levels feel very empty\" (levels-feel-full plan); re-run it after dressing a level and compare.",
    "",
    "A cell is 2 world units wide. **Bare** = a walkable cell with nothing on it or beside it (no glyph within",
    "one cell in any of eight directions, no decor piece; walls do not count). **Run** = the most bare cells",
    "in a straight line. **Emptiest** = the biggest four-way connected bare region. See `src/world/density.ts`.",
    "",
    "| level | walkable | props | decor | pickups | enemies | lights | bare | longest bare run | emptiest region |",
    "|---|---:|---:|---:|---:|---:|---:|---:|---|---|",
  ];
  for (const { name, d } of rows)
    out.push(`| ${name} | ${d.walkable} | ${d.propsTotal} | ${d.decor} | ${d.pickupsTotal} | ${d.enemies} | ${d.lights} | ${d.bareCells} (${Math.round(100 * d.bareCells / d.walkable)}%) | ${d.longestRun.cells} cells (${span(d.longestRun)}) | ${d.emptiest.cells} cells (${span(d.emptiest)}) |`);
  for (const { name, d } of rows) {
    out.push("", `## ${name}`, "",
      `- walkable cells: ${d.walkable}; bare: ${d.bareCells}`,
      `- breakable props: ${fmt(d.props)}`,
      `- decor pieces: ${d.decor}${d.decor ? ` (${fmt(d.decorByKind)})` : ""}`,
      `- pickups: ${fmt(d.pickups)}`,
      `- enemies: ${d.enemies}${d.bosses ? ` (${d.bosses} boss)` : ""}; torches ${d.torches}, candles ${d.candles}, lights ${d.lights}`,
      `- longest bare run: ${d.longestRun.cells} cells, ${span(d.longestRun)}`,
      `- emptiest region: ${d.emptiest.cells} cells, ${span(d.emptiest)}`,
      "", "```", ...d.map, "```");
  }
  out.push("", "Map key: `#` solid, `+` furnished (something on or beside it), `.` bare, `R` the emptiest bare region.", "");
  return out.join("\n");
}
