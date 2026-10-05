import { shifted, WZ, type Klass, type Mode, type Piece, type PieceInfo, type Theme } from "./kit";
import { PROLOGUE_PIECES as PRO } from "./prologue";
import { DUNGEON_PIECES as DUN } from "./dungeon";
import { SACRED_PIECES as SAC } from "./sacred";
import { PIPE_PIECES as PIP } from "./pipes";
import { WOMB_PIECES as WOM } from "./womb";
import { HELL_PIECES as HEL } from "./hell";
import { CHECKPOINT_PIECES as CKP } from "./checkpoint";

/**
 * THE KIT: every piece, how it stands, which mesh it merges into, and the
 * vocabulary of each theme (levels-feel-full plan, Task 1).
 *
 * **Mode** is what `place.ts` validates (see `kit.ts`). **Class** is the
 * shadow policy (`Shadows.ts`): `decor` is a caster — the masses a player
 * walks round and is occluded by — while `clutter` is not: straw, glass, a
 * skull, a candelabrum's stem, a chain's links are narrower than a shadow
 * texel, and the lamp's cube shadow draws every caster six times a frame.
 * The prologue's pieces all stay `decor` (bar the grass), because moving
 * one would add a mesh to the prologue's scene and move its trace; where the
 * kit wants the same shape as clutter it says so with an alias (`bonesLoose`,
 * `chainLoose`, `gravestone`, `gravecross`, `sapling`).
 *
 * A piece with `fixed` ignores a spec's `s`: its size comes from `h` (a chain
 * or hook's length) or from the room (a cage, a pipe).
 */
const P = (build: Piece, mode: Mode, cls: Klass = "clutter", extra: Partial<PieceInfo> = {}): PieceInfo => ({ build, mode, cls, ...extra });

