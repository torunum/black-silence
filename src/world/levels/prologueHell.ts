import type { DecorSpec } from "../LevelBuilder";

/**
 * THE PROLOGUE'S HELL AND ITS WAY OUT (`./prologue.ts` builds the rest and says what the level is). Split off when the prologue was
 * made a level in its own right (owner, 2026-10-22: "prologue haritasını da geliştirir misin, düzgün büyük kaliteli bir bölüm olsun"):
 *
 *   A. THE BURNING PIT (x 1-27, z 19-34) — the old hell, as it was: a lake of lava between two banks, one bridge, steps out of the pit.
 *   B. THE FIELD OF PYRES (x 32-47, z 16-40) — through a cleft in the east bank's wall: a cavern of pyres and stakes, a river of fire
 *      across it with one bridge, its two ends stepped so a fall is a detour; a ledge of rock in its north-east corner with armour on it.
 *   C. THE THRONE OF BONES (x 20-50, z 45-60) — down a passage from the field: the great hall, a moat of fire round an island where the
 *      dead have built a throne of their own bones; a bridge onto it from the north and one off it to the east, falls of lava down the
 *      far wall.
 *   D. THE CLIMB (x 48-61, z 8-53) — out of the hall's east side, a long stair north through the rock, past the anchorite's cell,
 *      to the landing and the ladder up into the monastery (`X`).
 */

export interface Carve {
  g: string[][]; hm: number[][]; cm: number[][]; zm: number[][];
  open: (x0: number, z0: number, x1: number, z1: number, floor: number, ceil: number) => void;
  rect: (x0: number, z0: number, x1: number, z1: number, f: (x: number, z: number) => void) => void;
  zone: (x0: number, z0: number, x1: number, z1: number, i: number) => void;
  d: (k: string, x: number, z: number, o?: Partial<DecorSpec>) => void;
  stone: (k: string, x: number, z: number, o?: Partial<DecorSpec>) => void;
}

export const STEP = .42, YARD = 4.2, BANK = 2.1;
const W = Math.PI / 2, S = Math.PI;

/** A. The burning pit: the prologue's hell as it was before the level grew (its enemies, braziers and pickups are the trace fixture's). */
export function burningPit(c: Carve): void {
  const { g, hm, open, rect, d } = c;
  open(1, 19, 10, 34, BANK, BANK + 5.2);         // west bank
  open(18, 19, 27, 34, BANK, BANK + 5.2);        // east bank
  open(11, 19, 17, 34, 0, 9.0);                  // the burning pit
  open(11, 26, 17, 26, BANK, 9.0);               // the bridge
  for (let x = 11; x <= 17; x++) d("bridge", x, 26);
  open(9, 18, 10, 18, BANK, BANK + 3.4);         // the crypt stair's mouth
  // steps out of the pit along both walls, in both halves the bridge cuts it into
  for (let i = 0; i < 4; i++) for (const x of [11, 17]) { hm[31 + i][x] = (i + 1) * STEP; hm[22 - i][x] = (i + 1) * STEP; }
  rect(11, 19, 17, 34, (x, z) => { if (hm[z][x] === 0) d("ember", x, z); });
  // the lake's own light, four glows low over the lava: the cavern's walls are lit from below by the fire, not by ambient
  for (const z of [21, 24, 29, 32]) d("light", 14, z, { s: 2.2, h: 15, r: 2.4 });
  // braziers: a torch in an iron bowl
  for (const [x, z] of [[10, 25], [18, 27], [3, 20], [26, 33], [4, 32]] as const) { g[z][x] = "i"; d("bowl", x, z); }
  // the damned: zombies on the banks, crawlers in the fire
  g[19][5] = "z"; g[25][19] = "z"; g[29][22] = "z"; g[32][24] = "z";
  g[23][13] = "w"; g[32][15] = "w"; g[20][26] = "w"; g[22][27] = "w";
  g[30][13] = "O"; g[21][16] = "O";                // barrels, on the pit floor
  g[22][4] = "a"; g[28][2] = "h"; g[31][20] = "a"; g[24][26] = "h";
  for (const [x, z, r] of [[6, 20, .4], [2, 26, 1.9], [8, 31, 3], [13, 28, .7], [16, 24, 2.2], [12, 33, 4.1],
    [20, 20, 1.3], [25, 27, 5], [21, 34, .2], [15, 19, 2.8]] as const) d("bones", x, z, { r });
  for (const [x, z, h] of [[12, 22, 3.2], [16, 29, 4.2], [14, 20, 2.6], [15, 33, 3.6], [5, 28, 2.2], [23, 25, 2.0]] as const)
    d("chain", x, z, { h });
  pitDressing(d);
}

