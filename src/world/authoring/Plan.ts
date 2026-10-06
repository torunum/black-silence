import { ENEMY_DEFS } from "../../enemies/EnemyDefs";
import { classifyGlyph, PROP_KIND } from "../density";
import type { BuiltLevel, Grid } from "../LevelBuilder";
import { Decorator, type ClutterOptions, type PlaceOptions } from "../decor/place";
import type { Theme } from "../decor/kit";
import { analyse, type Structure } from "../structure/analyse";
import { STEP_UP, type Cell } from "../structure/walk";
import { SET_PIECES, type Rect } from "./sets";

/**
 * A LEVEL WRITTEN AS STRUCTURE (deeper-levels plan, Task 2). The hand-written levels are a character grid, 1,500 cells
 * and a dozen `put1` calls; this is the layer above it: rooms with a size and a floor height, corridors straight or
 * bent, stairs and ramps that grade the height map, doors plain, locked or secret, and the things that stand in
 * them, placed by what they are. `build()` returns the same `BuiltLevel` the loader takes, so a level made here is
 * loaded, measured (`src/world/structure/`) and dressed like any other, and the hand-written levels, which never
 * touch this, are unchanged.
 *
 *     const lv = new LevelPlan(40, 30, "dungeon");
 *     const cell = lv.room("cell",  { x: 2,  z: 20, w: 7,  h: 6 });
 *     const hall = lv.room("hall",  { x: 14, z: 8,  w: 15, h: 12 });
 *     const loft = lv.room("loft",  { x: 32, z: 8,  w: 6,  h: 8, floor: 2.4 });
 *     lv.corridor(cell, hall, { bend: "vh", door: "plain" });       // a bent corridor, a door at its mouth
 *     lv.corridor(hall, loft);                                        // graded: the height climbs along it
 *     lv.spawn(cell.at(1, 1)).key(loft.at(2, 2)).exit(hall.at(13, 10));
 *     lv.enemy("z", hall.at(4, 3), hall.at(9, 6)).pickup("h", cell.at(5, 4));
 *     lv.set("braziers", hall).checkpoint(hall.at(0, 5), { side: "w" });   // a set-piece, a shrine
 *     const level = lv.build();                                       // a BuiltLevel
 *     lv.check();                                                      // ...or build it and run the structure suite: numbers, or an error naming what is wrong
 *
 * **Guard rails**, because a level made of structure should not be able to break what the loader and the tests know:
 *  - rooms may not overlap (two floors in one place is an error); nothing is carved on the grid's outer border;
 *  - a corridor between rooms of different floors is graded: its new cells step up evenly, each step under the
 *    player's step (`STEP_UP`); `stairs` and `ramp` do the same on any run you name, and refuse a step that is too steep;
 *  - a door stands in a wall line (a wall either side across, open ground either side along) — checked at `build()` — and one cut
 *    into a wall takes the higher of the two floors it joins, so it can be stepped onto from either side (and may not join two
 *    floors more than a step apart);
 *  - a glyph goes on open floor, once, and is checked against the roster it is for: an `enemy` must be in
 *    `ENEMY_DEFS`, a `pickup` must not be (`A` is the Mancubus, armour is `r`: KNOWN-11), a `prop` must not be (`C`,
 *    `V`: KNOWN-4; a pew is `v`);
 *  - decor goes through the kit's `Decorator`, whose placement rules throw rather than hide a pickup or wall a corridor.
 *
 * The raw grid is still there: `carve` and `put` are the escape hatch, for a shape a rectangle and an L do not make.
 * No `Math.random`: nothing here is random, and `clutter` takes a seed.
 */

export type Pt = Cell | readonly [number, number];
export type DoorKind = "plain" | "locked" | "secret";
const DOOR: Record<DoorKind, string> = { plain: "+", locked: "D", secret: "S" };
const pt = (p: Pt): Cell => (Array.isArray(p) ? { x: p[0], z: p[1] } : (p as Cell));

