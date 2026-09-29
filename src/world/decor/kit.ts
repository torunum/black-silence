import * as THREE from "three";
import { TEX } from "../../render/ProcTextures";
import { DRESSTEX } from "../../render/DressTextures";
import type { DecorSpec } from "../LevelBuilder";

/**
 * THE DRESSING KIT'S VOCABULARY — types, helpers and materials shared by
 * every piece (levels-feel-full plan, Task 1). Split out of `Decor.ts`, which
 * kept the scene-building half (`dressLevel`); the pieces themselves are in
 * the theme files beside this one, the registry that gives each a mode and a
 * shadow class is `registry.ts`, and the placement rules are `place.ts`.
 */

/** The seven themes a level can be dressed in. Hell has no kit: only the prologue is hell, and it is hand-dressed. */
export type Theme = "dungeon" | "church" | "necropolis" | "graveyard" | "sewers" | "factory" | "womb";
export const THEMES: readonly Theme[] = ["dungeon", "church", "necropolis", "graveyard", "sewers", "factory", "womb"];

/**
 * How a piece stands, which is what the placement rules key on:
 *  - `solid`  stands on an `I` cell that is buried in raised ground (the prologue's headstones, trees);
 *  - `edge`   bulky, its back to a wall (a sarcophagus, a crate pile): never in a corridor, never beside a door or pickup;
 *  - `free`   small and freestanding, anywhere with room (an urn, a candelabrum);
 *  - `wall`   thin, hung on or hugging a wall (a banner, a pipe): fine in a corridor;
 *  - `flat`   lies on the floor, under 0.3 high (straw, bones, glass): fine anywhere but a door, pickup or exit;
 *  - `hang`   hangs from the ceiling, its lowest point above head height (a cage, a chain);
 *  - `cover`  ground or sky cover with no rules (grass, fire, the bridge, the roof).
 */
export type Mode = "solid" | "edge" | "free" | "wall" | "flat" | "hang" | "cover";

/** Which mesh a piece merges into: `decor` casts a lamp shadow, `clutter` and `grass` do not (`Shadows.ts`). */
export type Klass = "decor" | "clutter" | "grass";

type M4 = THREE.Matrix4;
export type Box = (mat: string, w: number, h: number, d: number, m: M4) => void;
export type Cyl = (mat: string, r0: number, r1: number, h: number, m: M4, seg?: number) => void;
export type Sph = (mat: string, r: number, m: M4) => void;

/** One piece's builder: its parts in its own frame (y=0 on its floor, +z its front, -z its back against the wall), `top` the headroom above it. */
export type Piece = (box: Box, cyl: Cyl, d: DecorSpec, top: number, sph: Sph) => void;

export interface PieceInfo {
  build: Piece;
  mode: Mode;
  cls: Klass;
  /** A size a piece has when its spec names none: a gravestone is the headstone, smaller. */
  scale?: number;
  /** The spec's `s` means nothing to it: its size comes from `h` or from the room (a chain, a cage, a pipe). */
  fixed?: boolean;
  /** The `h` a spec gets when it names none: a loose chain's length, so a default one clears a player's head. */
  h?: number;
  /**
   * A mass: the piece is solid. Its footprint `[x0, x1, z0, z1]` in the piece's own frame (before yaw and
   * scale), which `masses.ts` turns into a box the player, the enemies and the shots stop at. Small clutter
   * has none and stays walk-through.
   */
  mass?: readonly [number, number, number, number];
  /** What a player might take this for: the `x` crate or the `O` barrel. The placement rules keep it away from the real thing. */
  lookalike?: "crate" | "barrel";
  /**
   * A light-bearing piece: `Decor.ts` gives it one real point light, where `at` says in the piece's own frame (`hung`:
   * its `y` is measured down from the ceiling). Every light is a per-fragment cost on every lit surface, so each level has
   * a budget (`tests/world/lightBudget.test.ts`) and a piece without this is glow at most (an unlit emissive material).
   */
  light?: { color: number; intensity: number; range: number; at: readonly [number, number, number]; hung?: boolean };
}

/** Local transform: a position, an XYZ rotation and an optional scale. */
export function loc(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx): THREE.Matrix4 {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}

/** A piece moved `dz` along its own z: the wall-hung sarcophagus stood in the middle of a room, say. */
export function shifted(build: Piece, dz: number): Piece {
  const s = loc(0, 0, dz);
  return (box, cyl, d, top, sph) => build(
    (mat, w, h, dd, m) => box(mat, w, h, dd, s.clone().multiply(m)),
    (mat, r0, r1, h, m, seg) => cyl(mat, r0, r1, h, s.clone().multiply(m), seg),
    d, top, (mat, r, m) => sph(mat, r, s.clone().multiply(m)));
}