/**
 * The pit's dressing (`src/world/decor/hell.ts`): outcrops against the walls, fangs and columns on the banks' far sides, stakes and
 * pyres between, spikes along the pit's lip, ribs, falls of lava down the pit's two ends, and stalactites in the roof. The masses stay
 * out of x 8-10 and z 18-27 on the west bank (the way from the bridge to the crypt stair, which the zombie at the foot and the crawlers
 * out of the pit take), out of the cleft into the field of pyres (x 26-28, z 20-24) on the east, and out of every cell beside a pickup.
 * Freestanding masses are few and sit in the banks' corners: `tests/enemies/stuckCheck.test.ts` (which runs this level) found the first
 * layout's crawlers pinned against fangs, columns and a pyre standing in the open, so those were moved or made walk-over (`shards`).
 */
function pitDressing(d: Carve["d"]): void {
  // outcrops, backs to the walls: west wall (x 1), south wall (z 34)
  for (const [x, z, r] of [[1, 23, W], [1, 31, W], [6, 34, S], [1, 19, W]] as const) d("outcrop", x, z, { r });
  for (const [x, z] of [[4, 25], [25, 28]] as const) d("stalagmite", x, z);
  for (const [x, z, r] of [[2, 33, 1.1], [26, 31, .7]] as const) d("basaltcol", x, z, { r });
  d("pyre", 7, 33);
  for (const [x, z] of [[3, 22], [8, 29], [5, 27], [9, 33], [2, 26], [21, 21], [20, 24], [22, 27], [25, 22], [20, 28], [24, 34], [19, 32], [27, 25], [26, 29], [27, 33]] as const) d("shards", x, z, { r: x * 2 + z });
  for (const [x, z] of [[7, 23], [5, 30], [9, 31], [22, 22], [25, 25], [19, 29]] as const) d("skullpole", x, z, { r: (x * 3 + z) % 7 });
  d("ribs", 3, 27, { r: .6 }); d("ribs", 24, 30, { r: 2.4 });
  for (const [x, z] of [[10, 29], [10, 32], [18, 24], [18, 30], [10, 21]] as const) d("spikes", x, z, { r: x + z });
  d("lavafall", 14, 34.45, { r: S, s: 3.4, h: 9 });
  d("lavafall", 13, 18.55, { r: 0, s: 1.8, h: 8.6 });
  for (const [x, z, h] of [[3, 22, 2.2], [7, 27, 1.6], [2, 30, 2.4], [8, 32, 1.8], [5, 24, 1.4], [20, 22, 2], [24, 26, 2.2], [21, 30, 1.8],
    [26, 31, 2.4], [19, 33, 1.6], [23, 21, 2.4], [12, 21, 3], [16, 23, 2.6], [13, 28, 3.2], [15, 31, 2.8], [12, 33, 2.4], [16, 20, 2.2],
    [14, 24, 2.8], [12, 30, 3]] as const) d("stalactite", x, z, { h });
}

/** Lava cells stepped up out of a channel: `cells` from the lava's edge outward, each a step higher, the last a step under the bank. */
function stepsUp(c: Carve, cells: ReadonlyArray<readonly [number, number]>): void {
  cells.forEach(([x, z], i) => { c.hm[z][x] = (i + 1) * STEP; });
}

