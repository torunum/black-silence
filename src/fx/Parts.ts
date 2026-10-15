import * as THREE from "three";
import { rnd } from "../utils/math";
import { getScene } from "../render/SceneRef";
import { track } from "../render/DisposeRegistry";
import { solidAt, floorHeightAt } from "../world/Collision";
import { player } from "../player/PlayerState";
import { at } from "../audio/AudioEngine";
import { headBounce, headKicked } from "../audio/sounds/monsters";
import { partLands } from "../audio/sounds/gore";
import { blood } from "./Particles";
import { addPool } from "./Decals";
import { headPool } from "./Heads";
import { bloodFx } from "./ImpactFx";
import { goutFx } from "./GoreDrops";
import { splatFloor } from "./Splats";
import { LIMB_SCALE, partArt, type PartKind } from "./GoreTex";
import { fxRange } from "./FxRand";
import { quietly } from "./Quiet";

/**
 * THE PARTS A MONSTER COMES APART INTO — a severed head, an arm, the legs
 * (`docs/superpowers/plans/2026-10-08-impact.md`, Task 3): sprites cut from
 * the monster's own pixel art (`GoreTex.partArt`), with a wet stump at the
 * torn end, that fly off the body, spin, bleed a trail, bounce, land on the
 * floor under them and lie there, kickable. They live in `headPool.heads`
 * (the list was only heads; it is every part now, and the name stayed so
 * that what already reads it keeps reading it).
 *
 * - **Budget**: `PART_MAX` 20 sprites a level. A new part past the cap takes
 *   the oldest one's sprite (nothing is created past the cap, nothing is
 *   disposed), so a long fight leaves the last twenty parts where they fell.
 * - **Floors**: a part rests at `floorHeightAt(x,z) + sz/2` and rolls onto
 *   another height as the floor changes (`goreRaisedFloors.test.ts`).
 * - **Dice**: the physics' and the old blood's are the game's, exactly as
 *   `headTick` always drew them (the fixtures are recorded under them); every
 *   new effect here — the trail, the splats, the sound — draws from
 *   `FxRand` or from sound's own dice.
 *
 * `headTick` is the old function of that name, moved here with its lines and
 * its draws in their order, and what the plan adds around them.
 */

export const PART_MAX = 20;
/** How much larger than the monster's own scale a limb is drawn (a head is true size). */
export const PART_SCALE = LIMB_SCALE;

/** 0 a head, 1 a left arm, 2 a right arm, 3 the legs. */
export const KINDS: readonly PartKind[] = ["head", "lArm", "rArm", "legs"];

/** One live part: `headPool.heads`' elements. */
export interface Part {
  sp: THREE.Sprite;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  spin: number;
  rest: boolean;
  life: number;
  /** The height the part rests at: its centre is `sz/2` over the floor. A head keeps the size it always had here (`max(.34, w*.34)`), so its bounces — and the dice they draw from the game's stream — are exactly the old head's. */
  sz: number;
  /** How far the sprite is drawn above its centre of mass, so a head's own (taller) face stands on the floor where the old square one did. */
  vis: number;
  kind: number;
  /** Seconds left of easing a limb round to lie flat once it has stopped; and the seconds since its last drop of trail. */
  settle: number;
  trail: number;
}

/** The monster a part came off: where it stood, its size and which floor. */
export interface PartHost { x: number; z: number; h: number; w: number; fy?: number; key: string }

/** The motion a part starts with. */
export interface PartStart { x: number; y: number; z: number; vx: number; vy: number; vz: number; spin: number }

/**
 * Makes a part of `kind` off `e` (so its art is `e`'s own) moving as `s`, and adds it to the pool. Returns it, or
 * null if the monster has no such part (a monster with no head) or the scene is not up.
 */
export function makePart(kind: number, e: PartHost, s: PartStart, life = Infinity): Part | null {
  return quietly(() => makePartNow(kind, e, s, life));   // the sprite's and its material's uuids are not the game's dice (./Quiet.ts)
}

function makePartNow(kind: number, e: PartHost, s: PartStart, life: number): Part | null {
  const art = partArt(e.key, KINDS[kind]);
  if (!art) return null;
  const big = kind === 0 ? 1 : PART_SCALE;   // an arm or the legs are drawn a third larger than life: the pixels are small
  const w = art.cw * (e.w / art.W) * big, h = art.ch * (e.h / art.H) * big;
  let sp: THREE.Sprite;
  const pool = headPool.heads as unknown as Part[];
  if (pool.length >= PART_MAX) {
    sp = pool.shift()!.sp;            // the oldest part's sprite is the new one's
    (sp.material as THREE.SpriteMaterial).map = art.tex;
    (sp.material as THREE.SpriteMaterial).needsUpdate = true;
    sp.visible = true;
  } else {
    sp = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: art.tex, transparent: true })));
    getScene().add(sp);
  }
  sp.scale.set(w, h, 1);
  sp.material.rotation = 0;
  sp.position.set(s.x, s.y + (kind === 0 ? (h - Math.max(0.34, e.w * 0.34)) / 2 : 0), s.z);
  // a head keeps the old head's size for its physics (and so its bounces and their draws), drawn at its own; a limb lies on its thin side
  // a rig's limb is drawn true size in the legacy crop's physical box (`art.phys`): the box decides how it falls and rests, and the art is drawn down on the floor in it
  const pw = art.phys ? art.phys.fw * e.w * big : w, ph = art.phys ? art.phys.fh * e.h * big : h;
  const sz = kind === 0 ? Math.max(0.34, e.w * 0.34) : Math.min(pw, ph);
  // (a head stands on the floor by its own height; the legs stand, upright or upside down, on theirs; an arm lies on its side, on its thickness)
  const vis = kind === 0 || (kind === 3 && art.phys) ? (h - sz) / 2 : art.phys ? (w - sz) / 2 : 0;
  const p: Part = { sp, x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, spin: s.spin, rest: false, life, sz, vis, kind, settle: 0, trail: 0 };
  headPool.heads.push(p as unknown as Record<string, unknown>);
  return p;
}

