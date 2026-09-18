import { emptyGrid, link, put, putAbs } from "../LevelBuilder";
import type { RoomLayout } from "../LevelBuilder";

/**
 * LEVEL 2 — THE ABANDONED CHURCH.
 * Copied from reference/sonsurum.html lines 376-434, with one deliberate
 * divergence from the frozen master (player feedback round 1, task 1).
 *
 * ## The eight `V` tiles are now eight `v` tiles
 *
 * The reference writes this level's church furniture as `V`. `V` is also THE
 * FACTORY FOREMAN in `ENEMY_DEFS` — 2600 hp, `boss`, `priest`, `sovereign` —
 * and `loadLevel` dispatches the enemy table before the prop table, so every
 * one of them spawned a boss instead of a bench: 8 x 2600 = 20,800 hp of
 * furniture standing between the player and this level's actual boss. That is
 * KNOWN-4, and the project owner walked into it and reported it.
 *
 * All eight are furniture. Six were already labelled as such by the comment
 * they sit under. The chapel one (2,0) and the side-aisle one (0,1) were
 * judged the same way rather than swept along with them, on three grounds:
 *
 * 1. A chapel and a side aisle are the two other rooms in a church that hold
 *    benches. Both already carry their own encounter — the chapel two `z`, the
 *    aisle an `m` and a `t` — which is what the author staffed them with.
 * 2. `V`'s death runs `bossDeath`'s `if(e.key==="V")` arm: the FOREMAN
 *    achievement, the message "THE FOREMAN GOES DARK — A WET TUNNEL OPENS
 *    BELOW", and `openExit()`. A Foreman anywhere in level 2 therefore opens
 *    the level's exit — the one the Corrupted Priest's death is supposed to
 *    open — and lets the player skip `Q` entirely. Whatever the author meant
 *    by these tiles, they did not mean that.
 * 3. A factory foreman in a church is not this level's roster, and `V` is
 *    level 6's boss, where THE FACTORY is.
 *
 * So level 2 has **no Foreman at all**, and `Q` at the altar is its boss
 * again, which is what `putAbs(L,16,20,"Q")`'s own comment always said.
 *
 * `v` is a new prop-only spelling of the same pew geometry, added in
 * `spawnProp`. The dispatch order is untouched — see the comment on it.
 */
export function buildLevel2(): RoomLayout {
  const L=emptyGrid(4,4,7,5);
  /* ring circulation */
  link(L,[0,0],[1,0],"door");
  link(L,[1,0],[2,0],"door");
  link(L,[2,0],[3,0],"door");
  link(L,[3,0],[3,1],"door");
  link(L,[3,1],[3,2],"door");
  link(L,[3,2],[3,3],"door");
  link(L,[3,3],[2,3],"door");
  link(L,[2,3],[1,3],"door");
  link(L,[0,0],[0,1],"door");
  link(L,[0,1],[0,2],"door");
  link(L,[0,2],[0,3],"secret");       // reliquary
  /* NAVE: merge (1,1)(2,1)(1,2)(2,2) — boss arena */
  link(L,[1,1],[2,1],"open");link(L,[1,1],[1,2],"open");
  link(L,[2,1],[2,2],"open");link(L,[1,2],[2,2],"open");
  link(L,[1,0],[1,1],"locked");       // grand doors (red key)
  link(L,[1,3],[1,2],"locked");       // south doors (red key)
  /* nave pillars */
  putAbs(L,16,12,"I");
  put(L,1,1,1,1,"I");put(L,2,1,5,1,"I");put(L,1,2,1,3,"I");put(L,2,2,5,3,"I");
  put(L,1,1,1,4,"I");put(L,2,1,5,4,"I");
  /* nave pews + altar + boss + cross launcher */
  put(L,1,1,3,1,"v");put(L,1,1,3,3,"v");put(L,2,1,3,1,"v");put(L,2,1,3,3,"v");
  put(L,1,2,3,0,"v");put(L,2,2,3,0,"v");
  put(L,1,2,5,4,"l");put(L,2,2,1,4,"l");
  putAbs(L,16,20,"Q");                 // the Corrupted Priest waits at the altar
  putAbs(L,16,21,"6");                 // Holy Cross Launcher on the altar
  put(L,1,1,0,0,"i");put(L,2,1,6,0,"i");put(L,1,2,0,4,"i");put(L,2,2,6,4,"i");
  /* (1,0) narthex — player arrives */
  put(L,1,0,3,1,"P");put(L,1,0,1,3,"l");put(L,1,0,5,3,"l");put(L,1,0,0,0,"i");
  /* (0,0) bell tower base — sniper nest */
  put(L,0,0,3,2,"5");put(L,0,0,1,1,"o");put(L,0,0,5,1,"o");put(L,0,0,3,4,"F");put(L,0,0,0,0,"i");
  /* (2,0) chapel */
  put(L,2,0,2,2,"z");put(L,2,0,5,1,"z");put(L,2,0,1,4,"l");put(L,2,0,6,4,"h");put(L,2,0,4,3,"v");
  /* (3,0) priest chambers — PIANO */
  put(L,3,0,3,2,"p");put(L,3,0,1,1,"T");put(L,3,0,5,1,"C");put(L,3,0,6,3,"F");put(L,3,0,1,4,"h");put(L,3,0,0,0,"l");
  /* (3,1) sacristy */
  put(L,3,1,3,2,"A");put(L,3,1,1,1,"a");put(L,3,1,5,1,"f");put(L,3,1,1,3,"f");put(L,3,1,5,4,"F");
  /* (3,2) catacombs east — GUARDIAN + red key */
  put(L,3,2,3,2,"U");put(L,3,2,6,4,"K");put(L,3,2,1,1,"g");put(L,3,2,1,4,"g");put(L,3,2,0,0,"i");
  /* (3,3) ossuary */
  put(L,3,3,2,2,"o");put(L,3,3,4,2,"c");put(L,3,3,1,1,"x");put(L,3,3,5,3,"x");put(L,3,3,3,4,"l")
  /* (2,3) crypt */
  put(L,2,3,2,1,"z");put(L,2,3,5,3,"m");put(L,2,3,3,2,"h");put(L,2,3,0,4,"i");
  /* (1,3) ritual room */
  put(L,1,3,2,2,"t");put(L,1,3,5,1,"s");put(L,1,3,1,1,"l");put(L,1,3,5,4,"l");put(L,1,3,3,3,"b");put(L,1,3,6,0,"b");
  /* (0,1) side aisle */
  put(L,0,1,2,2,"m");put(L,0,1,5,3,"t");put(L,0,1,1,4,"b");put(L,0,1,0,0,"i");put(L,0,1,4,1,"v");
  /* (0,2) catacombs west */
  put(L,0,2,2,1,"w");put(L,0,2,4,3,"w");put(L,0,2,1,4,"z");put(L,0,2,6,0,"h");put(L,0,2,0,0,"i");
  /* (0,3) SECRET reliquary */
  put(L,0,3,3,2,"4");put(L,0,3,1,1,"c");put(L,0,3,5,1,"c");put(L,0,3,3,4,"A");put(L,0,3,1,3,"l");put(L,0,3,5,3,"l");
  /* stained glass windows on nave walls + outer church walls */
  [[9,7],[9,11],[9,15],[23,7],[23,11],[23,15]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  [[11,0],[16,0],[21,0]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  return L;
}
