/**
 * Level builder DSL — pure, validated offline. Two families of helpers:
 * a room-lattice builder (emptyGrid/link/put/putAbs) for grid-of-rooms
 * levels, and free-form (Doom-style) carving helpers (blankGrid/carve/
 * hall/aperture/pillarsRing/roomXZ) for hand-authored layouts. Copied
 * verbatim from the reference's BUILDER-BEGIN/BUILDER-END block.
 *
 * chars: # wall · I pillar · W window-wall · . floor
 * + door · D locked · S secret
 */

export type Grid = string[][];

export interface WallSeg { x1: number; z1: number; x2: number; z2: number; }

/**
 * What every buildX() function returns. Some carry a height map, a ceiling
 * map or wall segments.
 *
 * `hmap` and `cmap` are deliberate siblings — both `number[][]` indexed
 * `[z][x]`, both optional, both carried onto `world` by `loadLevel`
 * (`world.heightMap` / `world.ceilMap`), both read through a `…HeightAt`
 * query in `src/world/Collision.ts`. Both hold an **absolute world-y
 * height**, not an offset: `hmap`'s cell is the floor's y and `cmap`'s cell
 * is the ceiling's y, so `ceilHeightAt(x,z) - floorHeightAt(x,z)` is the
 * headroom at a point and both numbers are directly comparable to a
 * projectile's `m.position.y`. An offset would have made `cmap` the one map
 * in the pair whose numbers are not world-y, which is the kind of quiet
 * asymmetry this project keeps paying for.
 *
 * In both maps a **falsy cell means "the value this level already had"** —
 * 0 for the floor, `WALLH` for the ceiling — so `Array(W).fill(0)` is the
 * neutral base an author raises parts of, and an absent map, an absent row
 * and an absent cell all agree.
 */
export interface BuiltLevel {
  g: Grid;
  W: number;
  H: number;
  hmap?: number[][];
  cmap?: number[][];
  segs?: WallSeg[];
}

/** A BuiltLevel that also remembers its room lattice, so link()/put() can address rooms. */
export interface RoomLayout extends BuiltLevel {
  rw: number;
  rh: number;
  C: number;
  R: number;
}

/** A C×R lattice of rw×rh rooms separated by one-cell walls. */
export function emptyGrid(C: number, R: number, rw: number, rh: number): RoomLayout {
  const W=C*(rw+1)+1,H=R*(rh+1)+1;
  const g: Grid=Array.from({length:H},()=>Array(W).fill("#"));
  for(let rr=0;rr<R;rr++)for(let rc=0;rc<C;rc++){
    const x0=rc*(rw+1)+1,z0=rr*(rh+1)+1;
    for(let z=0;z<rh;z++)for(let x=0;x<rw;x++)g[z0+z][x0+x]=".";
  }
  return {g,W,H,rw,rh,C,R};
}

/** Cuts through (or places a door in) the wall shared by two adjacent rooms. */
export function link(L: RoomLayout, a: [number, number], b: [number, number], kind: "open" | "door" | "locked" | "secret"): void {
  const[ac,ar]=a,[bc,br]=b;
  if(ac===bc){
    const wz=(Math.min(ar,br)+1)*(L.rh+1),x0=ac*(L.rw+1)+1;
    if(kind==="open"){for(let x=0;x<L.rw;x++)L.g[wz][x0+x]=".";}
    else L.g[wz][x0+(L.rw>>1)]=kind==="door"?"+":kind==="locked"?"D":"S";
  }else{
    const wx=(Math.min(ac,bc)+1)*(L.rw+1),z0=ar*(L.rh+1)+1;
    if(kind==="open"){for(let z=0;z<L.rh;z++)L.g[z0+z][wx]=".";}
    else L.g[z0+(L.rh>>1)][wx]=kind==="door"?"+":kind==="locked"?"D":"S";
  }
}

/** Places ch at room (rc,rr)'s local offset (dx,dz). */
export function put(L: RoomLayout, rc: number, rr: number, dx: number, dz: number, ch: string): void {
  L.g[rr*(L.rh+1)+1+dz][rc*(L.rw+1)+1+dx]=ch;
}

/** Places ch at absolute grid coordinates. */
export function putAbs(L: { g: Grid }, x: number, z: number, ch: string): void {
  L.g[z][x]=ch;
}

/* ===== free-form (Doom-style) carving helpers ===== */

/** A blank W×H grid, entirely solid. */
export function blankGrid(W: number, H: number): { g: Grid; W: number; H: number } {
  return {g:Array.from({length:H},()=>Array(W).fill("#")),W,H};
}

/** Fills a rectangle of floor (or any char). */
export function carve(g: Grid, x0: number, z0: number, x1: number, z1: number, ch?: string): void {
  ch=ch||".";
  for(let z=Math.min(z0,z1);z<=Math.max(z0,z1);z++)
    for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)
      if(g[z]&&x>=0&&x<g[z].length)g[z][x]=ch;
}

/** An L/straight corridor of given width. */
export function hall(g: Grid, x0: number, z0: number, x1: number, z1: number, wdt?: number): void {
  wdt=wdt||1;const hw=(wdt-1>>1);
  if(Math.abs(x1-x0)>=Math.abs(z1-z0)){
    for(let w=-hw;w<=hw;w++)carve(g,x0,z0+w,x1,z0+w);
    for(let w=-hw;w<=hw;w++)carve(g,x1+w,z0,x1+w,z1);
  }else{
    for(let w=-hw;w<=hw;w++)carve(g,x0+w,z0,x0+w,z1);
    for(let w=-hw;w<=hw;w++)carve(g,x0,z1+w,x1,z1+w);}
}

/** A window/sightline opening in a wall (default stained glass). */
export function aperture(g: Grid, x: number, z: number, ch?: string): void {
  if(g[z]&&g[z][x]!==undefined)g[z][x]=ch||"W";
}

/** Pillars around a room interior for cover/sightlines. */
export function pillarsRing(g: Grid, x0: number, z0: number, x1: number, z1: number, step?: number): void {
  step=step||3;
  for(let x=x0;x<=x1;x+=step){if(g[z0])g[z0][x]="I";if(g[z1])g[z1][x]="I";}
  for(let z=z0;z<=z1;z+=step){if(g[z])g[z][x0]="I";if(g[z])g[z][x1]="I";}
}

/** Absolute (x,z) of room (rc,rr)'s local offset (dx,dz). */
export function roomXZ(L: RoomLayout, rc: number, rr: number, dx: number, dz: number): { x: number; z: number } {
  return {x:rc*(L.rw+1)+1+dx, z:rr*(L.rh+1)+1+dz};
}

/** Places ch at absolute (x,z) on a bare grid, bounds-checked. */
export function put1(g: Grid, x: number, z: number, ch: string): void {
  if(g[z]&&g[z][x]!==undefined)g[z][x]=ch;
}
