import * as THREE from "three";
import { track } from "../../render/DisposeRegistry";
import { spawnP } from "../../fx/Particles";
import { quietly } from "../../fx/Quiet";
import { at } from "../../audio/AudioEngine";
import { potteryBreaks, propBreaks } from "../../audio/sounds/world";
import { boneSnap, fleshSplat } from "../../audio/sounds/monsters";
import { renderState } from "../../render/Renderer";
import { S } from "../../core/State";
import { world } from "../WorldState";
import type { DecorSpec } from "../LevelBuilder";
import { makeMat } from "./kit";
import { addPiece, merge, partMaterial, type Parts } from "./parts";

/**
 * THE DRESSING THAT BREAKS (owner: "daha fazla kırılabilir eşya"). The level kit's urns, benches, lecterns, crate piles, bone stacks
 * and skull heaps, and the womb's egg-sacs, tumours and growths are built as pieces of their own rather than merged into the level's
 * dressing, and stand in `world.props` beside the crates and barrels — so a shot, a stake, a kick of a blast, a boss's falling
 * debris breaks them, as Blood's do: clay into shards and a puff of ash, wood into splinters, bone into a clatter, flesh into a burst.
 *
 * They are **soft**: nothing walks into them (they were never in anyone's way, and the levels were laid out with them walked past
 * and round), so `Collision.ts` and `Locomotion.ts` pass by them; only what is shot or blown up finds them. And they break **without
 * dice**: every shard's path is from its index, not `Math.random`, so a debris strike on a bench in the boss's fight takes nothing from
 * the seeded stream the traces replay. No pickups fall out of them.
 */

export type Stuff = "pottery" | "wood" | "bone" | "flesh";
export interface Breakable { hp: number; stuff: Stuff }

export const BREAKABLE: Readonly<Record<string, Breakable>> = {
  urn: { hp: 6, stuff: "pottery" },
  bench: { hp: 16, stuff: "wood" },
  lectern: { hp: 14, stuff: "wood" },
  cratepile: { hp: 30, stuff: "wood" },
  skullpile: { hp: 8, stuff: "bone" },
  bonestack: { hp: 14, stuff: "bone" },
  pod: { hp: 10, stuff: "flesh" },
  tumor: { hp: 18, stuff: "flesh" },
  growth: { hp: 22, stuff: "flesh" },
};

/** What a broken piece throws: its colours (r,g,b 0..1) and how many pieces. */
const SHARDS: Readonly<Record<Stuff, { cols: ReadonlyArray<readonly [number, number, number]>; n: number; kind: number }>> = {
  pottery: { cols: [[.62, .36, .22], [.5, .28, .17], [.72, .5, .36]], n: 22, kind: 0 },
  wood: { cols: [[.42, .27, .13], [.34, .21, .1], [.52, .36, .2]], n: 20, kind: 2 },
  bone: { cols: [[.85, .8, .66], [.72, .67, .54], [.6, .55, .44]], n: 18, kind: 0 },
  flesh: { cols: [[.55, .06, .04], [.42, .04, .03], [.7, .32, .26]], n: 26, kind: 1 },
};

export interface SoftProp {
  m: THREE.Object3D; x: number; z: number; r: number; hgt: number; hp: number;
  dead: boolean; explosive: boolean; kind: string; fuse: number; soft: true; stuff: Stuff;
}

/** Builds each breakable spec as a piece of its own and enters it in `world.props`; returns the specs left to be merged. */
export function placeBreakables(scene: THREE.Scene, specs: readonly DecorSpec[]): DecorSpec[] {
  const rest: DecorSpec[] = [], mats = new Map<string, THREE.Material>();
  const box = new THREE.Box3();
  for (const d of specs) {
    const b = BREAKABLE[d.k];
    if (!b) { rest.push(d); continue; }
    const own: Parts = new Map();
    addPiece(own, d);   // the same geometry, made the same way, as when it was merged into the level's dressing
    const g = quietly(() => {   // the piece's own group, meshes and materials take nothing from the game's dice (../../fx/Quiet.ts)
      const grp = new THREE.Group(); grp.name = "prop";
      for (const [k, list] of own) {
        let mat = mats.get(k);
        if (!mat) { mat = track(makeMat(partMaterial(k))); mats.set(k, mat); }
        grp.add(new THREE.Mesh(track(merge(list)), mat));
      }
      return grp;
    });
    box.setFromObject(g);
    const x = (box.min.x + box.max.x) / 2, z = (box.min.z + box.max.z) / 2;
    const r = Math.max(.25, Math.min(1, Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2 * .85));
    scene.add(g);
    const p: SoftProp = { m: g, x, z, r, hgt: box.max.y, hp: b.hp, dead: false, explosive: false, kind: d.k, fuse: -1, soft: true, stuff: b.stuff };
    (world.props as unknown as SoftProp[]).push(p);
  }
  return rest;
}

/** Is this prop a piece of breakable dressing? */
export function isSoft(p: unknown): p is SoftProp { return !!p && (p as { soft?: boolean }).soft === true; }

/** Breaks a piece of dressing: gone from the scene, its stuff thrown out round where it stood, its sound. Takes no dice. */
export function breakDressing(p: SoftProp): void {
  if (p.dead) return;
  p.dead = true; renderState.scene.remove(p.m); S.propsBroken++;
  const s = SHARDS[p.stuff], y = Math.max(.3, p.hgt - .3);
  for (let i = 0; i < s.n; i++) {
    const a = i * 2.39996, up = 1 + (i % 4) * .7, out = 1.2 + (i % 3) * .8;   // a golden-angle fan, so no two go the same way
    const c = s.cols[i % s.cols.length];
    spawnP(p.x, y - (i % 5) * .08, p.z, Math.cos(a) * out, up, Math.sin(a) * out, c[0], c[1], c[2], .6 + (i % 4) * .2, s.kind);
  }
  if (p.stuff === "pottery") for (let i = 0; i < 6; i++) spawnP(p.x, .2 + y * .3, p.z, Math.cos(i) * .3, .4 + i * .08, Math.sin(i) * .3, .5, .47, .42, 1 + i * .1, 3);   // the ash in it
  at(p.x, y, p.z, p.stuff === "pottery" ? potteryBreaks : p.stuff === "wood" ? propBreaks : p.stuff === "bone" ? boneSnap : fleshSplat);
}
