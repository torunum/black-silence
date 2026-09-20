import { emptyGrid, link, put, putAbs } from "../LevelBuilder";
import type { RoomLayout } from "../LevelBuilder";

/**
 * LEVEL 3 — THE NECROPOLIS.
 * Copied from reference/sonsurum.html lines 437-518, with one deliberate
 * divergence from the frozen master (player feedback round 2, KNOWN-11):
 * the **three** tiles the author wrote as armour are `r`, not `A`. `A` is
 * the armour key in `loadLevel`'s item map *and* the Mancubus in
 * `ENEMY_DEFS`, and the enemy arm is checked first, so each of them spawned
 * a 260 hp enemy instead of +50 armour. Level 3 therefore has no Mancubus —
 * none was ever authored here, or anywhere.
 */
export function buildLevel3(): RoomLayout {
  const L=emptyGrid(4,4,7,5);
  /* ring + cross circulation through the bone-yard */
  link(L,[0,0],[1,0],"door");
  link(L,[1,0],[2,0],"door");
  link(L,[2,0],[3,0],"door");
  link(L,[0,0],[0,1],"door");
  link(L,[3,0],[3,1],"door");
  link(L,[0,1],[1,1],"door");
  link(L,[3,1],[2,1],"door");
  link(L,[0,1],[0,2],"door");
  link(L,[3,1],[3,2],"door");
  link(L,[3,2],[3,3],"secret");        // -> hidden charnel reliquary
  link(L,[0,2],[0,3],"door");
  link(L,[0,2],[1,2],"door");
  link(L,[3,2],[2,2],"door");
  /* GREAT TOMB: merge (1,1)(2,1)(1,2)(2,2) — boss arena */
  link(L,[1,1],[2,1],"open");link(L,[1,1],[1,2],"open");
  link(L,[2,1],[2,2],"open");link(L,[1,2],[2,2],"open");
  link(L,[1,0],[1,1],"locked");        // sealed sepulchre doors (red key)
  link(L,[1,2],[1,3],"door");
  link(L,[1,3],[2,3],"door");
  link(L,[2,3],[2,2],"door");
  /* tomb pillars (sarcophagus colonnade) */
  putAbs(L,16,12,"I");
  put(L,1,1,1,1,"I");put(L,2,1,5,1,"I");put(L,1,2,1,3,"I");put(L,2,2,5,3,"I");
  put(L,1,1,1,4,"I");put(L,2,1,5,4,"I");
  /* GREAT TOMB contents — sovereign throne + sarcophagi */
  put(L,1,1,3,1,"F");put(L,2,1,3,1,"F");put(L,1,2,3,4,"F");put(L,2,2,3,4,"F");
  putAbs(L,16,20,"Z");                 // THE BONE SOVEREIGN waits on the throne
  put(L,1,1,0,0,"i");put(L,2,1,6,0,"i");put(L,1,2,0,4,"i");put(L,2,2,6,4,"i");
  put(L,1,1,5,4,"O");put(L,2,2,1,4,"O");
  /* (0,0) ossuary gate — player arrives */
  put(L,0,0,1,1,"P");put(L,0,0,5,3,"l");put(L,0,0,6,0,"i");put(L,0,0,3,4,"x");
  /* (1,0) bone hall */
  put(L,1,0,2,2,"m");put(L,1,0,5,1,"y");put(L,1,0,1,4,"l");put(L,1,0,6,4,"h");put(L,1,0,4,3,"F");
  /* (2,0) gravewardens */
  put(L,2,0,2,2,"k");put(L,2,0,5,1,"s");put(L,2,0,1,4,"a");put(L,2,0,0,0,"i");put(L,2,0,4,3,"x");
  /* (3,0) embalming chamber */
  put(L,3,0,3,2,"o");put(L,3,0,1,1,"T");put(L,3,0,5,1,"R");put(L,3,0,6,3,"F");put(L,3,0,1,4,"h");put(L,3,0,0,0,"l");
  /* (0,1) west colonnade */
  put(L,0,1,2,2,"f");put(L,0,1,5,3,"R");put(L,0,1,1,4,"l");put(L,0,1,0,0,"i");put(L,0,1,5,1,"g");
  /* (3,1) east colonnade — MINIBOSS guardian + red key */
  put(L,3,1,3,2,"U");put(L,3,1,6,4,"K");put(L,3,1,1,1,"g");put(L,3,1,1,4,"k");put(L,3,1,0,0,"i");
  /* (0,2) crypt of ash */
  put(L,0,2,2,1,"w");put(L,0,2,4,3,"w");put(L,0,2,1,4,"y");put(L,0,2,6,0,"h");put(L,0,2,0,0,"i");
  /* (0,3) lower vault */
  put(L,0,3,3,2,"r");put(L,0,3,1,1,"l");put(L,0,3,5,1,"a");put(L,0,3,3,4,"b");put(L,0,3,5,3,"f");
  /* (1,3) processional way */
  put(L,1,3,2,2,"k");put(L,1,3,5,1,"z");put(L,1,3,1,1,"l");put(L,1,3,5,4,"l");put(L,1,3,3,3,"b");
  /* (2,3) reliquary stair */
  put(L,2,3,2,1,"m");put(L,2,3,5,3,"y");put(L,2,3,3,2,"r");put(L,2,3,0,4,"i");put(L,2,3,6,0,"a");
  /* (3,2) catacomb deep — MINIBOSS executioner returns */
  put(L,3,2,3,2,"E");put(L,3,2,1,1,"x");put(L,3,2,1,4,"x");put(L,3,2,6,3,"b");put(L,3,2,0,0,"i");
  /* (3,3) SECRET charnel reliquary */
  put(L,3,3,3,2,"c");put(L,3,3,1,1,"c");put(L,3,3,5,1,"r");put(L,3,3,3,4,"h");put(L,3,3,1,3,"o");put(L,3,3,5,3,"l");
  /* (1,2) merged tomb — single barrel */
  put(L,1,2,6,0,"O");
  /* bone-lattice windows on tomb walls + outer */
  [[9,7],[9,11],[9,15],[23,7],[23,11],[23,15]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  [[11,0],[16,0],[21,0]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  /* ===== VERTICAL TOMB (Hexen-style tiers) =====
     GREAT TOMB spans x:9..23, z:7..17. Raised perimeter ledges with a
     sunken sovereign pit, plus four stepped sarcophagus daises to climb. */
  const hm=Array.from({length:L.H},()=>Array(L.W).fill(0));
  const sH=(x0: number,z0: number,x1: number,z1: number,h: number)=>{for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)
    if(L.g[z]&&L.g[z][x]&&"#WI".indexOf(L.g[z][x])<0)hm[z][x]=h;};
  sH(9,7,23,17,1.2);            // raised colonnade walk around the tomb
  sH(9,7,23,7,2.3);sH(9,17,23,17,2.3);   // high north/south galleries to snipe from
  sH(12,9,20,15,0);            // sunken sovereign pit
  sH(11,9,11,15,0.6);sH(21,9,21,15,0.6); // step into the pit
  sH(12,8,20,8,0.6);sH(12,16,20,16,0.6);
  // stepped daises (climbable sarcophagus platforms) in the pit corners
  sH(13,10,14,11,0.8);sH(18,10,19,11,0.8);
  sH(13,13,14,14,0.8);sH(18,13,19,14,0.8);
  // ramps from the door thresholds
  const rmp=(x: number,z: number,dx: number,dz: number)=>{for(let i=0;i<3;i++){const cx=x+dx*i,cz=z+dz*i;
    if(L.g[cz]&&"#WI".indexOf(L.g[cz][cx])<0)hm[cz][cx]=Math.min(hm[cz][cx],i*0.55);}};
  rmp(12,7,0,1);rmp(20,7,0,1);rmp(12,17,0,-1);rmp(20,17,0,-1);
  L.hmap=hm;
  /* ===== VAULTED CEILING over the GREAT TOMB =====
     The inverse of the tiering above: where the floor sinks into the
     sovereign pit the vault climbs, so the tomb reads as one tall chamber
     stepping down to the 3.4 corridors around it, instead of the whole
     necropolis sharing one flat lid. Three tiers, deliberately modest —
     this is the mechanism's demonstration, not Phase 4's hand-carved shape.

     Cells are absolute world-y, and a 0 means "whatever this level already
     had" (WALLH), exactly as a 0 in `hm` above means the base floor.

     Solid cells are skipped, and that is load-bearing rather than tidy: a
     wall, pillar or door mesh is WALLH tall, so raising the ceiling over one
     would open a gap above it that you could see the sky through. Left at
     the default, the riser strip between such a cell and its raised
     neighbour becomes the clerestory wall above the tomb's arcade. */
  const cmp=Array.from({length:L.H},()=>Array(L.W).fill(0));
  const sC=(x0: number,z0: number,x1: number,z1: number,h: number)=>{for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)
    if(L.g[z]&&L.g[z][x]&&"#WI+DS".indexOf(L.g[z][x])<0)cmp[z][x]=h;};
  sC(9,7,23,17,5.2);            // the arcade walk and its north/south galleries
  sC(11,9,21,15,7.0);           // over the pit's rim, where the floor drops away
  sC(13,10,19,14,8.6);          // the vault's crown, directly over the sovereign
  L.cmap=cmp;
  return L;
}
