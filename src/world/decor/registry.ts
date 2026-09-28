import type { Klass, Mode, Piece, PieceInfo, Theme } from "./kit";
import { PROLOGUE_PIECES as PRO } from "./prologue";
import { DUNGEON_PIECES as DUN } from "./dungeon";
import { SACRED_PIECES as SAC } from "./sacred";
import { PIPE_PIECES as PIP } from "./pipes";
import { WOMB_PIECES as WOM } from "./womb";

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
  gravestone: P(PRO.headstone, "free", "clutter", { scale: .72 }),
  gravecross: P(PRO.cross, "free", "clutter", { scale: .78 }),
  sapling: P(PRO.tree, "free", "clutter", { scale: .5 }),
  // dungeon
  shackles: P(DUN.shackles, "wall"),
  cage: P(DUN.cage, "hang", "clutter", { fixed: true }),
  straw: P(DUN.straw, "flat"),
  cratepile: P(DUN.cratepile, "edge", "decor"),
  sconce: P(DUN.sconce, "wall"),
  rubble: P(DUN.rubble, "flat"),
  skullpile: P(DUN.skullpile, "flat"),
  bench: P(DUN.bench, "edge"),
  // church
  candelabra: P(SAC.candelabra, "free"),
  lectern: P(SAC.lectern, "edge"),
  fallenstatue: P(SAC.fallenstatue, "edge", "decor"),
  banner: P(SAC.banner, "wall"),
  glass: P(SAC.glass, "flat"),
  font: P(SAC.font, "edge"),
  // necropolis
  sarcophagus: P(SAC.sarcophagus, "edge", "decor"),
  urn: P(SAC.urn, "free"),
  niche: P(SAC.niche, "wall"),
  bonestack: P(SAC.bonestack, "edge"),
  // graveyard
  fence: P(SAC.fence, "wall"),
  opengrave: P(SAC.opengrave, "flat"),
  // sewers and factory
  pipe: P(PIP.pipe, "wall", "clutter", { fixed: true }),
  pipedrop: P(PIP.pipedrop, "wall", "clutter", { fixed: true }),
  grate: P(PIP.grate, "flat"),
  sludge: P(PIP.sludge, "flat"),
  debris: P(PIP.debris, "flat"),
  outfall: P(PIP.outfall, "wall"),
  ladder: P(PIP.ladder, "wall", "clutter", { fixed: true }),
  machine: P(PIP.machine, "edge", "decor"),
  drum: P(PIP.drum, "edge"),
  hook: P(PIP.hook, "hang", "clutter", { fixed: true }),
  conveyor: P(PIP.conveyor, "edge", "decor"),
  gauge: P(PIP.gauge, "wall"),
  // womb
  growth: P(WOM.growth, "edge"),
  sinew: P(WOM.sinew, "wall", "clutter", { fixed: true }),
  drape: P(WOM.drape, "hang", "clutter", { fixed: true }),
  pod: P(WOM.pod, "edge"),
  eye: P(WOM.eye, "wall"),
  vein: P(WOM.vein, "flat"),
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

/** The theme a level's `sub` names, if it has a kit (hell, the crypt and the like do not). */
export function themeOf(sub: string): Theme | undefined {
  return sub in VOCAB ? sub as Theme : undefined;
}
