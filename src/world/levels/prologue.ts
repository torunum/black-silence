import type { BuiltLevel, DecorSpec, ZoneTheme } from "../LevelBuilder";

/**
 * PROLOGUE — OUT OF THE PIT: out of the grave, down through hell, and up.
 *
 * **A deliberate divergence from `reference/sonsurum.html`** (lines 275-313,
 * which stay frozen): the reference wakes ADEM deep in a hell cavern and has
 * him climb a staircase to a tomb and out "of the grave". The owner, playing
 * it, said the prologue was always the other way round — "the main character
 * climbs out of a grave and passes through hell" — and ADEM's own opening
 * lines already told it in that order. So the map was rebuilt (player
 * feedback round 2, `docs/superpowers/plans/2026-09-27-player-feedback-2-prologue.md`
 * Task 1), and `tests/fidelity.test.ts` records the prologue as the one level
 * whose grid no longer follows the reference.
 *
 * ```
 *            x 0         1         2
 *              012345678901234567890123456789
 *    z  0      ##############################
 *       1      #....................#########   CHURCHYARD: open sky, floor 4.2
 *       2      #.I.I.I..I...I.I.I.I.#########   I  headstone, cross, tomb or tree
 *       3      #...l...lGM...l...i..#########   G  the grave (3.36)  M  its spoil (4.62)
 *       4      #......i.P...........#########   P  ADEM beside his grave, facing south
 *       5      #.I.I.I......II.I.I..#########
 *       6      #...............l....#########
 *       7      #.......i..i.........#########
 *       8      #.I.I..##..##..I...I.##i...i##   the mausoleum's door   |  the landing (4.2)
 *       9      #..l...#...l#...I....##..X..##   and its crypt chamber  |  X  the exit to Level 1
 *      10      #.I.I..#i...#.I...I..##I....##
 *      11      #......#l..l#......l.##.....##
 *      12      #########..############l...l##
 *      13      #########..#############..####   crypt stair down       |  climb stair up
 *      ..                                         (4.2 -> 2.1)            (2.1 -> 4.2)
 *      18      #########..#############..####
 *      19      #...........................##   HELL: west bank x 1-10 (2.1),
 *      ..                                         the burning pit x 11-17 (0),
 *      26      #..........=======..........##     the bridge = at z 26 (2.1),
 *      ..                                         east bank x 18-27 (2.1);
 *      34      #...........................##     steps out of the pit along x 11 and 17
 *      35      ##############################
 * ```
 * (Hell's enemies, braziers, items and barrels are left out of the sketch;
 * the code below has them. `tests/world/prologue.test.ts` holds the
 * properties that matter.)
 *
 * ## Four zones, one level
 *
 * `zones` (see `ZoneLook.ts`/`Zones.ts`) gives each region its own walls,
 * floor, ceiling, trim, fog, ambient light, reverb room and footsteps, eased
 * as the player crosses; the level stays level 0, so saves, chapter select
 * and the other two trace fixtures do not move.
 *
 * 1. **The churchyard at night** — rough dungeon stone and flagstones, dirt
 *    underfoot and the open-air room (level 4's), under a cold blue fog.
 *    **Outdoors is a sky zone:** the yard stands on raised ground (4.2), its
 *    walls rise 3.4 above it as ceiling risers, and no ceiling is built over
 *    it at all, so the scene background — eased to the yard's night-blue fog
 *    colour — is the sky, with a moon and stars drawn past the fog
 *    (`Decor.ts`). A very high ceiling lost in fog was the other option; it
 *    would have turned the yard walls into cliffs fading upward and given no
 *    horizon. Headstones, crosses, tombs and two dead trees stand on `I`
 *    cells: solid to walk into, and on ground this high the pillar mesh is
 *    buried in the platform, so only the decor shows.
 * 2. **The way down** — a mausoleum on the yard's south side (pale church
 *    stone, a gabled roof and a cross against the sky), a crypt chamber, and
 *    a stair of five steps going down through the rock, 0.42 a step — the
 *    old staircase's rise.
 * 3. **Hell** — a basalt cavern, reworked (below). A lake of lava (floor 0,
 *    four fire lights) between two banks at 2.1,
 *    crossed by a one-cell stone bridge; steps climb out along both pit
 *    walls, so a fall is a detour, not a trap. Four zombies and four
 *    crawlers: slow, melee-only, 30-50 hp — one or two flare-pistol shots
 *    (34), and a zombie's `fling` makes the kick worth learning. Two health
 *    and two ammo on the banks, two barrels in the pit.
 *
 * **Task 3 (hell burns, the churchyard is inhabited).** The churchyard
 * stands on earth (`ground`/`side` name `DRESSTEX` surfaces,
 * `src/render/DressTextures.ts`), with dead grass off the worn path, filled
 * graves before the stones and bony hands clawing out of some of them, and
 * a gravedigger's shovel in ADEM's spoil. Hell's pit and braziers burn with
 * pooled flames and embers (`src/fx/HellFire.ts`, from the `ember` and
 * `bowl` decor), its glow flickers, and both zones have a room tone
 * (`bed`, `src/world/ZoneBed.ts`). The bridge is dressed stone lit from the
 * fire below; the climb's first step is the climb's stone. The enemies were
 * placed by playing (`tests/integration/prologuePlay.test.ts`): a zombie
 * beside the stair's foot comes at the player's flank, one waits by the
 * bridge's far end, and two crawlers by the foot of the climb — so a player
 * who only walks, shoots and kicks is touched but not in danger.
 * 4. **The climb out** — level 1's dungeon look up five steps to a landing
 *    and the exit `X`, which leads to Level 1 (`endLevel`).
 *
 * **Hell, reworked (2026-10-04).** The owner played it and said hell was bad and
 * its textures worse: the reference's brick-and-straight-lines texture tiled on
 * every face read as a wire fence, and the pit was the same tile. Hell now has
 * textures of its own (`HELLTEX`, `src/render/HellTextures.ts`) mapped in world
 * space as one cavern (`src/world/HellShell.ts`, `ZoneTheme.shell`): cracked
 * basalt walls and cliffs with fissures that glow, scorched ground, a vault, and
 * a lava lake that flows (`src/fx/Lava.ts`, `ZoneTheme.lava`). It is dressed
 * with rock outcrops, stalagmites, basalt columns, spikes, stakes, stalactites,
 * pyres, ribs and two falls of lava (`src/world/decor/hell.ts`). The masses are
 * on the banks' far edges, off every route the enemies and the player take
 * (`tests/enemies/stuckCheck.test.ts` runs the prologue, and the trace fixture
 * walks the crypt stair into hell and is unmoved in camera and HUD).
 *
 * The only way from the grave to `X` is through hell (pinned by a height-aware
 * search in `tests/world/prologue.test.ts`). Nothing breakable stands on
 * raised ground: a shot finds a prop between y=0 and its height.
 */