export interface RoomOpts {
  x: number; z: number; w: number; h: number;
  /** The floor's height, world units (default 0). */
  floor?: number;
  /** The ceiling's height over the room (default: the level's, 3.4); a tall room is a ceiling map (`BuiltLevel.cmap`). */
  ceil?: number;
}
export interface Room extends Rect {
  name: string; w: number; h: number; floor: number; cx: number; cz: number;
  /** The cell `dx` across and `dz` down from the room's north-west corner. */
  at(dx: number, dz: number): Cell;
  contains(x: number, z: number): boolean;
}
export interface CorridorOpts {
  /** `hv`: along x first, then z (default); `vh`: the other way. Each leg through `via` bends the same way. */
  bend?: "hv" | "vh";
  /** Points the corridor must pass through, in order, between its ends. */
  via?: readonly Pt[];
  /** Cells wide (default 1). */
  width?: number;
  /** A door in the first new cell, where the corridor leaves the first room. One-wide corridors only. */
  door?: DoorKind;
  /** Grade the new cells between the ends' floors (default: when the floors differ). */
  grade?: boolean;
}

interface Queued { run: (d: Decorator) => void; last?: boolean }

export class LevelPlan {
  readonly W: number;
  readonly H: number;
  private g: Grid;
  private hm: number[][];
  private rooms: Room[] = [];
  private ceils: Array<{ r: Rect; h: number }> = [];
  private doors: Array<{ x: number; z: number; kind: DoorKind }> = [];
  private dressing: Queued[] = [];
  private spawned = false;
  private head: number | undefined;

  constructor(W: number, H: number, readonly theme?: Theme) {
    this.W = W; this.H = H;
    this.g = Array.from({ length: H }, () => Array(W).fill("#"));
    this.hm = Array.from({ length: H }, () => Array(W).fill(0));
  }

  private inside(x: number, z: number): boolean { return x >= 1 && z >= 1 && x <= this.W - 2 && z <= this.H - 2; }
  private at(x: number, z: number): string | undefined { return this.g[z]?.[x]; }

  /** A rectangle of floor with its own height. Rooms may not overlap; the outer border stays wall. */
  room(name: string, o: RoomOpts): Room {
    const x1 = o.x + o.w - 1, z1 = o.z + o.h - 1, floor = o.floor ?? 0;
    if (o.w < 2 || o.h < 2) throw new Error(`room ${name}: ${o.w}x${o.h} is not a room`);
    if (!this.inside(o.x, o.z) || !this.inside(x1, z1)) throw new Error(`room ${name}: (${o.x},${o.z})-(${x1},${z1}) is off the grid or on its border`);
    for (const r of this.rooms) if (o.x <= r.x1 && x1 >= r.x0 && o.z <= r.z1 && z1 >= r.z0) throw new Error(`room ${name} overlaps room ${r.name}`);
    const room: Room = {
      name, x0: o.x, z0: o.z, x1, z1, w: o.w, h: o.h, floor, cx: o.x + Math.floor((o.w - 1) / 2), cz: o.z + Math.floor((o.h - 1) / 2),
      at: (dx, dz) => ({ x: o.x + dx, z: o.z + dz }),
      contains: (x, z) => x >= o.x && x <= x1 && z >= o.z && z <= z1,
    };
    this.rooms.push(room);
    this.carve(o.x, o.z, x1, z1, floor);
    if (o.ceil !== undefined) this.ceils.push({ r: room, h: o.ceil });
    return room;
  }

