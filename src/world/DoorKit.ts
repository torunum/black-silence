import * as THREE from "three";
import { TEX } from "../render/ProcTextures";
import { DOORTEX } from "../render/DoorTextures";
import { track } from "../render/DisposeRegistry";
import type { DoorKind } from "../audio/sounds/doors";

/**
 * THE GREAT DOORS — one per level theme, built from boxes, cylinders and one
 * extruded stone arch (the transitions plan,
 * `docs/superpowers/plans/2026-10-05-transitions.md`). A level ends at one and
 * the next begins at another; `src/world/ExitDoor.ts` finds the wall for it
 * and places it, `src/world/Transition.ts` walks the camera through it. This
 * file knows only the door itself, in its own frame.
 *
 * ## The frame of a door
 *
 * Origin on the floor at the middle of the wall face, `+z` out into the room,
 * `+x` across. The frame is a shallow porch `PORCH` deep standing proud of the
 * wall (the wall is an instanced box that cannot be cut, so the door is built
 * in front of it, not into it); the opening is `w` wide and `h` tall; the
 * leaves hang inside the porch and the dark beyond them is a plane flush
 * against the wall. Never much wider than the cell it stands in (`CELL` = 2).
 *
 * ## Two groups, because the shadow policy is by name
 *
 * `group` ("exitDoor" / "entranceDoor") is the solid door, and casts and
 * takes the lamp's shadow like any door. `glow` ("doorGlow") is everything
 * that is only light — the bloom in the opening, the lit threshold, the
 * light in the crack between the leaves, the tomb's sigil — unlit, additive,
 * casting and taking nothing (`src/render/Shadows.ts`). A sealed exit
 * (its boss still alive) has the glow hidden; an unsealed one shows it.
 *
 * ## How each opens (`pose`) — every way is hidden by the porch it moves into
 *
 * swing (iron, church, cemetery, sluice): leaves on their hinges, into the room;
 * slide (tomb): two slabs apart, behind blocks of the facade;
 * roll (freight): the leaf coils up under the lintel;
 * iris (sphincter): two lips draw back to the ring;
 * sink (crypt): the slab into the floor, as the game's own doors go.
 *
 * Nothing here draws from `Math.random`: a door is the same every build.
 */

export type DoorStyle = "crypt" | "iron" | "church" | "tomb" | "cemetery" | "sluice" | "freight" | "sphincter";
export const DOOR_STYLES: readonly DoorStyle[] = ["crypt", "iron", "church", "tomb", "cemetery", "sluice", "freight", "sphincter"];
export type OpenMove = "swing" | "slide" | "roll" | "iris" | "sink";

export interface StyleSpec {
  /** Clear opening, world units. */
  w: number; h: number;
  /** Height of a pointed arch above the leaves (0 = square head). */
  rise: number;
  move: OpenMove;
  /** The colour of the way on. */
  glow: number;
  /** The sound the door makes opening (`src/audio/sounds/doors.ts`). */
  sound: DoorKind;
  /** What the player calls it, for the hint. */
  name: string;
}

export const STYLES: Readonly<Record<DoorStyle, StyleSpec>> = {
  crypt:     { w: 1.4, h: 2.3, rise: 0,   move: "sink",  glow: 0x8fb4e8, sound: "stone",  name: "THE CRYPT DOOR" },
  iron:      { w: 1.4, h: 2.4, rise: 0,   move: "swing", glow: 0xff9238, sound: "gate",   name: "THE IRON DOOR" },
  church:    { w: 1.4, h: 2.0, rise: 0.8, move: "swing", glow: 0xffd890, sound: "stone",  name: "THE CHURCH DOORS" },
  tomb:      { w: 1.0, h: 2.3, rise: 0,   move: "slide", glow: 0x7cf0b0, sound: "secret", name: "THE TOMB GATE" },
  cemetery:  { w: 1.2, h: 2.5, rise: 0,   move: "swing", glow: 0xa8c8ff, sound: "gate",   name: "THE CEMETERY GATE" },
  sluice:    { w: 1.3, h: 2.2, rise: 0,   move: "swing", glow: 0x88c040, sound: "gate",   name: "THE SLUICE DOOR" },
  freight:   { w: 1.7, h: 2.4, rise: 0,   move: "roll",  glow: 0xffc040, sound: "gate",   name: "THE FREIGHT DOOR" },
  sphincter: { w: 1.1, h: 2.2, rise: 0,   move: "iris",  glow: 0xff5040, sound: "flesh",  name: "THE WOMB'S MOUTH" },
};