export const PIECES: Record<string, PieceInfo> = {
  // the prologue's, exactly as they were
  headstone: P(PRO.headstone, "solid", "decor"),
  cross: P(PRO.cross, "solid", "decor"),
  tomb: P(PRO.tomb, "solid", "decor"),
  tree: P(PRO.tree, "solid", "decor"),
  coffin: P(PRO.coffin, "free", "decor"),
  lid: P(PRO.lid, "flat", "decor"),
  bones: P(PRO.bones, "flat", "decor"),
  chain: P(PRO.chain, "hang", "decor", { fixed: true }),
  bowl: P(PRO.bowl, "free", "decor"),
  ember: P(PRO.ember, "cover", "decor"),
  bridge: P(PRO.bridge, "cover", "decor"),
  mound: P(PRO.mound, "flat", "decor"),
  hand: P(PRO.hand, "flat", "decor"),
  grass: P(PRO.grass, "cover", "grass"),
  shovel: P(PRO.shovel, "free", "decor"),
  roof: P(PRO.roof, "cover", "decor", { fixed: true }),
  // the same shapes as clutter, for levels: no shadow, sized to stand freely
  bonesLoose: P(PRO.bones, "flat"),
  chainLoose: P(PRO.chain, "hang", "clutter", { fixed: true, h: 1.5 }),
  // a headstone, a cross and a sapling are small masses: a thin box each (before the piece's scale), so a yard's rows are walked between, not through
  gravestone: P(PRO.headstone, "free", "clutter", { scale: .72, mass: [-.45, .45, -.15, .15] }),
  gravecross: P(PRO.cross, "free", "clutter", { scale: .78, mass: [-.31, .31, -.08, .08] }),
  sapling: P(PRO.tree, "free", "clutter", { scale: .5, mass: [-.27, .27, -.27, .27] }),
  // hell: the prologue's cavern, hand-placed (`levels/prologue.ts`); the masses are solid, the rest is dressing
  outcrop: P(HEL.outcrop, "edge", "decor", { mass: [-.9, .9, -.97, .25] }),
  stalagmite: P(HEL.stalagmite, "free", "decor", { mass: [-.5, .5, -.5, .5] }),
  basaltcol: P(HEL.basaltcol, "free", "decor", { mass: [-.62, .62, -.62, .62] }),
  pyre: P(HEL.pyre, "free", "decor", { mass: [-.55, .55, -.55, .55] }),
  spikes: P(HEL.spikes, "flat"),
  shards: P(HEL.shards, "flat"),
  skullpole: P(HEL.skullpole, "free"),
  stalactite: P(HEL.stalactite, "hang", "clutter", { fixed: true, h: 1.8 }),
  ribs: P(HEL.ribs, "free"),
  lavafall: P(() => {}, "cover", "clutter", { fixed: true }),   // a plane that moves (`Decor.ts` hands the spec to `src/fx/Lava.ts`); no merged parts
  // dungeon
  shackles: P(DUN.shackles, "wall"),
  cage: P(DUN.cage, "hang", "clutter", { fixed: true }),
  straw: P(DUN.straw, "flat"),
  cratepile: P(DUN.cratepile, "edge", "decor", { mass: [-.92, .85, -.97, -.13], lookalike: "crate" }),
  sconce: P(DUN.sconce, "wall"),
  rubble: P(DUN.rubble, "flat"),
  skullpile: P(DUN.skullpile, "flat"),
  bench: P(DUN.bench, "edge"),
  // dungeon set-pieces: masses a room is built round (not in the vocabulary: the level's builder places each)
  rack: P(DUN.rack, "free", "decor", { mass: [-.95, .95, -.42, .42] }),
  slab: P(DUN.slab, "free", "decor", { mass: [-.93, .93, -.47, .47] }),
  stocks: P(DUN.stocks, "free", "decor", { mass: [-.75, .75, -.25, .25] }),
  maiden: P(DUN.maiden, "edge", "decor", { mass: [-.47, .47, -.97, -.28] }),
  // church
  candelabra: P(SAC.candelabra, "free"),
  lectern: P(SAC.lectern, "edge"),
  fallenstatue: P(SAC.fallenstatue, "edge", "decor", { mass: [-.95, .9, -.95, -.05] }),
  banner: P(SAC.banner, "wall"),
  glass: P(SAC.glass, "flat"),
  font: P(SAC.font, "edge", "clutter", { mass: [-.45, .45, -.85, .05] }),
  altar: P(SAC.altar, "edge", "decor", { mass: [-.87, .87, -.97, -.15] }),
  // necropolis
  sarcophagus: P(SAC.sarcophagus, "edge", "decor", { mass: [-.93, .93, -.95, -.05] }),
  sarcofree: P(shifted(SAC.sarcophagus, .5), "free", "decor", { mass: [-.93, .93, -.46, .46] }),
  urn: P(SAC.urn, "free"),
  niche: P(SAC.niche, "wall"),
  bonestack: P(SAC.bonestack, "edge"),
  // graveyard
  fence: P(SAC.fence, "wall"),
  opengrave: P(SAC.opengrave, "flat"),
  tombfree: P(PRO.tomb, "free", "decor", { mass: [-.58, .58, -.94, .94] }),   // the prologue's table tomb, standing free
  deadtree: P(SAC.deadtree, "free", "decor", { mass: [-.25, .25, -.25, .25] }),
  // sewers and factory
  pipe: P(PIP.pipe, "wall", "clutter", { fixed: true }),
  pipedrop: P(PIP.pipedrop, "wall", "clutter", { fixed: true }),
  grate: P(PIP.grate, "flat"),
  sludge: P(PIP.sludge, "flat"),
  debris: P(PIP.debris, "flat"),
  outfall: P(PIP.outfall, "wall"),
  ladder: P(PIP.ladder, "wall", "clutter", { fixed: true }),
  machine: P(PIP.machine, "edge", "decor", { mass: [-.85, .85, -.95, -.05] }),
  drum: P(PIP.drum, "edge", "clutter", { mass: [-.75, .8, -.95, .12], lookalike: "barrel" }),
  hook: P(PIP.hook, "hang", "clutter", { fixed: true }),
  conveyor: P(PIP.conveyor, "edge", "decor", { mass: [-.95, .95, -.95, -.28] }),
  gauge: P(PIP.gauge, "wall"),
  // womb
  growth: P(WOM.growth, "edge"),
  sinew: P(WOM.sinew, "wall", "clutter", { fixed: true }),
  drape: P(WOM.drape, "hang", "clutter", { fixed: true }),
  pod: P(WOM.pod, "edge"),
  eye: P(WOM.eye, "wall"),
  vein: P(WOM.vein, "flat"),
  // levels 3-7 set-pieces (Task 3): the light-bearing ones carry a `light` (one real point light each, budgeted per level), the rest are masses
  votive: P(SAC.votive, "free"),   // glow only: level 3 is at the budget's ceiling
  gravelamp: P(SAC.gravelamp, "free", "clutter", { light: { color: 0xffa64a, intensity: 1.8, range: 10, at: [.36, 1.4, 0] } }),
  pump: P(PIP.pump, "edge", "clutter", { mass: [-.8, .8, -.95, .15] }),
  tank: P(PIP.tank, "edge", "clutter", { mass: [-.62, .62, -.95, .27] }),
  lantern: P(PIP.lantern, "wall", "clutter", { fixed: true, light: { color: 0xb6dc6a, intensity: 2, range: 11, at: [0, 1.7, WZ + .45] } }),
  press: P(PIP.press, "edge", "clutter", { mass: [-.8, .8, -.95, .05] }),
  furnace: P(PIP.furnace, "edge", "clutter", { mass: [-.9, .9, -.97, .03], light: { color: 0xff7a30, intensity: 2.2, range: 10, at: [0, .85, .2] } }),
  worklamp: P(PIP.worklamp, "hang", "clutter", { fixed: true, light: { color: 0xffe6b0, intensity: 2.4, range: 12, at: [0, 1.2, 0], hung: true } }),
  tumor: P(WOM.tumor, "edge", "clutter", { mass: [-.85, .85, -.95, .15] }),
  // glow-only twins of the lamp pieces (Task 3): the same look with no point light, for the dark rooms the budget has no light left for
  brazier: P(DUN.brazier, "free", "clutter"),
  gravelampDim: P(SAC.gravelamp, "free", "clutter"),
  lanternDim: P(PIP.lantern, "wall", "clutter", { fixed: true }),
  worklampDim: P(PIP.worklamp, "hang", "clutter", { fixed: true }),
  bulbDim: P(WOM.glowbulb, "free", "clutter"),
  glowbulb: P(WOM.glowbulb, "free", "clutter", { light: { color: 0xff5a4a, intensity: 2, range: 10, at: [0, 1.15, 0] } }),
  // the checkpoint markers (deeper-levels plan, Task 1): one per theme, thin wall pieces that stand unlit until the player passes (checkpoint.ts)
  candlestub: P(CKP.candlestub, "wall"),
  shrine: P(CKP.shrine, "wall"),
  ossuarylamp: P(CKP.ossuarylamp, "wall"),
  hooklantern: P(CKP.hooklantern, "wall"),
  shutlamp: P(CKP.shutlamp, "wall"),
  pilotlight: P(CKP.pilotlight, "wall"),
  quickening: P(CKP.quickening, "wall"),
};