export function buildPrologue(): BuiltLevel {
  const W = 30, H = 36;
  const g = Array.from({ length: H }, () => Array(W).fill("#"));
  const hm = Array.from({ length: H }, () => Array(W).fill(0));
  const cm = Array.from({ length: H }, () => Array(W).fill(0));
  const zm = Array.from({ length: H }, () => Array(W).fill(HELL));
  const decor: DecorSpec[] = [];
  const rect = (x0: number, z0: number, x1: number, z1: number, f: (x: number, z: number) => void) => {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) f(x, z);
  };
  const open = (x0: number, z0: number, x1: number, z1: number, floor: number, ceil: number) =>
    rect(x0, z0, x1, z1, (x, z) => { g[z][x] = "."; hm[z][x] = floor; cm[z][x] = ceil; });
  const zone = (x0: number, z0: number, x1: number, z1: number, i: number) => rect(x0, z0, x1, z1, (x, z) => { zm[z][x] = i; });
  const d = (k: string, x: number, z: number, o: Partial<DecorSpec> = {}) => decor.push({ k, x, z, ...o });
  /** A solid cell with a piece standing on it: an `I` buried in the raised ground, the decor on top. */
  const stone = (k: string, x: number, z: number, o: Partial<DecorSpec> = {}) => { g[z][x] = "I"; d(k, x, z, o); };
  const STEP = .42, YARD = 4.2, BANK = 2.1;

  /* ---- 1. the churchyard ---------------------------------------------- */
  zone(0, 0, 21, 12, YARDZ);
  open(1, 1, 20, 11, YARD, YARD + 3.4);
  // the grave, dug up, and ADEM beside it; the mound of its earth; his stone at its head
  g[3][9] = "."; hm[3][9] = YARD - 2 * STEP;
  hm[3][10] = YARD + STEP;
  g[4][9] = "P";
  stone("headstone", 9, 2, { h: -.08 });
  d("coffin", 9, 3, { r: .06 });
  d("lid", 10, 3, { r: -1.4 });
  // the rows: headstones, crosses, a table tomb, two dead trees
  for (const [x, z, k, lean] of [
    [2, 2, "headstone", .05], [4, 2, "cross", 0], [6, 2, "headstone", -.12], [13, 2, "headstone", .1],
    [15, 2, "cross", .15], [17, 2, "headstone", 0], [19, 2, "headstone", -.06],
    [2, 5, "cross", -.1], [4, 5, "headstone", 0], [6, 5, "headstone", .14], [14, 5, "headstone", -.04],
    [16, 5, "cross", 0], [18, 5, "headstone", .08],
    [2, 8, "headstone", 0], [4, 8, "cross", .2], [15, 8, "headstone", -.1], [19, 8, "cross", -.05],
    [14, 10, "headstone", .06], [18, 10, "headstone", 0], [4, 10, "headstone", -.15],
  ] as const) stone(k, x, z, { h: lean, r: (x * 7 + z * 3) % 5 * .05 - .1 });
  stone("tomb", 13, 5);
  stone("tree", 16, 9, { s: 1.25, r: .4 });
  stone("tree", 2, 10, { s: .9, r: 2.1 });
  // lanterns at the mausoleum door and by the grave, candles on the graves
  g[4][7] = "i"; g[7][8] = "i"; g[7][11] = "i"; g[3][18] = "i";
  g[3][8] = "l"; g[3][4] = "l"; g[3][14] = "l"; g[6][16] = "l"; g[9][3] = "l"; g[11][19] = "l";
  d("bones", 12, 3, { r: .8, s: .9 });
  d("bones", 3, 7, { r: 2.4 });
  d("shovel", 10.2, 2.7, { r: .6, h: .3 });
  // the other dead: filled graves before the stones, and some of them are not staying down either
  for (const [x, z, hand] of [[2, 3, 0], [6, 3, .4], [15, 3, 0], [17, 3, 0], [19, 3, 0], [4, 6, 0], [14, 6, .5], [18, 6, 0],
    [2, 9, .3], [15, 9, 0], [19, 9, .45], [14, 11, 0], [18, 11, 0]] as const) {
    d("mound", x, z, { h: ((x * 5 + z) % 3) - 1 });
    if (hand) d("hand", x + .15, z + .1, { h: hand, r: x * 1.3 });
  }
  d("bones", 16, 7, { r: 1.2, s: .8 });
  d("bones", 7, 10, { r: 3.3 });

  /* ---- 2. the mausoleum and the crypt stair ---------------------------- */
  zone(7, 8, 12, 17, CRYPT);
  rect(7, 8, 12, 11, (x, z) => { g[z][x] = "#"; hm[z][x] = 0; cm[z][x] = 0; });
  open(8, 9, 11, 11, YARD, YARD + 2.8);          // the chamber
  open(9, 8, 10, 8, YARD, YARD + 2.8);           // its doorway, a lintel under the yard's wall line
  for (let i = 0; i < 6; i++) { const f = Math.max(BANK, YARD - (i + 1) * STEP); open(9, 12 + i, 10, 12 + i, f, f + 3.0); }
  d("roof", 9.5, 9.5, { s: 12, h: 9 });
  g[10][8] = "i"; g[9][11] = "l"; g[11][11] = "l"; g[11][8] = "l";
  d("bones", 11, 10, { r: 1.1 });
  d("bones", 9, 14, { r: .3, s: .8 });
  d("chain", 10, 10, { h: 1.4 });
  d("chain", 10, 13, { h: 1.2 });
  d("chain", 9, 16, { h: 1.6 });

  // dead grass over the yard, off the path worn from the grave to the mausoleum door
  rect(1, 1, 20, 11, (x, z) => {
    if (g[z][x] === "." && hm[z][x] === YARD && zm[z][x] === YARDZ && !(x >= 8 && x <= 11 && z >= 3 && z <= 7) && (x * 7 + z * 13) % 5 < 3) d("grass", x, z);
  });

  /* ---- 3. hell --------------------------------------------------------- */
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
  hellDressing(d);

  /* ---- 4. the climb out ------------------------------------------------ */
  zone(22, 0, 29, 17, CLIMB);
  zone(24, 18, 25, 18, CLIMB);                    // the first step up is the climb's stone, not hell's veined rock
  open(24, 18, 25, 18, BANK + STEP, BANK + STEP + 3.0);   // first step, the cavern's mouth
  for (let i = 1; i < 6; i++) { const f = Math.min(YARD, BANK + (i + 1) * STEP); open(24, 18 - i, 25, 18 - i, f, f + 3.2); }
  open(23, 8, 27, 12, YARD, YARD + 3.4);          // the landing
  g[9][25] = "X";
  g[8][23] = "i"; g[8][27] = "i"; g[12][23] = "l"; g[12][27] = "l";
  d("bones", 24, 15, { r: 1.7, s: .8 });
  d("bones", 27, 11, { r: 2.6 });
  stone("tomb", 23, 10, { r: Math.PI / 2 });
  d("chain", 26, 10, { h: 1.3 });

  return { g, W, H, hmap: hm, cmap: cm, zones: { map: zm, themes: ZONES }, decor, grave: { x: 9, z: 3 } };
}