/** The door a level wears, by the same `sub` string the level table carries. */
export function styleFor(def: { sub?: string; hell?: boolean; flesh?: boolean }): DoorStyle {
  switch (def.sub) {
    case "hell": return "crypt";
    case "dungeon": return "iron";
    case "church": return "church";
    case "necropolis": return "tomb";
    case "graveyard": return "cemetery";
    case "sewers": return "sluice";
    case "factory": return "freight";
    case "womb": return "sphincter";
    default: return def.hell ? "crypt" : def.flesh ? "sphincter" : "iron";
  }
}

/** How deep the porch stands off the wall, and the width of a jamb. */
export const PORCH = 0.34, JAMB = 0.28;

interface Leaf { node: THREE.Object3D; side: -1 | 0 | 1; home: THREE.Vector3 }

/** A built door, in its own frame, ready to be placed and posed. */
export interface Rig {
  style: DoorStyle;
  spec: StyleSpec;
  group: THREE.Group;
  glow: THREE.Group;
  leaves: Leaf[];
  /** Spun with the opening (the sluice's wheel). */
  wheel: THREE.Object3D | null;
  /** The light in the crack, shown only while the door is nearly shut. */
  seam: THREE.Object3D[];
  /** 0 shut .. 1 open. */
  open: number;
}

const lambert = (map: THREE.Texture | undefined, color = 0xffffff): THREE.MeshLambertMaterial =>
  track(new THREE.MeshLambertMaterial(map ? { map, color } : { color }));
const basic = (color: number, map?: THREE.Texture, additive = false): THREE.MeshBasicMaterial =>
  track(new THREE.MeshBasicMaterial({
    color, map, transparent: additive || !!map, depthWrite: !additive, side: THREE.DoubleSide,
    ...(additive ? { blending: THREE.AdditiveBlending, opacity: .9 } : {}),
  }));

/** A box with its texture tiled at the wall's density (one tile a `CELL` across, one a `WALLH` up), not stretched. */
export function slab(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, tile = true): THREE.Mesh {
  const g = track(new THREE.BoxGeometry(w, h, d));
  if (tile) {
    const uv = g.attributes.uv, dims: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
      const j = f * 4 + i;
      uv.setXY(j, uv.getX(j) * dims[f][0] / 2, uv.getY(j) * dims[f][1] / 3.4);
    }
  }
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  return m;
}

/**
 * The opening's outline, grown by `grow` all round: a rectangle with a square
 * head, or with a pointed one (two arcs of radius R centred on the opposite
 * side of the axis, meeting at the apex).
 */
function outline(s: StyleSpec, grow = 0): THREE.Shape {
  const a = s.w / 2 + grow, sh = new THREE.Shape();
  sh.moveTo(-a, 0); sh.lineTo(a, 0); sh.lineTo(a, s.h);
  if (s.rise > 0) {
    const r = s.rise + grow, R = (a * a + r * r) / (2 * a), cx = a - R, top = Math.acos(-cx / R);
    for (let i = 1; i <= 8; i++) { const t = top * (1 - i / 8); sh.lineTo(cx + R * Math.cos(t), s.h + R * Math.sin(t)); }
    for (let i = 7; i >= 1; i--) { const t = top * (1 - i / 8); sh.lineTo(-(cx + R * Math.cos(t)), s.h + R * Math.sin(t)); }
  } else sh.lineTo(0, s.h + grow);
  sh.lineTo(-a, s.h); sh.lineTo(-a, 0);
  return sh;
}

/** The stone surround of a pointed opening, extruded the porch's depth: one piece, the opening cut out of it. */
function archFrame(s: StyleSpec, mat: THREE.Material): THREE.Mesh {
  const outer = outline(s, JAMB);
  outer.holes.push(outline(s));
  return new THREE.Mesh(track(new THREE.ExtrudeGeometry(outer, { depth: PORCH, bevelEnabled: false })), mat);
}