  /** Raw floor over a rectangle at a height: the escape hatch for a shape rooms and corridors do not make. */
  carve(x0: number, z0: number, x1: number, z1: number, floor = 0): this {
    for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      if (!this.g[z] || this.g[z][x] === undefined) throw new Error(`carve: (${x},${z}) is off the grid`);
      this.g[z][x] = "."; this.hm[z][x] = floor;
    }
    return this;
  }

  /** A corridor from one room or point to another, straight or bent, graded if the floors differ. Returns the cells it opened, in order from the first end. */
  corridor(a: Room | Pt, b: Room | Pt, o: CorridorOpts = {}): Cell[] {
    const end = (e: Room | Pt): Cell => ("cx" in e ? { x: e.cx, z: e.cz } : pt(e));
    const floorOf = (e: Room | Pt): number => ("cx" in e ? e.floor : this.hm[pt(e).z]?.[pt(e).x] || 0);
    const stops = [end(a), ...(o.via || []).map(pt), end(b)], width = o.width ?? 1, bend = o.bend ?? "hv";
    if (o.door && width !== 1) throw new Error("a door needs a one-wide corridor");
    const fresh: Cell[] = [], seen = new Set<number>();
    const open = (x: number, z: number): void => {
      if (!this.inside(x, z)) throw new Error(`corridor: (${x},${z}) is off the grid or on its border`);
      if (this.g[z][x] === "#" && !seen.has(z * this.W + x)) { seen.add(z * this.W + x); fresh.push({ x, z }); }
    };
    const lo = -Math.floor((width - 1) / 2), hi = Math.floor(width / 2);
    // one leg, a step at a time along it, the whole width across at each step: so `fresh` is in walking order
    const leg = (p: Cell, q: Cell, alongX: boolean): void => {
      const n = alongX ? Math.abs(q.x - p.x) : Math.abs(q.z - p.z), s = Math.sign(alongX ? q.x - p.x : q.z - p.z);
      for (let k = 0; k <= n; k++) for (let w = lo; w <= hi; w++) open(alongX ? p.x + s * k : p.x + w, alongX ? p.z + w : p.z + s * k);
    };
    for (let i = 0; i + 1 < stops.length; i++) {
      const p = stops[i], q = stops[i + 1], corner = bend === "hv" ? { x: q.x, z: p.z } : { x: p.x, z: q.z };
      leg(p, corner, bend === "hv"); leg(corner, q, bend !== "hv");
    }
    const h0 = floorOf(a), h1 = floorOf(b), grade = o.grade ?? h0 !== h1;
    if (grade && fresh.length && Math.abs(h1 - h0) / (fresh.length + 1) > STEP_UP) throw new Error(`corridor: ${fresh.length} cells cannot climb ${Math.abs(h1 - h0)} (more than ${STEP_UP} a step)`);
    fresh.forEach((c, i) => {
      this.g[c.z][c.x] = ".";
      this.hm[c.z][c.x] = grade ? Math.round((h0 + (h1 - h0) * (i + 1) / (fresh.length + 1)) * 100) / 100 : h0;
    });
    if (o.door && fresh.length) this.door(fresh[0].x, fresh[0].z, o.door);
    return fresh;
  }

  /** Steps over a run of cells (a rectangle, run along its longer side from its first corner to its last), the height climbing evenly between the floor before the run and the floor after it, or `from` and `to`. */
  stairs(x0: number, z0: number, x1: number, z1: number, o: { from?: number; to?: number } = {}): this { return this.grade(x0, z0, x1, z1, o, .6); }
  /** The same with a gentler limit on a step (0.3): a ramp. */
  ramp(x0: number, z0: number, x1: number, z1: number, o: { from?: number; to?: number } = {}): this { return this.grade(x0, z0, x1, z1, o, .3); }

  private grade(x0: number, z0: number, x1: number, z1: number, o: { from?: number; to?: number }, maxStep: number): this {
    const alongX = Math.abs(x1 - x0) >= Math.abs(z1 - z0), dir = Math.sign(alongX ? x1 - x0 : z1 - z0) || 1;
    const n = Math.abs(alongX ? x1 - x0 : z1 - z0) + 1;
    const cx = (k: number): number => (alongX ? x0 + dir * k : x0), cz = (k: number): number => (alongX ? z0 : z0 + dir * k);
    const h = (x: number, z: number, what: string): number => { if (this.at(x, z) === undefined || this.at(x, z) === "#") throw new Error(`stairs: no floor ${what} the run at (${x},${z}); name from/to`); return this.hm[z][x]; };
    const from = o.from ?? h(cx(-1), cz(-1), "before"), to = o.to ?? h(cx(n), cz(n), "after");
    const step = Math.abs(to - from) / (n + 1);
    if (step > maxStep) throw new Error(`stairs: ${n} cells climb ${Math.abs(to - from)}, ${step.toFixed(2)} a step, over ${maxStep}: use more cells`);
    for (let k = 0; k < n; k++) {
      const hh = Math.round((from + (to - from) * (k + 1) / (n + 1)) * 100) / 100;
      // the whole width of the rectangle steps together
      for (let w = 0; w <= (alongX ? Math.abs(z1 - z0) : Math.abs(x1 - x0)); w++) {
        const x = alongX ? cx(k) : Math.min(x0, x1) + w, z = alongX ? Math.min(z0, z1) + w : cz(k);
        if (this.at(x, z) === undefined || this.at(x, z) === "#") throw new Error(`stairs: (${x},${z}) is not floor`);
        this.hm[z][x] = hh;
      }
    }
    return this;
  }

  /**
   * A ceiling `h` above every open cell whose floor is raised (a ceiling map; a room's own `ceil` wins): stairs, graded corridors and
   * rooms on a higher floor all keep the same headroom without each being told. Cells at floor 0 keep the level's 3.4.
   */
  headroom(h: number): this { this.head = h; return this; }

  /** A door in a wall line. Checked at `build()`. */
  door(x: number, z: number, kind: DoorKind): this { this.doors.push({ x, z, kind }); return this; }
  /** Pillars around a room's interior, a ring `step` apart (default 3), inset by one. */
  pillars(r: Room, step = 3): this {
    for (let x = r.x0 + 1; x <= r.x1 - 1; x += step) { this.put("I", x, r.z0 + 1); this.put("I", x, r.z1 - 1); }
    for (let z = r.z0 + 1 + step; z <= r.z1 - 1 - step; z += step) { this.put("I", r.x0 + 1, z); this.put("I", r.x1 - 1, z); }
    return this;
  }
  /** A window in a wall, seen through from a room (`W`). */
  window(x: number, z: number): this { if (this.at(x, z) !== "#") throw new Error(`window at (${x},${z}) is not in a wall`); this.g[z][x] = "W"; return this; }

  /** Puts a glyph on open floor, once. The typed helpers below are what to use. */
  put(g: string, x: number, z: number): this {
    const c = this.at(x, z);
    if (c !== ".") throw new Error(`'${g}' at (${x},${z}): ${c === undefined ? "off the grid" : c === "#" ? "that is wall" : `'${c}' is already there`}`);
    this.g[z][x] = g; return this;
  }
  spawn(p: Pt): this { if (this.spawned) throw new Error("one spawn only"); this.spawned = true; return this.put("P", pt(p).x, pt(p).z); }
  exit(p: Pt): this { return this.put("X", pt(p).x, pt(p).z); }
  key(p: Pt): this { return this.put("K", pt(p).x, pt(p).z); }
  /** A challenge plate (`Y`): a wave comes when it is stepped on. */
  plate(p: Pt): this { return this.put("Y", pt(p).x, pt(p).z); }
  enemy(g: string, ...ps: Pt[]): this {
    if (!ENEMY_DEFS[g]) throw new Error(`enemy '${g}' is not in ENEMY_DEFS`);
    for (const p of ps) this.put(g, pt(p).x, pt(p).z);
    return this;
  }
  pickup(g: string, ...ps: Pt[]): this {
    if (ENEMY_DEFS[g]) throw new Error(`pickup '${g}' is an enemy glyph (armour is 'r', not 'A': KNOWN-11)`);
    if (classifyGlyph(g) !== "pickup" || g === "K") throw new Error(`'${g}' is not a pickup glyph (use key() for the key)`);
    for (const p of ps) this.put(g, pt(p).x, pt(p).z);
    return this;
  }
  prop(g: string, ...ps: Pt[]): this {
    if (!(g in PROP_KIND) || ENEMY_DEFS[g]) throw new Error(`prop '${g}' is not a prop glyph, or is also an enemy (C is a Cacodemon, V a Foreman; a pew is 'v': KNOWN-4)`);
    for (const p of ps) this.put(g, pt(p).x, pt(p).z);
    return this;
  }
  /** A torch (`i`), candles (`l`) or the piano (`p`). */
  light(g: "i" | "l" | "p", ...ps: Pt[]): this { for (const p of ps) this.put(g, pt(p).x, pt(p).z); return this; }

  // ---- dressing: queued, and placed through the kit's Decorator at build(), once every glyph is on the grid
  private need(): Theme { if (!this.theme) throw new Error("dressing needs a theme: new LevelPlan(w, h, theme)"); return this.theme; }
  /** A decor piece exactly where told (the kit throws if a rule forbids it). */
  piece(kind: string, p: Pt, o: PlaceOptions = {}): this { this.need(); this.dressing.push({ run: (d) => { d.place(kind, pt(p).x, pt(p).z, o); } }); return this; }
  /** A named set-piece over a room (`sets.ts`): chancel, torture, store, braziers, ossuary. */
  set(name: string, r: Room): this {
    const theme = this.need(), make = SET_PIECES[name];
    if (!make) throw new Error(`no set-piece called ${name} (${Object.keys(SET_PIECES).join(", ")})`);
    this.dressing.push({ run: (d) => { if (!make(d, r, theme)) throw new Error(`set-piece ${name} fits nowhere in room ${r.name}`); } });
    return this;
  }
  /** The kit's wall-side clutter, over the rooms or all of it. */
  clutter(o: ClutterOptions = {}): this { this.need(); this.dressing.push({ run: (d) => { d.clutter(o); } }); return this; }
  /** Anything else the `Decorator` can do. */
  dress(f: (d: Decorator) => void): this { this.need(); this.dressing.push({ run: f }); return this; }
  /** The theme's checkpoint marker, against the wall at a cell (`side` n, e, s or w, if it has several), placed last. */
  checkpoint(p: Pt, o: PlaceOptions = {}): this {
    const theme = this.need();
    this.dressing.push({ last: true, run: (d) => { d.place(MARKER[theme], pt(p).x, pt(p).z, o); } });
    return this;
  }

  /**
   * Builds the level and runs it through the structure suite (`src/world/structure/analyse.ts`): the numbers it measures, or an error
   * naming every hard failure (an unreachable enemy, a key behind its own door, an exit door with no wall). What a level is checked for
   * is the list in `analyse.ts`; `LEGACY_PROBLEMS` is for the old levels only, a plan has none.
   */
  check(): Structure {
    const s = analyse(this.build());
    if (s.problems.length) throw new Error("the level fails the structure suite:\n  " + s.problems.map((p) => p.code + ": " + p.message).join("\n  "));
    return s;
  }

  /** The grid, the height map (if any floor is not 0), the ceiling map (if a room has one) and the dressing. A fresh copy each call. */
  build(): BuiltLevel {
    const g = this.g.map((r) => [...r]), hm = this.hm.map((r) => [...r]);
    for (const { x, z, kind } of this.doors) {
      const wall = (dx: number, dz: number): boolean => g[z + dz]?.[x + dx] === "#", floor = (dx: number, dz: number): boolean => { const c = g[z + dz]?.[x + dx]; return c !== undefined && !"#WI".includes(c); };
      const here = g[z]?.[x];
      if (here === undefined || "#WI".includes(here) && here !== "#") throw new Error(`door at (${x},${z}) is off the grid or in a pillar`);
      if (!((wall(0, -1) && wall(0, 1) && floor(-1, 0) && floor(1, 0)) || (wall(-1, 0) && wall(1, 0) && floor(0, -1) && floor(0, 1)))) throw new Error(`door at (${x},${z}) is not in a wall line (a wall each side across, open ground each side along)`);
      // a door cut into a wall stands at the higher of the floors it joins: the player steps up onto it from the lower side, and it is a floor cell like any other
      if (here === "#") {
        const [a, b] = wall(0, -1) ? [hm[z][x - 1], hm[z][x + 1]] : [hm[z - 1][x], hm[z + 1][x]];
        if (Math.abs(a - b) > STEP_UP) throw new Error(`door at (${x},${z}) joins floors ${a} and ${b}: more than a step (${STEP_UP}) apart`);
        hm[z][x] = Math.max(a, b);
      }
      g[z][x] = DOOR[kind];
    }
    const out: BuiltLevel = { g, W: this.W, H: this.H };
    if (hm.some((r) => r.some((h) => h))) { out.hmap = hm; out.lift = true; }
    if (this.ceils.length || this.head !== undefined) {
      const cm = Array.from({ length: this.H }, () => Array(this.W).fill(0));
      if (this.head !== undefined) for (let z = 0; z < this.H; z++) for (let x = 0; x < this.W; x++) if (hm[z][x] > 0 && !"#WI+DS".includes(g[z][x])) cm[z][x] = Math.round((hm[z][x] + this.head) * 100) / 100;
      for (const { r, h } of this.ceils) for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) if (!"#WI+DS".includes(g[z][x])) cm[z][x] = h;   // a solid cell keeps the default: Ceiling.ts
      out.cmap = cm;
    }
    if (this.theme) {
      const d = new Decorator({ g, W: this.W, H: this.H }, this.theme);
      for (const q of this.dressing.filter((x) => !x.last)) q.run(d);
      for (const q of this.dressing.filter((x) => x.last)) q.run(d);
      out.decor = d.specs;
    }
    return out;
  }
}

/** The checkpoint marker of each theme (`decor/checkpoint.ts`). */
export const MARKER: Readonly<Record<Theme, string>> = {
  dungeon: "candlestub", church: "shrine", necropolis: "ossuarylamp", graveyard: "hooklantern", sewers: "shutlamp", factory: "pilotlight", womb: "quickening",
};