/** How a part lies when it has stopped: arms on their sides, the legs flat, a head however it came to rest. */
function lyingRotation(kind: number, rot: number): number {
  if (kind === 1 || kind === 2) return Math.round((rot - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
  if (kind === 3) return Math.round(rot / Math.PI) * Math.PI;
  return rot;
}

export function headTick(dt: number): void {
  for (let i = headPool.heads.length - 1; i >= 0; i--) {
    const h = headPool.heads[i] as unknown as Part;
    h.life -= dt;
    if (!h.rest) {
      h.vy -= 15 * dt;
      h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt;
      h.sp.material.rotation += h.spin * dt;
      if (solidAt(h.x, h.z)) { h.vx *= -.4; h.vz *= -.4; h.x -= h.vx * dt; h.z -= h.vz * dt; }
      const floor = floorHeightAt(h.x, h.z);   // the floor under it now: it can roll onto another height
      // a trail while it flies fast: thirty-odd drops a second
      h.trail += dt;
      if (h.trail > 0.028 && (Math.abs(h.vy) + Math.abs(h.vx) + Math.abs(h.vz)) > 3.5) { h.trail = 0; goutFx(h.x, h.y, h.z, 1, 0.5, 0, 0, 0.2); bloodFx(h.x, h.y, h.z, 1, 0.4); }
      if (h.y <= floor + h.sz * .5) {
        h.y = floor + h.sz * .5;
        if (Math.abs(h.vy) > 1.3) {
          h.vy *= -.42; h.vx *= .6; h.vz *= .6; h.spin *= .6;
          // a head draws its bounce's blood from the game's stream exactly as it always did; a limb (new) from the effects' own
          if (h.kind === 0) { if (Math.random() < .6) blood(h.x, h.y, h.z, 3, 1.2); if (Math.random() < .5) addPool(h.x, h.z, rnd(.2, .35)); }
          else bloodFx(h.x, h.y, h.z, 3, 1.2);
          at(h.x, h.y, h.z, () => headBounce());
          splatFloor(h.x, h.z, fxRange(0.35, 0.6));
          goutFx(h.x, h.y, h.z, 4, 1.4, 0, 0, 0.5);
          if (h.kind) at(h.x, h.y, h.z, () => partLands());
        } else {
          h.vy = 0; h.vx *= .7; h.vz *= .7; h.spin *= .7;
          if (Math.abs(h.vx) < .2 && Math.abs(h.vz) < .2) {
            h.rest = true; h.spin = 0; h.settle = 0.35;
            splatFloor(h.x, h.z, h.kind ? fxRange(0.7, 1) : fxRange(0.9, 1.3));   // a pool spreads from where it lies
          }
        }
      }
    } else if (h.settle > 0) {
      // a limb that has stopped eases round to lie on its side
      h.settle -= dt;
      const m = h.sp.material, target = lyingRotation(h.kind, m.rotation);
      m.rotation += (target - m.rotation) * Math.min(1, dt * 14);
    }
    // player kick: walk into it (or kick action) to punt it
    const pd = Math.hypot(h.x - player.px, h.z - player.pz);
    if (pd < .7) {
      const a = Math.atan2(h.x - player.px, h.z - player.pz);
      // walking into a part only nudges it; the real punt is the kick's (`puntHeads`, called as `doKick`'s hit lands)
      h.vx = Math.sin(a) * 3.4; h.vz = Math.cos(a) * 3.4; h.vy = 2.2;
      h.spin = h.kind === 0 ? rnd(-12, 12) : fxRange(-12, 12); h.rest = false;
    }
    h.sp.position.set(h.x, h.y + h.vis, h.z);
    if (h.life <= 0) { getScene().remove(h.sp); headPool.heads.splice(i, 1); }
  }
}

/**
 * The kick's boot meets the parts in front of it (`doKick`, on the frame its hit resolves, along `dir`): each one within
 * reach of the player and in his path is punted hard — thrown along the kick, up, spinning — with a spray of blood and
 * the thud of it. Returns how many were hit. (`rnd` is not drawn: the variety is the part's own spin sign, from its index.)
 */
export function puntHeads(dirx: number, dirz: number): number {
  let n = 0;
  for (const raw of headPool.heads) {
    const h = raw as unknown as Part;
    const dx = h.x - player.px, dz = h.z - player.pz, d = Math.hypot(dx, dz);
    if (d > 2.4 || d < .001 || (dx * dirx + dz * dirz) / d < .5) continue;
    h.vx = dirx * 12 + dx / d * 2; h.vz = dirz * 12 + dz / d * 2; h.vy = 6.4;
    h.spin = (n & 1 ? -1 : 1) * 15; h.rest = false; h.settle = 0;
    at(h.x, h.y, h.z, () => headKicked()); bloodFx(h.x, h.y, h.z, 10, 1.6, dirx, dirz);
    n++;
  }
  return n;
}