/** B. The field of pyres, through the cleft in the east bank's wall. */
export function fieldOfPyres(c: Carve): void {
  const { g, hm, open, rect, d } = c;
  open(28, 21, 31, 23, BANK, BANK + 3.6);        // the cleft out of the pit's east bank
  open(32, 16, 47, 40, BANK, BANK + 6.4);        // the field
  open(32, 28, 47, 29, 0, BANK + 6.4);           // the river of fire across it
  open(40, 28, 40, 29, BANK, BANK + 6.4);        // its one bridge
  for (const z of [28, 29]) d("bridge", 40, z, { r: W });
  // the river's two ends, stepped up to the banks: a fall is a walk to either end
  for (const z of [28, 29]) { stepsUp(c, [[35, z], [34, z], [33, z], [32, z]]); stepsUp(c, [[44, z], [45, z], [46, z], [47, z]]); }
  rect(32, 28, 47, 29, (x, z) => { if (hm[z][x] === 0 && (x + z) % 2 === 0) d("ember", x, z); });
  // the ledge in the north-east corner, a step up: armour on it
  open(44, 16, 47, 19, BANK + STEP, BANK + 6.4);
  g[17][46] = "r";
  // the damned of the field: zombies among the pyres, crawlers in the river
  g[21][37] = "z"; g[24][45] = "z"; g[34][35] = "z"; g[37][43] = "z";
  g[28][38] = "w"; g[29][43] = "w"; g[33][41] = "w";
  g[17][33] = "h"; g[39][47] = "h"; g[19][41] = "a"; g[39][35] = "a";
  // braziers without a torch: their fire only (the light budget is spent on the pit's)
  for (const [x, z] of [[33, 26], [47, 31], [39, 16], [41, 40]] as const) d("bowl", x, z);
  // pyres and columns in the field's corners, off the ways across it; stakes, ribs and spikes between
  d("pyre", 36, 17); d("pyre", 47, 36);
  for (const [x, z, r] of [[32, 40, .3], [47, 22, 1.4]] as const) d("basaltcol", x, z, { r });
  for (const [x, z] of [[35, 23], [43, 21], [37, 33], [46, 34], [33, 36], [44, 39]] as const) d("skullpole", x, z, { r: (x + z * 3) % 7 });
  d("ribs", 37, 37, { r: 1.2 }); d("ribs", 45, 25, { r: 3.4 });
  for (const [x, z] of [[36, 27], [42, 27], [38, 30], [44, 30], [34, 30], [46, 27]] as const) d("spikes", x, z, { r: x * z });
  for (const [x, z] of [[33, 21], [39, 24], [46, 20], [35, 38], [42, 35], [40, 22], [36, 31]] as const) d("shards", x, z, { r: x + 2 * z });
  for (const [x, z, r] of [[34, 25, .6], [44, 33, 2], [38, 38, 4], [42, 17, 1]] as const) d("bones", x, z, { r });
  for (const [x, z, h] of [[37, 20, 2.6], [43, 27, 3.4], [39, 34, 2.8], [46, 38, 2.2]] as const) d("chain", x, z, { h });
  d("lavafall", 31.55, 28.5, { r: W, s: 3.6, h: 8.4 });   // down the field's west wall into the river
  for (const [x, z, h] of [[34, 20, 2.4], [40, 19, 2.8], [46, 23, 2.2], [36, 35, 2.6], [44, 37, 2.4], [38, 28, 3.2], [43, 29, 3]] as const) d("stalactite", x, z, { h });
}

