import { emptyGrid, link, put, putAbs } from "../LevelBuilder";
import type { RoomLayout } from "../LevelBuilder";

/**
 * LEVEL 6 — THE FACTORY.
 * Copied verbatim from reference/sonsurum.html lines 640-700.
 */
export function buildLevel6(): RoomLayout {
  const L=emptyGrid(4,4,7,5);
  /* industrial grid — catwalks and machine halls */
  link(L,[0,0],[1,0],"door");
  link(L,[1,0],[2,0],"open");
  link(L,[2,0],[3,0],"door");
  link(L,[0,0],[0,1],"open");
  link(L,[3,0],[3,1],"door");
  link(L,[0,1],[1,1],"door");
  link(L,[3,1],[2,1],"door");
  link(L,[0,1],[0,2],"door");
  link(L,[3,1],[3,2],"open");
  link(L,[3,2],[3,3],"secret");        // control-room reliquary
  link(L,[0,2],[0,3],"open");
  link(L,[0,2],[1,2],"door");
  link(L,[2,2],[3,2],"door");
  /* FOUNDRY FLOOR: merge (1,1)(2,1)(1,2)(2,2) — boss arena */
  link(L,[1,1],[2,1],"open");link(L,[1,1],[1,2],"open");
  link(L,[2,1],[2,2],"open");link(L,[1,2],[2,2],"open");
  link(L,[1,0],[1,1],"locked");        // blast door (red key)
  link(L,[1,2],[1,3],"door");
  link(L,[1,3],[2,3],"open");
  link(L,[2,3],[2,2],"door");
  /* machine columns + the FOREMAN boss */
  put(L,1,1,1,1,"I");put(L,2,1,5,1,"I");put(L,1,2,1,3,"I");put(L,2,2,5,3,"I");
  putAbs(L,16,12,"I");
  put(L,1,1,2,1,"O");put(L,2,1,4,1,"O");put(L,1,2,2,4,"O");put(L,2,2,4,4,"O"); // fuel barrels
  putAbs(L,16,20,"V");                 // THE FACTORY FOREMAN (V boss key)
  put(L,1,1,0,0,"i");put(L,2,1,6,0,"i");put(L,1,2,0,4,"i");put(L,2,2,6,4,"i");
  /* (0,0) loading dock — player enters */
  put(L,0,0,1,1,"P");put(L,0,0,5,3,"l");put(L,0,0,6,0,"i");put(L,0,0,3,4,"x");
  /* (1,0) conveyor hall — CACODEMONS float in */
  put(L,1,0,2,2,"C");put(L,1,0,5,1,"L");put(L,1,0,1,4,"l");put(L,1,0,6,4,"h");put(L,1,0,4,3,"O");
  /* (2,0) press room */
  put(L,2,0,2,2,"j");put(L,2,0,5,1,"j");put(L,2,0,1,4,"a");put(L,2,0,4,3,"x");
  /* (3,0) furnace control */
  put(L,3,0,3,2,"o");put(L,3,0,1,1,"A");put(L,3,0,5,1,"m");put(L,3,0,6,3,"O");put(L,3,0,1,4,"h");put(L,3,0,0,0,"l");
  /* (0,1) pipe gallery — LOST SOULS */
  put(L,0,1,2,2,"L");put(L,0,1,5,3,"L");put(L,0,1,1,4,"l");put(L,0,1,0,0,"i");
  /* (2,1) assembly */
  put(L,2,1,3,2,"3");put(L,2,1,1,1,"j");put(L,2,1,5,3,"n");put(L,2,1,6,0,"a");
  /* (3,1) reactor walk — GUARDIAN miniboss + red key */
  put(L,3,1,3,2,"U");put(L,3,1,6,4,"K");put(L,3,1,1,1,"L");put(L,3,1,1,4,"j");put(L,3,1,0,0,"i");
  /* (0,2) coolant pit */
  put(L,0,2,2,1,"n");put(L,0,2,4,3,"j");put(L,0,2,1,4,"C");put(L,0,2,6,0,"h");put(L,0,2,0,0,"i");
  /* (0,3) SECRET maintenance cache */
  put(L,0,3,3,2,"6");put(L,0,3,1,1,"c");put(L,0,3,5,1,"A");
  put(L,0,3,3,4,"h");put(L,0,3,1,3,"l");
  /* (1,3) lower assembly */
  put(L,1,3,2,2,"n");put(L,1,3,5,1,"j");put(L,1,3,1,1,"l");put(L,1,3,5,4,"l");put(L,1,3,3,3,"b");
  /* (2,3) slag sump */
  put(L,2,3,2,1,"A");put(L,2,3,5,3,"C");put(L,2,3,3,2,"h");
  put(L,2,3,0,4,"i");put(L,2,3,6,0,"a");
  /* (3,2) smelter — EXECUTIONER miniboss */
  put(L,3,2,3,2,"E");put(L,3,2,1,1,"O");put(L,3,2,1,4,"O");put(L,3,2,6,3,"b");put(L,3,2,0,0,"i");
  /* (3,3) overseer reliquary (secret) */
  put(L,3,3,3,2,"8");put(L,3,3,1,1,"0");put(L,3,3,5,1,"0");put(L,3,3,3,4,"h");put(L,3,3,5,3,"A");
  /* grated windows */
  [[9,7],[9,15],[23,7],[23,15],[16,0]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  return L;
}
