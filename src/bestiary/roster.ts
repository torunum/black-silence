import { PXDEF } from "../enemies/pixels";
import type { PixelDef } from "../enemies/pixels/types";
import { ENEMY_DEFS, type EnemyDef } from "../enemies/EnemyDefs";
import { texFromPx } from "../enemies/SpriteBaker";
import { RIGS } from "../enemies/rig";
import { RigSet } from "../enemies/rig/bake";
import { HEAD, L_ARM, LEGS, R_ARM } from "../enemies/rig/kit";
import { ATK_LEN, ATK_SPLIT, BEHEAD_FALL, DEATH_AT, KILL_FALL, PAIN_LEN, STAGGER } from "../enemies/rig/timing";
import { partArt } from "../fx/GoreTex";

/**
 * THE BESTIARY'S DATA: every enemy in the game, and for each the clips the page
 * plays — walk, attack, pain, death and each dismemberment — as lists of canvases
 * with the time each is shown from. A re-rigged enemy has two sets, the legacy
 * pixel art ("old", baked here from its PXDEF rows, exactly as `buildSprites`
 * bakes them) and the rig's ("new"); an enemy not yet re-rigged has the old one
 * and says so.
 *
 * Nothing here is imported by the game, and nothing here imports the game's
 * world: it reads the art (`PXDEF`, the rigs) and the sprite sizes (`ENEMY_DEFS`).
 * What an enemy does in each clip is what the game does: the same frame times
 * (`src/enemies/rig/timing.ts`), the same sink of a falling body (`enemyTick`'s
 * `h/2*(1-tf)+h*.18*tf`), and for legacy art the same tilt.
 */

export type Side = "old" | "new";
export type ClipName = "walk" | "attack" | "pain" | "death" | "head" | "lArm" | "rArm" | "legs";
export const CLIP_NAMES: readonly ClipName[] = ["walk", "attack", "pain", "death", "head", "lArm", "rArm", "legs"];
export const CLIP_LABEL: Record<ClipName, string> = {
  walk: "Walk", attack: "Attack", pain: "Pain", death: "Death", head: "Head off", lArm: "Left arm off", rArm: "Right arm off", legs: "Legs off",
};

/** One animation: `frames[i]` is shown from `at[i]` ms; the clip ends (and the page loops it after a pause) at `end` ms. */
export interface Clip {
  frames: HTMLCanvasElement[];
  at: number[];
  end: number;
  /** A body that falls sinks into the floor as it does in the game: how far, as a fraction of its height, `ms` in (0 for a clip that does not fall). */
  sink?: (ms: number) => number;
  /** A legacy body without death frames tilts over instead, radians `ms` in. */
  tilt?: (ms: number) => number;
}

export interface Entry {
  key: string;
  name: string;
  def: EnemyDef;
  /** Whether this enemy has a rig (its "new" column is the rig's; if not it says "legacy art"). */
  rigged: boolean;
  clips(side: Side): Partial<Record<ClipName, Clip>>;
  /** The parts that fly off it: the legacy cuts, and (a rigged enemy) its own. */
  parts(side: Side): Array<{ kind: string; canvas: HTMLCanvasElement }>;
}

const NAMES: Record<string, string> = {
  z: "ROTTING GHOUL", f: "FLAYED SPRINTER", g: "HOUND", m: "PLATED HORROR", t: "PLAGUE BLOAT", w: "DRAGGER", s: "WAILER",
  C: "CACODEMON", A: "MANCUBUS", L: "LOST SOUL", j: "CULTIST", n: "ETTIN", B: "HEAVY BRUTE",
};
export const nameOf = (key: string): string => ENEMY_DEFS[key]?.name ?? NAMES[key] ?? key;

const img = (t: { image: unknown }): HTMLCanvasElement => t.image as HTMLCanvasElement;
const clipOf = (frames: HTMLCanvasElement[], ms: number[], end: number, o: Partial<Clip> = {}): Clip => ({ frames, at: ms, end, ...o });
/** A cycle: `frames` each shown `step` ms, once through (the page loops it). */
const cycle = (frames: HTMLCanvasElement[], step: number): Clip => clipOf(frames, frames.map((_, i) => i * step), frames.length * step);
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
/** How far a plain kill has sunk its sprite `ms` after the blow (`fallT` x .32 of the height). */
const sinkKill = (ms: number): number => 0.32 * clamp01(ms / (KILL_FALL * 1000));
const sinkBehead = (ms: number): number => 0.32 * clamp01((ms - STAGGER * 1000) / (BEHEAD_FALL * 1000));

/** The legacy frames of one creature, baked the way `buildSprites` bakes them. */
function legacyFrames(d: PixelDef): Record<string, HTMLCanvasElement | null> {
  const W = d.px[0].length, H = d.px.length, head = d.head || 0;
  const armTop = head, armBot = Math.min(H - 3, head + Math.ceil((H - head) * 0.45));
  const lArm = [[0, armTop, Math.ceil(W * 0.32), armBot]], rArm = [[Math.floor(W * 0.68), armTop, W, armBot]], legM = [[0, H - 3, W, H]];
  const bake = (masks: number[][] | null, mirror = false): HTMLCanvasElement | null => (masks ? img(texFromPx(d.px, d.pal, { masks, stumps: true, mirror })) : null);
  const plain = (mirror: boolean): HTMLCanvasElement => img(texFromPx(d.px, d.pal, { mirror }));
  const headM = head > 0 ? [[0, 0, W, head]] : null;
  return {
    a: plain(false), b: plain(true),
    atk: d.atk ? img(texFromPx(d.atk, d.pal)) : null,
    die1: d.die1 ? img(texFromPx(d.die1, d.pal)) : null, die2: d.die2 ? img(texFromPx(d.die2, d.pal)) : null,
    noHead: bake(headM), noHeadB: bake(headM, true),
    noLArm: bake(lArm), noLArmB: bake(lArm, true), noRArm: bake(rArm), noRArmB: bake(rArm, true),
    noLegs: bake(legM), noLegsB: bake(legM, true),
  };
}