function ring(r: number, tube: number, mat: THREE.Material, x: number, y: number, z: number, arc = Math.PI * 2): THREE.Mesh {
  const m = new THREE.Mesh(track(new THREE.TorusGeometry(r, tube, 5, 14, arc)), mat);
  m.position.set(x, y, z);
  return m;
}

function post(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(track(new THREE.CylinderGeometry(r, r, h, 6)), mat);
  m.position.set(x, y, z);
  return m;
}

/** A small flame on a stem: lit but throwing no light. A sconce, a candle. It burns whether the way on is open or not. */
function flame(color: number, x: number, y: number, z: number, stem: THREE.Material, into: THREE.Group, size = .1): void {
  into.add(post(.025, y - .15, stem, x, (y - .15) / 2, z));
  const f = new THREE.Mesh(track(new THREE.BoxGeometry(size, size * 1.7, size)), basic(color));
  f.position.set(x, y, z); into.add(f);
}

/** A bare light: one lit box. */
function lamp(color: number, w: number, h: number, d: number, x: number, y: number, z: number, into: THREE.Group): void {
  const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), basic(color));
  m.position.set(x, y, z); into.add(m);
}

/** Builds the door `style` in its own frame; `name` is the scene name of its solid group. */
export function buildRig(style: DoorStyle, name: string): Rig {
  const s = STYLES[style], g = new THREE.Group(), gl = new THREE.Group();
  g.name = name; gl.name = "doorGlow";
  const rig: Rig = { style, spec: s, group: g, glow: gl, leaves: [], wheel: null, seam: [], open: 0 };
  const hw = s.w / 2, top = s.h + s.rise;
  const stone = lambert(TEX.churchWall, 0x9a9aa4), rock = lambert(TEX.dungeonWall, 0x9a9a9a);
  const steel = lambert(undefined, 0x2e3633), iron = lambert(undefined, 0x1c1a18), gilt = lambert(undefined, 0x9c8a4a);

  // ---- the surround
  const jambs = (mat: THREE.Material, jw = JAMB, extra = 0): void => {
    for (const sd of [-1, 1]) g.add(slab(jw, s.h + extra, PORCH, mat, sd * (hw + jw / 2), (s.h + extra) / 2, PORCH / 2));
  };
  const lintel = (mat: THREE.Material, lh = .34, at = s.h): void => { g.add(slab(s.w + 2 * JAMB, lh, PORCH, mat, 0, at + lh / 2, PORCH / 2)); };
  const basalt = lambert(DOORTEX.tomb, 0x9a9aa4);
  switch (style) {
    case "church": g.add(archFrame(s, stone)); break;
    case "crypt": jambs(stone, JAMB, .5); lintel(stone, .5, s.h); g.add(slab(s.w + 2 * JAMB + .2, .16, PORCH + .1, stone, 0, s.h + .58, PORCH / 2)); break;
    case "iron": jambs(rock); lintel(rock); break;
    case "tomb": {
      // the facade is the whole cell wide: a block either side of the opening for the slabs to slide behind
      const bw = 1 - hw;
      for (const sd of [-1, 1]) g.add(slab(bw, s.h + .35, PORCH, basalt, sd * (hw + bw / 2), (s.h + .35) / 2, PORCH / 2));
      g.add(slab(s.w, .35, PORCH, basalt, 0, s.h + .175, PORCH / 2));
      break;
    }
    case "cemetery":
      for (const sd of [-1, 1]) {
        g.add(slab(.4, 2.9, .4, stone, sd * (hw + .2), 1.45, .2));
        g.add(slab(.5, .14, .5, stone, sd * (hw + .2), 2.97, .2));
      }
      g.add(ring(hw + .02, .035, iron, 0, s.h - .3, .2, Math.PI)); g.children[g.children.length - 1].scale.set(1, .5, 1);
      break;
    case "sluice": jambs(steel, .3, .4); lintel(steel, .4, s.h); break;
    case "freight": jambs(steel, .12, .38); lintel(lambert(DOORTEX.hazard), .38, s.h); break;
    case "sphincter": {
      const lip = lambert(TEX.fleshWall, 0xd8b0a8), sy = (r: number): number => (s.h / 2 + .1) / r;
      const r1 = ring(hw + .1, .26, lip, 0, s.h / 2, .08); r1.scale.set(1, sy(hw + .1), 1.1); g.add(r1);
      const r2 = ring(hw + .34, .16, lip, 0, s.h / 2, .02); r2.scale.set(1, sy(hw + .34), 1); g.add(r2);
      break;
    }
  }
  if (style !== "sphincter" && style !== "cemetery") g.add(slab(s.w + 2 * JAMB + .12, .05, PORCH + .22, stone, 0, .025, (PORCH + .22) / 2));

  // ---- the dark beyond, and the light in it (church: the pointed head is the frame's, the planes just sit behind it)
  const plane = (): THREE.PlaneGeometry => track(new THREE.PlaneGeometry(s.w + .02, top));
  const hole = new THREE.Mesh(plane(), basic(0x020202)); hole.position.set(0, top / 2, .02); g.add(hole);
  const bloom = new THREE.Mesh(plane(), basic(s.glow, DOORTEX.glow, true)); bloom.position.set(0, top / 2, .03); gl.add(bloom);
  const pool = new THREE.Mesh(track(new THREE.PlaneGeometry(s.w * 2.2, 2.4)), basic(s.glow, DOORTEX.glow, true));
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, .035, 1.0); gl.add(pool);

  // ---- the leaves
  const leafZ = PORCH - .1, T = .09;
  const addLeaf = (node: THREE.Object3D, side: -1 | 0 | 1, x: number, y = 0): void => {
    node.position.set(x, y, leafZ); g.add(node); rig.leaves.push({ node, side, home: node.position.clone() });
  };
  /** A leaf `w` x `h`, its flat face to +z, centred `ox` from the node; the node stands on the floor (or hangs from the top for a roll). */
  const panel = (w: number, h: number, mat: THREE.Material, ox: number, hung = false): THREE.Group => {
    const grp = new THREE.Group(), m = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, T)), mat);
    m.position.set(ox, hung ? -h / 2 : h / 2, 0); grp.add(m);
    return grp;
  };
  if (style === "iron" || style === "church") {
    const mat = style === "iron" ? lambert(TEX.door) : lambert(DOORTEX.church);
    for (const sd of [-1, 1] as const) {
      const lf = panel(hw - .01, s.h, mat, -sd * (hw - .01) / 2);
      lf.add(ring(.06, .016, style === "iron" ? iron : gilt, -sd * (hw - .12), s.h * .5, T / 2 + .01));
      addLeaf(lf, sd, sd * hw);
    }
  } else if (style === "tomb") {
    for (const sd of [-1, 1] as const) addLeaf(panel(hw, s.h, lambert(DOORTEX.tomb), 0), sd, sd * hw / 2);
  } else if (style === "sphincter") {
    const mat = lambert(TEX.fleshDoor, 0xe0b8b0);
    for (const sd of [-1, 1] as const) {
      const lip = new THREE.Mesh(track(new THREE.CircleGeometry(1, 16, sd > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI)), mat);
      lip.scale.set(hw, s.h / 2, 1); lip.position.set(-sd * hw, s.h / 2, 0);   // its curved edge on the node, which stands on the ring
      const grp = new THREE.Group(); grp.add(lip); addLeaf(grp, sd, sd * hw);
    }
  } else if (style === "crypt") {
    addLeaf(panel(s.w - .02, s.h, lambert(DOORTEX.crypt), 0), 0, 0);
  } else if (style === "sluice") {
    const lf = panel(s.w - .02, s.h, lambert(DOORTEX.sluice), -(s.w - .02) / 2);
    const wheel = new THREE.Group(); wheel.position.set(-(s.w - .02) / 2, s.h * .5, T / 2 + .03);
    wheel.add(ring(.26, .03, iron, 0, 0, 0));
    for (let i = 0; i < 4; i++) { const sp = slab(.52, .035, .035, iron, 0, 0, 0, false); sp.rotation.z = i * Math.PI / 4; wheel.add(sp); }
    lf.add(wheel); rig.wheel = wheel;
    addLeaf(lf, 1, hw);   // hinged on the right, swinging into the room
  } else if (style === "freight") {
    addLeaf(panel(s.w - .02, s.h, lambert(DOORTEX.freight), 0, true), 0, 0, s.h);
  } else if (style === "cemetery") {
    for (const sd of [-1, 1] as const) {
      const lf = new THREE.Group(), w = hw - .01, n = 5;
      for (const y of [.25, s.h - .4]) lf.add(slab(w, .06, .05, iron, -sd * w / 2, y, 0, false));
      for (let i = 0; i <= n; i++) {
        const x = -sd * (.03 + (w - .06) * i / n);
        lf.add(slab(.035, s.h - .1, .035, iron, x, (s.h - .1) / 2 + .05, 0, false));
        const tip = new THREE.Mesh(track(new THREE.ConeGeometry(.04, .14, 4)), iron); tip.position.set(x, s.h - .02, 0); lf.add(tip);
      }
      addLeaf(lf, sd, sd * hw);
    }
  }

  // ---- what is lit around it
  const sconce = (color: number, y: number, far: number): void => { for (const sd of [-1, 1]) flame(color, sd * far, y, .16, iron, g); };
  if (style === "iron") sconce(0xff9838, 1.9, hw + JAMB + .16);
  if (style === "crypt") sconce(0x80a8e8, 1.7, hw + JAMB + .16);
  if (style === "church") for (const sd of [-1, 1]) { g.add(post(.1, .3, gilt, sd * (hw + JAMB + .1), .15, .34)); flame(0xffe8a0, sd * (hw + JAMB + .1), .62, .34, gilt, g, .07); }
  if (style === "tomb") {
    const sig = new THREE.Mesh(track(new THREE.PlaneGeometry(.34, .34)), basic(s.glow, DOORTEX.sigil, true));
    sig.position.set(0, s.h + .175, PORCH + .01); gl.add(sig);
  }
  if (style === "cemetery") for (const sd of [-1, 1]) lamp(s.glow, .16, .22, .16, sd * (hw + .2), 3.15, .2, gl);
  if (style === "sluice") lamp(s.glow, .22, .12, .12, hw + .3, s.h + .5, .16, gl);
  if (style === "freight") { lamp(s.glow, .3, .14, .14, 0, s.h + .62, .2, gl); g.add(slab(.34, .2, .18, steel, 0, s.h + .62, .14, false)); }
  if (style === "sphincter") for (const sd of [-1, 1]) lamp(0xffa090, .14, .14, .14, sd * (hw + .5), 1.6, .1, gl);

  // ---- light through the crack, while it is shut: a bright line down the seam, along the sill, and a halo bleeding round the frame
  const seamMat = basic(s.glow, undefined, true);
  const v = new THREE.Mesh(track(new THREE.PlaneGeometry(.05, s.h)), seamMat); v.position.set(0, s.h / 2, PORCH + .02);
  const sill = new THREE.Mesh(track(new THREE.PlaneGeometry(s.w, .06)), seamMat); sill.rotation.x = -Math.PI / 2; sill.position.set(0, .04, PORCH + .1);
  const haloMat = basic(s.glow, DOORTEX.glow, true); haloMat.opacity = .6;
  const halo = new THREE.Mesh(track(new THREE.PlaneGeometry((s.w + 2 * JAMB) * 2, top + 1.1)), haloMat); halo.position.set(0, top / 2 + .25, PORCH + .03);
  rig.seam = [v, sill, halo]; gl.add(v, sill, halo);
  return rig;
}

/** Poses the door at `k` (0 shut, 1 open). */
export function pose(rig: Rig, k: number): void {
  rig.open = k;
  const s = rig.spec, hw = s.w / 2;
  for (const l of rig.leaves) {
    const n = l.node;
    n.position.copy(l.home); n.rotation.set(0, 0, 0); n.scale.set(1, 1, 1);
    if (s.move === "swing") n.rotation.y = l.side * k * 1.9;
    else if (s.move === "slide") n.position.x += l.side * k * hw;
    else if (s.move === "roll") n.scale.y = 1 - .92 * k;
    else if (s.move === "iris") n.scale.x = 1 - .94 * k;
    else n.position.y -= k * (s.h + .12);
  }
  if (rig.wheel) rig.wheel.rotation.z = k * 6;
  for (const m of rig.seam) m.visible = k < .08;
}

/** Shows or hides the light in and around the door. */
export function setLit(rig: Rig, lit: boolean): void { rig.glow.visible = lit; }