/**
 * What each theme is dressed in, with a weight for `clutterAlongWalls` to
 * choose by. Kinds shared between themes (rubble, bones, pipes) are the
 * ones a dark place has in common; the rest belong to one place.
 */
export const VOCAB: Readonly<Record<Theme, ReadonlyArray<{ k: string; w: number }>>> = {
  dungeon: [
    { k: "straw", w: 3 }, { k: "rubble", w: 3 }, { k: "bonesLoose", w: 2 }, { k: "skullpile", w: 1.5 }, { k: "chainLoose", w: 2 },
    { k: "shackles", w: 2 }, { k: "cage", w: 1 }, { k: "cratepile", w: 1.5 }, { k: "sconce", w: 2 }, { k: "bench", w: 1 },
  ],
  church: [
    { k: "glass", w: 2.5 }, { k: "rubble", w: 2 }, { k: "candelabra", w: 1.5 }, { k: "lectern", w: .7 }, { k: "fallenstatue", w: .5 },
    { k: "banner", w: 2 }, { k: "font", w: .4 }, { k: "bench", w: 1.2 }, { k: "sconce", w: 1 }, { k: "bonesLoose", w: .5 },
  ],
  necropolis: [
    { k: "sarcophagus", w: 1.5 }, { k: "urn", w: 2 }, { k: "niche", w: 2.5 }, { k: "bonestack", w: 1 }, { k: "skullpile", w: 2 },
    { k: "rubble", w: 1.5 }, { k: "bonesLoose", w: 1.5 }, { k: "chainLoose", w: 1 },
  ],
  graveyard: [
    { k: "gravestone", w: 3 }, { k: "gravecross", w: 2 }, { k: "sapling", w: 1 }, { k: "fence", w: 3 }, { k: "opengrave", w: .7 },
    { k: "mound", w: 2 }, { k: "hand", w: .5 }, { k: "bonesLoose", w: 1.5 },
  ],
  sewers: [
    { k: "pipe", w: 3 }, { k: "pipedrop", w: 1.5 }, { k: "grate", w: 2 }, { k: "sludge", w: 3 }, { k: "debris", w: 2 },
    { k: "outfall", w: 1 }, { k: "ladder", w: .7 }, { k: "cage", w: .7 }, { k: "chainLoose", w: 1 },
  ],
  factory: [
    { k: "machine", w: 1 }, { k: "drum", w: 1.5 }, { k: "hook", w: 1.5 }, { k: "conveyor", w: .5 }, { k: "gauge", w: 1.5 },
    { k: "pipe", w: 2.5 }, { k: "pipedrop", w: 1.5 }, { k: "cratepile", w: 1.5 }, { k: "chainLoose", w: 2 }, { k: "rubble", w: 1 },
  ],
  womb: [
    { k: "growth", w: 2 }, { k: "sinew", w: 2 }, { k: "drape", w: 2 }, { k: "pod", w: 1.5 }, { k: "eye", w: 1 }, { k: "vein", w: 3 },
  ],
};

/**
 * The masses and free-standing pieces a level's builder places by hand, beyond what `clutter` scatters:
 * the gallery shows them too, so a piece nobody scatters is still looked at.
 */
export const SETPIECES: Readonly<Record<Theme, readonly string[]>> = {
  dungeon: ["rack", "slab", "stocks", "maiden", "candlestub"],
  church: ["altar", "shrine"],
  necropolis: ["sarcofree", "tombfree", "votive", "ossuarylamp"],
  graveyard: ["tombfree", "deadtree", "gravelamp", "hooklantern"],
  sewers: ["pump", "tank", "lantern", "shutlamp"], factory: ["press", "furnace", "worklamp", "pilotlight"], womb: ["tumor", "glowbulb", "quickening"],
};

/** The theme a level's `sub` names, if it has a kit (hell, the crypt and the like do not). */
export function themeOf(sub: string): Theme | undefined {
  return sub in VOCAB ? sub as Theme : undefined;
}