function oldClips(d: PixelDef): Partial<Record<ClipName, Clip>> {
  const f = legacyFrames(d), out: Partial<Record<ClipName, Clip>> = {};
  const pair = (a: string, b: string): Clip | undefined => (f[a] && f[b] ? cycle([f[a]!, f[b]!], 220) : undefined);
  out.walk = pair("a", "b");
  if (f.atk) out.attack = clipOf([f.atk, f.a!], [0, 220], 700);
  // death: the two collapse frames if it has them, else it tilts over on its walking frame; both sink as the game's corpses do
  if (f.die1 && f.die2) out.death = clipOf([f.die1, f.die2], [0, 220], 1500, { sink: sinkKill, tilt: (ms) => (clamp01(ms / (KILL_FALL * 1000)) * Math.PI) / 6 });
  else out.death = clipOf([f.a!], [0], 1500, { sink: sinkKill, tilt: (ms) => clamp01(ms / (KILL_FALL * 1000)) * (Math.PI / 2) });
  if (f.noHead) {
    out.head = clipOf([f.noHead], [0], 1500, { sink: sinkBehead, tilt: (ms) => clamp01((ms - STAGGER * 1000) / (BEHEAD_FALL * 1000)) * (Math.PI / 2) });
  }
  out.lArm = pair("noLArm", "noLArmB"); out.rArm = pair("noRArm", "noRArmB"); out.legs = pair("noLegs", "noLegsB");
  return out;
}

function newClips(set: RigSet): Partial<Record<ClipName, Clip>> {
  const r = set.rig, t = (role: Parameters<RigSet["tex"]>[0], i: number, mask = 0) => img(set.tex(role, i, mask));
  const step = r.walkStep * 1000, frames = (role: Parameters<RigSet["tex"]>[0], n: number, mask = 0): HTMLCanvasElement[] => Array.from({ length: n }, (_, i) => t(role, i, mask));
  const dieAt = (fall: number, base: number): number[] => DEATH_AT.map((u) => base + u * fall * 1000);
  const dieFrames = (mask: number): HTMLCanvasElement[] => frames("die", 5, mask);
  const atkAt = [0, ATK_SPLIT[0] * ATK_LEN * 1000, ATK_SPLIT[1] * ATK_LEN * 1000];
  return {
    walk: cycle(frames("walk", 6), step),
    attack: clipOf([...frames("atk", 3), t("idle", 0)], [...atkAt, ATK_LEN * 1000], 700),
    pain: clipOf([t("pain", 0), t("pain", 1), t("idle", 0)], [0, PAIN_LEN * 500, PAIN_LEN * 1000], 600),
    death: clipOf(dieFrames(0), dieAt(KILL_FALL, 0), 1500, { sink: sinkKill }),
    head: clipOf([t("idle", 0, HEAD), ...dieFrames(HEAD)], [0, ...dieAt(BEHEAD_FALL, STAGGER * 1000)], 1500, { sink: sinkBehead }),
    lArm: cycle(frames("walk", 6, L_ARM), step),
    rArm: cycle(frames("walk", 6, R_ARM), step),
    legs: cycle(frames("crawl", 4, LEGS), step * 1.7),
  };
}

let roster: Entry[] | null = null;

/** Every enemy the game can spawn (`ENEMY_DEFS`), in the order of its pixel art. Built once. */
export function bestiary(): Entry[] {
  if (roster) return roster;
  roster = Object.keys(PXDEF).filter((k) => ENEMY_DEFS[k]).map((key): Entry => {
    const d = PXDEF[key], rig = RIGS[key], set = rig ? new RigSet(rig) : null;
    let oc: Partial<Record<ClipName, Clip>> | null = null, nc: Partial<Record<ClipName, Clip>> | null = null;
    return {
      key, name: nameOf(key), def: ENEMY_DEFS[key], rigged: !!rig,
      clips: (side) => (side === "old" ? (oc ??= oldClips(d)) : set ? (nc ??= newClips(set)) : {}),
      parts: (side) => {
        const kinds = ["head", "lArm", "rArm", "legs"] as const;
        if (side === "new") return set ? kinds.map((kind) => ({ kind, canvas: img(set.part(kind).tex) })) : [];
        // the legacy cuts: `partArt` for a key whose `PX` has no rig (the bestiary never boots the game's sprites) is the pixel art's
        return kinds.flatMap((kind) => { const a = partArt(key, kind); return a ? [{ kind, canvas: img(a.tex) }] : []; });
      },
    };
  });
  return roster;
}

/** The frame of `clip` shown `ms` in (looping after a pause of `pause` ms at the end). */
export function frameAt(clip: Clip, ms: number, pause = 500): { canvas: HTMLCanvasElement; ms: number; index: number } {
  const t = clip.end + pause, m = ms % t, at = Math.min(m, clip.end - 1);
  let i = 0;
  for (let k = 0; k < clip.at.length; k++) if (at >= clip.at[k]) i = k;
  return { canvas: clip.frames[i], ms: m, index: i };
}
