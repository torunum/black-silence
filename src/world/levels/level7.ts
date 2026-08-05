import { emptyGrid, link, put, putAbs } from "../LevelBuilder";
import type { RoomLayout } from "../LevelBuilder";

/**
 * LEVEL 7 — THE WOMB.
 * Copied verbatim from reference/sonsurum.html lines 701-758.
 */
export function buildLevel7(): RoomLayout {
  const L=emptyGrid(4,4,7,5);
  /* intestinal warren — winding organic passages */
  link(L,[0,0],[1,0],"door");
  link(L,[1,0],[2,0],"open");
  link(L,[2,0],[3,0],"door");
  link(L,[0,0],[0,1],"open");
  link(L,[3,0],[3,1],"door");
  link(L,[0,1],[1,1],"door");
  link(L,[3,1],[2,1],"open");
  link(L,[0,1],[0,2],"door");
  link(L,[3,1],[3,2],"door");
  link(L,[3,2],[3,3],"secret");        // gland cyst (secret)
  link(L,[0,2],[0,3],"open");
  link(L,[0,2],[1,2],"door");
  link(L,[2,2],[3,2],"open");
  /* THE GREAT VENTRICLE: merge (1,1)(2,1)(1,2)(2,2) — boss arena */
  link(L,[1,1],[2,1],"open");link(L,[1,1],[1,2],"open");
  link(L,[2,1],[2,2],"open");link(L,[1,2],[2,2],"open");
  link(L,[1,0],[1,1],"locked");        // valve (red key)
  link(L,[1,2],[1,3],"door");
  link(L,[1,3],[2,3],"open");
  link(L,[2,3],[2,2],"door");
  /* fleshy columns (cartilage pillars) + THE LIVING HEART boss */
  put(L,1,1,1,1,"I");put(L,2,1,5,1,"I");put(L,1,2,1,3,"I");put(L,2,2,5,3,"I");
  putAbs(L,16,12,"I");
  putAbs(L,16,20,"G");                 // THE LIVING HEART (G boss key)
  put(L,1,1,0,0,"i");put(L,2,1,6,0,"i");put(L,1,2,0,4,"i");put(L,2,2,6,4,"i");
  /* (0,0) the maw — player enters */
  put(L,0,0,1,1,"P");put(L,0,0,5,3,"l");put(L,0,0,6,0,"i");put(L,0,0,3,4,"t");
  /* (1,0) gullet — bloats and draggers */
  put(L,1,0,2,2,"t");put(L,1,0,5,1,"w");put(L,1,0,1,4,"l");put(L,1,0,6,4,"h");put(L,1,0,4,3,"t");
  /* (2,0) bile junction — cacodemons drift */
  put(L,2,0,2,2,"C");put(L,2,0,5,1,"z");put(L,2,0,1,4,"a");put(L,2,0,4,3,"L");
  /* (3,0) gland — mancubus + slugs */
  put(L,3,0,3,2,"o");put(L,3,0,1,1,"A");put(L,3,0,5,1,"m");put(L,3,0,1,4,"h");put(L,3,0,0,0,"l");
  /* (0,1) artery hall — sprinters */
  put(L,0,1,2,2,"f");put(L,0,1,5,3,"f");put(L,0,1,1,4,"l");put(L,0,1,0,0,"i");
  /* (2,1) lung sac */
  put(L,2,1,3,2,"9");put(L,2,1,1,1,"t");put(L,2,1,5,3,"s");put(L,2,1,6,0,"a");
  /* (3,1) nerve cluster — GUARDIAN miniboss + red key */
  put(L,3,1,3,2,"U");put(L,3,1,6,4,"K");put(L,3,1,1,1,"L");put(L,3,1,1,4,"j");put(L,3,1,0,0,"i");
  /* (0,2) stomach pit — bile pools (toxic) */
  put(L,0,2,2,1,"t");put(L,0,2,4,3,"t");put(L,0,2,1,4,"z");put(L,0,2,6,0,"h");put(L,0,2,0,0,"i");
  /* (0,3) SECRET marrow cyst */
  put(L,0,3,3,2,"c");put(L,0,3,1,1,"0");put(L,0,3,5,1,"A");put(L,0,3,3,4,"h");put(L,0,3,1,3,"9");
  /* (1,3) lower bowel */
  put(L,1,3,2,2,"n");put(L,1,3,5,1,"w");put(L,1,3,1,1,"l");put(L,1,3,5,4,"l");put(L,1,3,3,3,"b");
  /* (2,3) cloaca */
  put(L,2,3,2,1,"t");put(L,2,3,5,3,"C");put(L,2,3,3,2,"A");put(L,2,3,0,4,"i");put(L,2,3,6,0,"a");
  /* (3,2) heart valve — EXECUTIONER miniboss */
  put(L,3,2,3,2,"E");put(L,3,2,1,1,"t");put(L,3,2,1,4,"t");put(L,3,2,6,3,"b");put(L,3,2,0,0,"i");
  /* (3,3) gland cyst (secret) */
  put(L,3,3,3,2,"c");put(L,3,3,1,1,"A");put(L,3,3,5,1,"c");put(L,3,3,3,4,"h");put(L,3,3,5,3,"l");
  /* pulsing sphincter "windows" (membrane openings) */
  [[9,7],[9,15],[23,7],[23,15],[16,0]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  return L;
}