/**
 * The cavern's dressing (`src/world/decor/hell.ts`): outcrops against the walls, fangs and columns on the
 * banks' far sides, stakes and pyres between, spikes along the pit's lip, ribs, falls of lava down the pit's
 * two ends, and stalactites in the roof. The masses stay out of x 8-10 and z 18-27 on the west bank (the way
 * from the bridge to the crypt stair, which the zombie at the foot and the crawlers out of the pit take),
 * out of x 23-26 and z 18-23 on the east (the climb's mouth), and out of every cell beside a pickup. Freestanding
 * masses are few and sit in the banks' corners: `tests/enemies/stuckCheck.test.ts` (which runs this level) found the
 * first layout's twelve crawlers pinned against fangs, columns and a pyre standing in the open, and against
 * outcrops at the ends of the wall rows the crawlers walk, so those were moved or made walk-over (`shards`).
 */
function hellDressing(d: (k: string, x: number, z: number, o?: Partial<DecorSpec>) => void): void {
  const W = Math.PI / 2, S = Math.PI;
  // outcrops, backs to the walls: west wall (x 1), south wall (z 34). The fourth stood at (22, 34), the end of the south
  // wall row the crawlers walk to a player on the east bank, and `stuckCheck.test.ts` pinned a crawler on it as soon as
  // the exit's door (src/world/ExitDoor.ts) replaced the pad and so changed the dice a level load takes (every
  // three.js object draws its UUID from the seeded stream, and the door is not the pad's four objects). It is in the
  // north-west corner of the bank now, where nothing walks along the wall: tried at (27, 26), (19, 19), (5, 19) and
  // (22, 19) and pinned a crawler or a zombie at each, so the cell is a measured one.
  for (const [x, z, r] of [[1, 23, W], [1, 31, W], [6, 34, S], [1, 19, W]] as const) d("outcrop", x, z, { r });
  // fangs, columns, a pyre: freestanding masses, in the corners of the banks and well off the straight lines between a crawler and a player
  for (const [x, z] of [[4, 25], [25, 28]] as const) d("stalagmite", x, z);
  for (const [x, z, r] of [[2, 33, 1.1], [26, 31, .7]] as const) d("basaltcol", x, z, { r });
  d("pyre", 7, 33);
  // splinters of rock underfoot, walked over
  for (const [x, z] of [[3, 22], [8, 29], [5, 27], [9, 33], [2, 26], [21, 21], [20, 24], [22, 27], [25, 22], [20, 28], [24, 34], [19, 32], [27, 25], [26, 29], [27, 33]] as const) d("shards", x, z, { r: x * 2 + z });
  // stakes and ribs and spikes: dressing you walk past
  for (const [x, z] of [[7, 23], [5, 30], [9, 31], [22, 22], [25, 25], [19, 29]] as const) d("skullpole", x, z, { r: (x * 3 + z) % 7 });
  d("ribs", 3, 27, { r: .6 }); d("ribs", 24, 30, { r: 2.4 });
  for (const [x, z] of [[10, 29], [10, 32], [18, 24], [18, 30], [10, 21]] as const) d("spikes", x, z, { r: x + z });
  // lava down the pit's two ends: the south wall's wide, the north wall's narrower
  d("lavafall", 14, 34.45, { r: Math.PI, s: 3.4, h: 9 });
  d("lavafall", 13, 18.55, { r: 0, s: 1.8, h: 8.6 });
  // the roof: fangs of rock over the banks and the pit
  for (const [x, z, h] of [[3, 22, 2.2], [7, 27, 1.6], [2, 30, 2.4], [8, 32, 1.8], [5, 24, 1.4], [20, 22, 2], [24, 26, 2.2], [21, 30, 1.8],
    [26, 31, 2.4], [19, 33, 1.6], [23, 21, 2.4], [12, 21, 3], [16, 23, 2.6], [13, 28, 3.2], [15, 31, 2.8], [12, 33, 2.4], [16, 20, 2.2],
    [14, 24, 2.8], [12, 30, 3]] as const) d("stalactite", x, z, { h });
}

