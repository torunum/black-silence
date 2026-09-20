import { emptyGrid, link, put, putAbs } from "../LevelBuilder";
import type { RoomLayout } from "../LevelBuilder";

/**
 * LEVEL 5 — THE SEWERS.
 * Copied from reference/sonsurum.html lines 579-639, with one deliberate
 * divergence from the frozen master (player feedback round 2, KNOWN-11):
 * the **three** tiles the author wrote as armour are `r`, not `A`. See
 * `level3.ts`'s header for the mechanism. Level 5 has no Mancubus.
 *
 * This level is parked to `episode2` per `docs/direction.md`, but it still
 * builds and is still tested, so it is fixed with the kept levels rather
 * than left holding a bug a future session would have to rediscover.
 */
export function buildLevel5(): RoomLayout {
  const L=emptyGrid(4,4,7,5);
  /* sewers — long tunnels, channels join chambers */
  link(L,[0,0],[1,0],"open");
  link(L,[1,0],[2,0],"open");
  link(L,[2,0],[3,0],"door");
  link(L,[0,0],[0,1],"open");
  link(L,[3,0],[3,1],"door");
  link(L,[0,1],[0,2],"open");
  link(L,[3,1],[3,2],"open");
  link(L,[3,1],[2,1],"door");
  link(L,[0,2],[1,2],"door");
  link(L,[3,2],[2,2],"door");
  link(L,[3,2],[3,3],"door");
  link(L,[0,2],[0,3],"secret");        // maintenance reliquary
  link(L,[2,3],[3,3],"open");
  /* SETTLING BASIN: merge (1,1)(2,1)(1,2)(2,2) — boss arena (the big tank) */
  link(L,[1,1],[2,1],"open");link(L,[1,1],[1,2],"open");
  link(L,[2,1],[2,2],"open");link(L,[1,2],[2,2],"open");
  link(L,[1,0],[1,1],"locked");        // pressure hatch (red key)
  link(L,[0,1],[1,1],"open");
  link(L,[1,2],[1,3],"door");
  link(L,[1,3],[2,3],"open");
  link(L,[2,2],[2,3],"door");
  /* basin catwalk supports */
  put(L,1,1,1,1,"I");put(L,2,1,5,1,"I");put(L,1,2,1,3,"I");put(L,2,2,5,3,"I");
  putAbs(L,16,12,"I");
  /* the LEVIATHAN boss in the basin + barrels (toxic runoff) */
  putAbs(L,16,20,"H");                 // THE HOLLOW LEVIATHAN rises from the sludge
  put(L,1,1,0,0,"i");put(L,2,1,6,0,"i");put(L,1,2,0,4,"i");put(L,2,2,6,4,"i");
  put(L,1,1,5,4,"O");put(L,2,2,1,4,"O");put(L,1,2,6,0,"O");
  /* (0,0) inflow grate — player enters */
  put(L,0,0,1,1,"P");put(L,0,0,5,3,"l");put(L,0,0,6,0,"i");put(L,0,0,3,4,"x");
  /* (1,0) main tunnel */
  put(L,1,0,2,2,"t");put(L,1,0,5,1,"w");put(L,1,0,1,4,"l");put(L,1,0,6,4,"h");put(L,1,0,4,3,"O");
  /* (2,0) junction */
  put(L,2,0,2,2,"t");put(L,2,0,5,1,"f");put(L,2,0,1,4,"a");put(L,2,0,4,3,"x");
  /* (3,0) pump room */
  put(L,3,0,3,2,"o");put(L,3,0,1,1,"T");put(L,3,0,5,1,"m");put(L,3,0,6,3,"O");put(L,3,0,1,4,"h");put(L,3,0,0,0,"l");
  /* (0,1) overflow */
  put(L,0,1,2,2,"w");put(L,0,1,5,3,"t");put(L,0,1,1,4,"l");put(L,0,1,0,0,"i");
  /* (2,1) valve chamber */
  put(L,2,1,3,2,"5");put(L,2,1,1,1,"f");put(L,2,1,5,3,"s");put(L,2,1,6,0,"a");
  /* (3,1) east tunnel — GUARDIAN miniboss + red key */
  put(L,3,1,3,2,"U");put(L,3,1,6,4,"K");put(L,3,1,1,1,"w");put(L,3,1,1,4,"t");put(L,3,1,0,0,"i");
  /* (0,2) drowned passage */
  put(L,0,2,2,1,"w");put(L,0,2,4,3,"t");put(L,0,2,1,4,"z");put(L,0,2,6,0,"h");put(L,0,2,0,0,"i");
  /* (0,3) SECRET maintenance reliquary */
  put(L,0,3,3,2,"6");put(L,0,3,1,1,"c");put(L,0,3,5,1,"r");put(L,0,3,3,4,"h");put(L,0,3,1,3,"l");
  /* (1,3) lower main */
  put(L,1,3,2,2,"s");put(L,1,3,5,1,"t");put(L,1,3,1,1,"l");put(L,1,3,5,4,"l");put(L,1,3,3,3,"b");
  /* (2,3) sump */
  put(L,2,3,2,1,"t");put(L,2,3,5,3,"w");put(L,2,3,3,2,"r");put(L,2,3,0,4,"i");put(L,2,3,6,0,"a");
  /* (3,2) sludge gallery — EXECUTIONER miniboss */
  put(L,3,2,3,2,"E");put(L,3,2,1,1,"O");put(L,3,2,1,4,"x");put(L,3,2,6,3,"b");put(L,3,2,0,0,"i");
  /* (3,3) outfall */
  put(L,3,3,3,2,"o");put(L,3,3,1,1,"x");put(L,3,3,5,1,"r");put(L,3,3,3,4,"h");put(L,3,3,5,3,"t");
  /* grates as windows along outer walls */
  [[9,7],[9,15],[23,7],[23,15]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  return L;
}