/** A transform relative to another: a part placed in a sub-assembly's frame. */
export function within(base: THREE.Matrix4, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Matrix4 {
  return base.clone().multiply(loc(x, y, z, rx, ry, rz));
}

/** A skull (cranium, jaw, one dark stroke for the eyes) sitting at `base`'s origin, facing its +z; `k` scales it (1 is 13 cm across). */
export function skull(box: Box, base: THREE.Matrix4, k = 1): void {
  box("bone", .13 * k, .11 * k, .14 * k, within(base, 0, .055 * k, 0));
  box("bone", .09 * k, .04 * k, .1 * k, within(base, 0, .02 * k, .03 * k));
  box("dark", .1 * k, .03 * k, .02 * k, within(base, 0, .07 * k, .075 * k));
}

/** Where a wall-hung piece's back is: the wall's surface, half a cell from the cell's centre. */
export const WZ = -1;

/** The yaw that puts a piece's back against the wall on that side. */
export const WALL_ROT = { n: 0, e: -Math.PI / 2, s: Math.PI, w: Math.PI / 2 } as const;
export type Side = keyof typeof WALL_ROT;
/** The cell offset of a side. */
export const SIDE_D: Record<Side, readonly [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };

/** The material table, built inside a function: every entry is a factory, and none runs until a piece asks for it. */
function materials(): Record<string, () => THREE.Material> {
  const lambert = (map: THREE.Texture | undefined, color?: number): THREE.MeshLambertMaterial =>
    new THREE.MeshLambertMaterial(color === undefined ? { map } : { map, color });
  const basic = (color: number): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color });
  return {
    // the prologue's set, verbatim from `Decor.ts` before the split
    stone: () => new THREE.MeshLambertMaterial({ map: TEX.churchWall, color: 0xa4a6ae }),
    wood: () => new THREE.MeshLambertMaterial({ map: TEX.wood }),
    bark: () => new THREE.MeshLambertMaterial({ map: TEX.wood, color: 0x6e6258 }),
    bone: () => new THREE.MeshLambertMaterial({ color: 0xc9bea2 }),
    iron: () => new THREE.MeshLambertMaterial({ color: 0x34302c }),
    wrought: () => new THREE.MeshLambertMaterial({ color: 0x1a1816 }),
    ember: () => new THREE.MeshBasicMaterial({ map: TEX.hellWall, color: 0xffa060, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false }),
    slab: () => new THREE.MeshLambertMaterial({ map: DRESSTEX.bridgeStone || TEX.stair, color: 0x7a6e68 }),
    // the fire's light on the stone above it: the bridge's lit edges
    glow: () => new THREE.MeshBasicMaterial({ color: 0xff6a1c, transparent: true, opacity: .55,
      blending: THREE.AdditiveBlending, depthWrite: false }),
    earth: () => new THREE.MeshLambertMaterial({ map: DRESSTEX.yardEarth || TEX.dungeonFloor, color: 0x6e5c4c }),
    grass: () => new THREE.MeshLambertMaterial({ color: 0x2c3120 }),
    // the kit's own
    rock: () => lambert(TEX.dungeonWall, 0x8e9090),
    // dark with age, tar and damp: a decor crate is never the pale new wood of the `x` crate a player shoots
    crate: () => lambert(TEX.wood, 0x4e453c),
    blood: () => new THREE.MeshLambertMaterial({ color: 0x4a0e0c }),
    canvas: () => new THREE.MeshLambertMaterial({ color: 0x5c5a48 }),
    straw: () => lambert(DRESSTEX.straw || TEX.wood),
    cloth: () => lambert(DRESSTEX.banner || TEX.wood),
    brass: () => new THREE.MeshLambertMaterial({ color: 0x8a6a2a }),
    clay: () => new THREE.MeshLambertMaterial({ color: 0x6e4c36 }),
    flame: () => basic(0xffc060),
    glass: () => basic(0x565c9a),
    dark: () => basic(0x020202),
    rustplate: () => lambert(DRESSTEX.rust || TEX.pillar, 0xc8c0b8),
    pipe: () => lambert(DRESSTEX.rust || TEX.pillar, 0x7c8a74),
    slate: () => lambert(TEX.pillar, 0xb8b8c4),
    marble: () => new THREE.MeshLambertMaterial({ color: 0x9a968c }),
    sludge: () => lambert(DRESSTEX.sludge || TEX.dungeonFloor),
    led: () => basic(0xff3a20),
    flesh: () => lambert(TEX.fleshWall, 0x9a5a68),
    wart: () => new THREE.MeshLambertMaterial({ color: 0xc8a878 }),
    sinew: () => new THREE.MeshLambertMaterial({ color: 0x4a1c24 }),
    pod: () => new THREE.MeshLambertMaterial({ color: 0xc09a7c }),
    eyewhite: () => new THREE.MeshLambertMaterial({ color: 0xd6cdb8 }),
    iris: () => new THREE.MeshLambertMaterial({ color: 0xb08a1a }),
    // the light-bearing pieces' own glow (`lamps.ts`): unlit, so a lamp reads as lit from any distance the fog allows
    lampgreen: () => basic(0xc4e070),
    lampwhite: () => basic(0xfff2cc),
    lampamber: () => basic(0xffb454),
    coal: () => basic(0xff7a28),
    glowflesh: () => basic(0xff8a72),
    brick: () => lambert(TEX.dungeonWall, 0x6e5a4e),
  };
}

export function makeMat(name: string): THREE.Material {
  const make = materials()[name];
  if (!make) throw new Error("decor: no material called " + name);
  return make();
}

/** Every material name a piece may ask for (the tests hold each piece to this list). */
export const MATERIAL_NAMES: readonly string[] = Object.keys(materials());
