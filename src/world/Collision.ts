import { world } from "./WorldState";
import { CELL, WALLH } from "./Grid";

/**
 * Collision and geometry queries — the seven functions every other system
 * asks "is this point solid", "how tall is the floor here", "what's the
 * wall's normal" and "can this circle move here" through. Moved verbatim
 * from `src/legacy.js`'s "HITSCAN"/"Each seg…" section (formerly lines
 * 230-268, `solidAt` originally just above the section's own comment
 * header) and from the PLAYER section (`collides`, formerly ~1254);
 * `reference/sonsurum.html` lines 2080-2120 and 3604-3610.
 *
 * This is a clean leaf: every function here reads only `world` (grid,
 * doors, heightMap, wallSegs, props) and this module's own `R`, and calls
 * only each other — none calls into WEAPONS, ENEMY AI, DAMAGE/DEATH or any
 * other not-yet-moved system. None of the seven reads `player` either,
 * despite `distToSeg`'s parameters being named `px_`/`pz_` — every
 * coordinate arrives as a plain argument from the caller.
 *
 * `hitscan` and `crossExplode` share legacy.js's old HITSCAN section but do
 * NOT move here — they call `WEAPONS`-section functions (`explodeBarrel`,
 * `breakProp`, `WEAPONS[...]`) and are Task 6's, where moving them out of
 * this section is what breaks the `WEAPONS <-> COLLISION` cycle. Until
 * then they stay in legacy.js and import back from here.
 *
 * `world.wallSegs`/`world.props` are typed loosely (`Record<string,
 * unknown>[]`) in WorldState.ts until LevelLoader/Props (Task 5) settle
 * their real element shapes. `distToSeg`/`segBlocked`/`segsCrossRay` and
 * `collides` need numeric `x1/z1/x2/z2` and `x/z/r` fields to do arithmetic
 * on them, so this module casts through the small local `Seg`/`CollProp`
 * shapes below rather than changing WorldState.ts's declared field types —
 * that settling is Task 5's call, not this task's.
 */

interface Seg {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

interface CollProp {
  x: number;
  z: number;
  r: number;
  dead?: unknown;
}

/** Player collision radius. Read only by collides(); moves with it. */
const R=.35;

export function solidAt(wx: number,wz: number){
  const gx=wx/CELL|0,gz=wz/CELL|0;
  const row=world.grid[gz];if(!row)return true;
  const ch=row[gx];if(ch===undefined)return true;
  if(ch==="#"||ch==="I"||ch==="W")return true;
  if(ch==="+"||ch==="D"||ch==="S"){const d=world.doors[gx+","+gz];return d&&!d.open;}
  return false;}

/* ===== arbitrary (non-orthogonal) wall segments — the Doom/Blood look =====
   Each seg: {x1,z1,x2,z2}. Rendered as angled wall meshes; collided against
   with a point-to-segment distance test; line-of-sight blocked by crossing. */
export function distToSeg(px_: number, pz_: number, s: Seg): number {
  const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz;
  let t=L2?((px_-s.x1)*dx+(pz_-s.z1)*dz)/L2:0;t=Math.max(0,Math.min(1,t));
  const cx=s.x1+t*dx,cz=s.z1+t*dz;
  return Math.hypot(px_-cx,pz_-cz);}

export function segBlocked(x: number, z: number, rad: number): boolean {
  for(const s of world.wallSegs as unknown as Seg[])if(distToSeg(x,z,s)<rad)return true;
  return false;}

export function segsCrossRay(ax: number, az: number, bx: number, bz: number): boolean { // does player->target ray cross any wall segment?
  for(const s of world.wallSegs as unknown as Seg[]){
    const d1x=bx-ax,d1z=bz-az,d2x=s.x2-s.x1,d2z=s.z2-s.z1;
    const den=d1x*d2z-d1z*d2x;if(Math.abs(den)<1e-6)continue;
    const t=((s.x1-ax)*d2z-(s.z1-az)*d2x)/den;
    const u=((s.x1-ax)*d1z-(s.z1-az)*d1x)/den;
    if(t>=0&&t<=1&&u>=0&&u<=1)return true;}
  return false;}

/* per-cell floor height (0 = base). Lets us build raised galleries,
   balconies and sunken courtyards you can look/shoot down into. */
export function floorHeightAt(wx: number,wz: number){
  if(!world.heightMap)return 0;
  const gx=wx/CELL|0,gz=wz/CELL|0;
  const row=world.heightMap[gz];if(!row)return 0;
  return row[gx]||0;}

/* per-cell ceiling height (WALLH = the height every level had before
   `world.ceilMap` existed). The sibling of floorHeightAt above, and the
   *single* home of the "a falsy cell means the default" rule — the ceiling
   geometry builder (`src/world/Ceiling.ts`) reads cells through
   `ceilHeightAtCell` rather than indexing `world.ceilMap` itself, so what is
   drawn and what things that fly are clamped against cannot drift apart.

   This is deliberately NOT a replacement for `WALLH` everywhere. `WALLH` is
   two questions wearing one constant: "how tall is the wall/door/pillar
   here" — which this task does not change — and "where is the ceiling above
   this point", which is this. Doors are the sharp case: `doorTick` sinks a
   door by its own mesh height, so coupling that to the ceiling would break
   doors under any raised vault. See this task's report for the per-site
   decision. */
export function ceilHeightAtCell(gx: number,gz: number){
  if(!world.ceilMap)return WALLH;
  const row=world.ceilMap[gz];if(!row)return WALLH;
  return row[gx]||WALLH;}

export function ceilHeightAt(wx: number,wz: number){
  return ceilHeightAtCell(wx/CELL|0,wz/CELL|0);}

export function wallNormal(x: number,z: number,dir: { x: number; z: number }){
  if(!solidAt(x-dir.x*.13,z))return{x:-Math.sign(dir.x),z:0};
  if(!solidAt(x,z-dir.z*.13))return{x:0,z:-Math.sign(dir.z)};
  return{x:-dir.x,z:-dir.z};}

export function collides(x: number, z: number): boolean {
  for(const[ox,oz]of[[R,R],[R,-R],[-R,R],[-R,-R],[R,0],[-R,0],[0,R],[0,-R]])
    if(solidAt(x+ox,z+oz))return true;
  if(world.wallSegs.length&&segBlocked(x,z,R+.05))return true;
  for(const p of world.props as unknown as CollProp[]){if(p.dead)continue;
    if(Math.hypot(x-p.x,z-p.z)<p.r+R)return true;}
  return false;}
