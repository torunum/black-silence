import { solidAt } from "../../world/Collision";
import { explodeBarrel, breakProp, type Prop } from "../../world/Props";
import { world } from "../../world/WorldState";

/**
 * Locomotion — the single movement primitive enemies use to step toward or
 * away from a target: wall collision, and (for bosses/the "B" boss key)
 * smashing through props instead of being blocked by them. Moved verbatim
 * from `src/legacy.js` (formerly lines 162-173, Task 10;
 * `reference/sonsurum.html`'s equivalent section).
 *
 * `moveEnemy` was originally slated for `src/enemies/ai/Behaviors.ts`
 * alongside `enemyTick`, both in the plan and the first version of this
 * task's brief. That split is circular, the same failure shape as Task 9's:
 * `enemyTick` calls `priestThink`/`wakeBoss`/`roarFor`
 * (`src/enemies/Boss.ts`), so `Behaviors -> Boss`; and `priestThink` calls
 * `moveEnemy` (formerly `legacy.js:415,445`), so `Boss -> Behaviors` if
 * `moveEnemy` stayed there too — `madge --circular` (a hard gate in
 * `npm test`) forbids it.
 *
 * `moveEnemy` gets this file to itself instead: a true leaf whose only
 * calls are to already-migrated modules — `solidAt`
 * (`src/world/Collision.ts`), `explodeBarrel`/`breakProp`
 * (`src/world/Props.ts`) and `world` (`src/world/WorldState.ts`) — shared
 * by two callers in different files (`Behaviors.ts`'s `enemyTick`,
 * `Boss.ts`'s `priestThink`). It earns its own file over folding into
 * `Perception.ts`: it is locomotion, not perception, and misnaming it would
 * cost more than one extra file does.
 *
 * The enemy parameter (`e`) is left untyped, matching the convention
 * `src/enemies/Damage.ts`/`Death.ts` established for the same dynamic,
 * not-yet-settled object (see `src/world/WorldState.ts`'s own doc comment).
 * `world.props`'s elements need a cast to do arithmetic/pass them to
 * `explodeBarrel`/`breakProp`; reusing `Props.ts`'s exported `Prop` (its own
 * doc comment invites exactly this, and `src/player/Interact.ts` already
 * does the same) avoids inventing a second ad hoc prop shape.
 */

export function moveEnemy(e, sx, sz, spd, dt) {
  const smash=e.boss||e.key==="B";
  const nx=e.x+sx*spd*dt,nz=e.z+sz*spd*dt,rr=e.r;
  for(const p of world.props as unknown as Prop[]){if(p.dead||p.kind==="piano")continue;
    if(Math.hypot(nx-p.x,nz-p.z)<rr+p.r){
      if(smash){p.explosive?explodeBarrel(p):breakProp(p);}
      else return false;}}
  const bx=[[rr,0],[-rr,0],[0,rr],[0,-rr]].some(([ox,oz])=>solidAt(nx+ox,e.z+oz));
  if(!bx)e.x=nx;else return false;
  const bz=[[rr,0],[-rr,0],[0,rr],[0,-rr]].some(([ox,oz])=>solidAt(e.x+ox,nz+oz));
  if(!bz)e.z=nz;else return false;
  return true;}