/** Zone indices into `ZONES`. */
const YARDZ = 0, CRYPT = 1, HELL = 2, CLIMB = 3;

/**
 * The four looks. Hell wears its own stone (`HELLTEX`) and its fog and light are its own now, a
 * deeper, less red dark than the reference's prologue values (`LEVELS[0]`: 0x180604 at .07, ambient
 * 0x6e2a14 at .6) so that the lava is the light and depth reads; the climb borrows level 1's, the level it leads to.
 */
export const ZONES: ZoneTheme[] = [
  { id: "churchyard", dungeon: true, sub: "graveyard", sky: true, ground: "yardEarth", side: "graveEarth", bed: "yard",
    fog: 0x0b1018, fogD: .05, amb: 0x5a6a88, ambI: .75 },
  { id: "crypt", sub: "crypt", line: "p0_down",
    fog: 0x0a0909, fogD: .06, amb: 0x4a403c, ambI: .5 },
  { id: "hell", hell: true, sub: "hell", line: "p0_hell", bed: "hell",
    shell: true, lava: true, ground: "scorch", side: "rock", wall: "vault", ceil: "vault", band: "band",
    fog: 0x1c0804, fogD: .05, amb: 0x5a2412, ambI: 1.7 },
  { id: "climb", dungeon: true, sub: "dungeon", line: "p0_out",
    fog: 0x07080b, fogD: .05, amb: 0x3a4250, ambI: .5 },
];
