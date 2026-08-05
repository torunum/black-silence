import { emptyGrid, link, put, putAbs } from "../LevelBuilder";
import type { RoomLayout } from "../LevelBuilder";

/**
 * LEVEL 4 — THE GRAVEYARD.
 * Copied verbatim from reference/sonsurum.html lines 520-578.
 */
export function buildLevel4(): RoomLayout {
  const L=emptyGrid(4,4,7,5);
  /* open graveyard — many through-routes between plots */
  link(L,[0,0],[1,0],"open");
  link(L,[1,0],[2,0],"door");
  link(L,[2,0],[3,0],"open");
  link(L,[0,0],[0,1],"door");
  link(L,[3,0],[3,1],"door");
  link(L,[0,1],[1,1],"open");
  link(L,[1,1],[2,1],"door");
  link(L,[2,1],[3,1],"open");
  link(L,[0,1],[0,2],"door");
  link(L,[3,1],[3,2],"door");
  link(L,[3,2],[3,3],"secret");        // -> mausoleum reliquary
  link(L,[0,2],[0,3],"open");
  link(L,[0,2],[1,2],"door");
  link(L,[2,2],[3,2],"open");
  /* CHAPEL YARD: merge (1,1)(2,1)(1,2)(2,2) — boss arena */
  link(L,[1,1],[1,2],"open");link(L,[2,1],[2,2],"open");link(L,[1,2],[2,2],"open");
  link(L,[1,0],[1,1],"locked");        // iron cemetery gate (red key)
  link(L,[1,2],[1,3],"door");
  link(L,[1,3],[2,3],"open");
  link(L,[2,3],[2,2],"door");
  /* yard headstones (pillars) + open-air feel */
  put(L,1,1,1,1,"I");put(L,2,1,5,1,"I");put(L,1,2,1,3,"I");put(L,2,2,5,3,"I");
  putAbs(L,16,12,"I");
  /* graves & the GRAVEDIGGER boss */
  put(L,1,1,2,1,"F");put(L,2,1,4,1,"F");put(L,1,2,2,4,"F");put(L,2,2,4,4,"F");
  putAbs(L,16,20,"N");                 // THE GRAVEDIGGER waits among the plots
  put(L,1,1,0,0,"i");put(L,2,1,6,0,"i");put(L,1,2,0,4,"i");put(L,2,2,6,4,"i");
  put(L,1,1,6,4,"O");put(L,2,2,0,4,"O");
  /* (0,0) lychgate — player enters */
  put(L,0,0,1,1,"P");put(L,0,0,5,3,"l");put(L,0,0,6,0,"i");put(L,0,0,3,4,"x");
  /* (1,0) potter's field */
  put(L,1,0,2,2,"z");put(L,1,0,5,1,"z");put(L,1,0,1,4,"l");put(L,1,0,6,4,"h");put(L,1,0,4,3,"F");
  /* (2,0) open plots */
  put(L,2,0,2,2,"f");put(L,2,0,5,1,"g");put(L,2,0,1,4,"a");put(L,2,0,4,3,"x");
  /* (3,0) gravekeeper's shed */
  put(L,3,0,3,2,"o");put(L,3,0,1,1,"T");put(L,3,0,5,1,"m");put(L,3,0,6,3,"F");put(L,3,0,1,4,"h");put(L,3,0,0,0,"l");
  /* (0,1) weeping row */
  put(L,0,1,2,2,"s");put(L,0,1,5,3,"f");put(L,0,1,1,4,"l");put(L,0,1,0,0,"i");
  /* (3,1) east plots — GUARDIAN miniboss + red key */
  put(L,3,1,3,2,"U");put(L,3,1,6,4,"K");put(L,3,1,1,1,"g");put(L,3,1,1,4,"m");put(L,3,1,0,0,"i");
  /* (0,2) sunken graves */
  put(L,0,2,2,1,"w");put(L,0,2,4,3,"w");put(L,0,2,1,4,"z");put(L,0,2,6,0,"h");put(L,0,2,0,0,"i");
  /* (0,3) pauper trench */
  put(L,0,3,3,2,"A");put(L,0,3,1,1,"l");put(L,0,3,5,1,"a");put(L,0,3,3,4,"b");put(L,0,3,5,3,"f");
  /* (1,3) funeral path */
  put(L,1,3,2,2,"s");put(L,1,3,5,1,"z");put(L,1,3,1,1,"l");put(L,1,3,5,4,"l");put(L,1,3,3,3,"b");
  /* (2,3) cenotaph */
  put(L,2,3,2,1,"m");put(L,2,3,5,3,"m");put(L,2,3,3,2,"A");put(L,2,3,0,4,"i");put(L,2,3,6,0,"a");
  /* (3,2) crypt mouth — EXECUTIONER miniboss */
  put(L,3,2,3,2,"E");put(L,3,2,1,1,"x");put(L,3,2,1,4,"x");put(L,3,2,6,3,"b");put(L,3,2,0,0,"i");
  /* (3,3) SECRET mausoleum reliquary */
  put(L,3,3,3,2,"7");put(L,3,3,1,1,"9");put(L,3,3,5,1,"A");put(L,3,3,3,4,"h");put(L,3,3,1,3,"9");
  /* outer iron-fence gaps as windows */
  [[11,0],[16,0],[21,0],[11,24],[21,24]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  return L;
}