/** C. The throne of bones: the great hall, its moat of fire and the island in it. */
export function throneOfBones(c: Carve): void {
  const { g, hm, open, rect, d } = c;
  open(38, 41, 41, 44, BANK, BANK + 3.8);        // the passage down from the field
  open(20, 45, 50, 60, BANK, BANK + 8.8);        // the hall
  open(25, 47, 45, 60, 0, BANK + 8.8);           // the moat of fire, out to the hall's south wall
  open(29, 50, 41, 55, BANK, BANK + 8.8);        // the island in it
  open(34, 47, 35, 49, BANK, BANK + 8.8);        // the bridge onto it from the north
  open(42, 52, 45, 53, BANK, BANK + 8.8);        // and off it to the east
  for (let z = 47; z <= 49; z++) for (const x of [34, 35]) d("bridge", x, z);
  for (let x = 42; x <= 45; x++) for (const z of [52, 53]) d("bridge", x, z, { r: W });
  // the moat's two stairs out, one in each half the bridges cut it into
  stepsUp(c, [[28, 60], [27, 60], [26, 60], [25, 60]]);
  stepsUp(c, [[42, 47], [43, 47], [44, 47], [45, 47]]);
  rect(25, 47, 45, 60, (x, z) => { if (hm[z][x] === 0 && (x * 3 + z) % 3 === 0) d("ember", x, z); });
  // the throne: a dais of bones at the island's south side, stakes round it, a pyre before it; armour and health at its feet
  d("skullpile", 34, 55); d("skullpile", 35, 55); d("skullpile", 36, 55); d("ribs", 35, 54, { r: S });
  for (const [x, z] of [[30, 51], [40, 51], [30, 55], [40, 55]] as const) d("skullpole", x, z, { r: x });
  for (const [x, z, r] of [[29, 50, .2], [41, 50, 1.8]] as const) d("basaltcol", x, z, { r });
  d("pyre", 35, 52);
  g[54][33] = "r"; g[54][37] = "h";
  // the dead holding the hall: zombies on its floor and the island, crawlers in the fire
  g[47][23] = "z"; g[50][48] = "z"; g[51][31] = "z"; g[53][39] = "z";
  g[52][27] = "w"; g[57][43] = "w";
  g[46][21] = "a"; g[59][21] = "h"; g[46][49] = "h"; g[59][47] = "a";
  // the hall: columns along its walls, braziers, ribs and bones; falls of lava down the far wall into the moat's south side
  for (const [x, z, r] of [[20, 52, .4], [50, 56, 2.2], [20, 55, 1]] as const) d("basaltcol", x, z, { r });
  for (const [x, z, r] of [[20, 48, W], [50, 49, -W]] as const) d("outcrop", x, z, { r });
  for (const [x, z] of [[24, 45], [46, 45], [22, 55], [49, 55]] as const) d("bowl", x, z);
  d("ribs", 23, 57, { r: .9 }); d("ribs", 47, 49, { r: 2.9 });
  for (const [x, z] of [[24, 50], [46, 53], [30, 46], [40, 46], [23, 58], [47, 58]] as const) d("spikes", x, z, { r: x + z });
  for (const [x, z] of [[22, 46], [48, 52], [21, 56], [49, 60], [21, 51], [49, 57]] as const) d("shards", x, z, { r: x * 2 });
  for (const [x, z, r] of [[23, 52, 2], [47, 55, .4], [32, 53, 3.1], [38, 52, 1.6]] as const) d("bones", x, z, { r });
  d("lavafall", 30, 60.45, { r: S, s: 3.2, h: 10.5 });
  d("lavafall", 40, 60.45, { r: S, s: 3.2, h: 10.5 });
  for (const [x, z, h] of [[27, 49, 3.4], [43, 49, 3.6], [27, 56, 3], [43, 56, 3.4], [35, 51, 4.2], [32, 57, 3.2], [38, 48, 3.6], [23, 48, 2.6], [47, 58, 2.8], [35, 59, 3.4]] as const)
    d("stalactite", x, z, { h });
}

/** D. The climb: out of the hall's east side and north through the rock to the landing and the ladder. Zone `climb`, but for the passage. */
export function climbOut(c: Carve, CLIMB: number): void {
  const { g, open, zone, d } = c;
  open(51, 51, 54, 53, BANK, BANK + 3.6);        // the passage out of the hall
  zone(55, 8, 63, 60, CLIMB); zone(46, 6, 63, 15, CLIMB);
  // the stair: three wide, five steps up through the rock with long flights between, then level to the landing
  const rise = [[53, 0], [48, 1], [44, 2], [40, 3], [36, 4], [32, 5]] as const;
  for (let z = 15; z <= 53; z++) {
    let k = 5;
    for (const [z0, n] of rise) if (z <= z0) k = n;
    const f = Math.min(YARD, BANK + k * STEP);
    open(55, z, 57, z, f, f + 3.4);
  }
  // the anchorite's cell, off the stair's east side halfway up: a cot of straw, his bones, what he left
  open(58, 24, 61, 28, YARD, YARD + 2.8);
  d("straw", 60, 27); d("bones", 61, 25, { r: 1.4 }); d("skullpile", 59, 24);
  g[25][60] = "h"; g[27][59] = "a";
  d("candlestub", 58, 24, { r: 0 });   // the checkpoint: the candle he kept, against his cell's north wall
  // the landing, the ladder up and out (the exit's door stands in its north wall: `src/world/ExitDoor.ts`, `HatchKit.ts`)
  open(48, 8, 58, 14, YARD, YARD + 3.4);
  g[9][53] = "X";
  g[8][48] = "i"; g[8][58] = "i"; g[14][48] = "l"; g[14][58] = "l";
  for (const [z, x] of [[50, 55], [46, 57], [42, 55], [38, 57], [34, 55], [30, 57], [22, 55], [18, 57]] as const) g[z][x] = "l";
  d("bones", 56, 45, { r: 1.7, s: .8 }); d("bones", 57, 20, { r: 2.6 }); d("bones", 49, 12, { r: .5 });
  c.stone("tomb", 50, 11, { r: W });
  for (const [x, z, h] of [[56, 41, 1.3], [56, 29, 1.5], [52, 10, 1.3], [56, 19, 1.1]] as const) d("chain", x, z, { h });
  for (const [x, z] of [[55, 47], [57, 36], [55, 26], [57, 17]] as const) d("skullpile", x, z);
}
