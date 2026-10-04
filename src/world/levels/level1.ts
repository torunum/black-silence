import { aperture, blankGrid, carve, hall, pillarsRing, put1 } from "../LevelBuilder";
import type { DecorSpec, Grid } from "../LevelBuilder";
import { dressLevel1 } from "./dress1";

/**
 * Simple, flat, single-level layout. Asymmetric room shapes and sizes,
 * but ONE floor height everywhere — no galleries, no pits, no balconies,
 * no jutting diagonal walls. Clean and easy to read.
 * Copied verbatim from reference/sonsurum.html lines 314-374 — the grid. The set dressing on top of it
 * (`decor`: the torture hall, the chancel, the store; solid masses among it) is this project's,
 * a deliberate divergence from the reference (levels-feel-full plan, Task 2): see `dress1.ts`.
 */
export function buildLevel1(): { g: Grid; W: number; H: number; decor: DecorSpec[] } {
  const W=44,H=36;
  const L=blankGrid(W,H);const g=L.g;

  // --- START CHAMBER (small, southwest) ---
  carve(g,3,28,11,33);
  g[31][5]="P";
  put1(g,6,29,"i");put1(g,10,29,"i");   // the reference put an ammo box and a health pack here, at the spawn (see the hall below)

  // --- ENTRY CORRIDOR (narrow, dog-legs up to the great hall) ---
  hall(g,9,30,9,24,1);            // north out of start
  hall(g,9,24,16,24,1);          // east jog
  g[27][9]="+";                  // door from start area

  // --- GREAT HALL (big, central, asymmetric, flat floor) ---
  carve(g,14,8,32,26);
  pillarsRing(g,16,11,30,23,4);  // pillars for cover & sightlines

  // --- EAST WING (medium room, offset, connected by a wide opening) ---
  carve(g,34,12,41,22);
  for(let z=14;z<=20;z++)g[z][33]=".";   // wide opening (melts into the hall)
  g[13][33]="I";g[21][33]="I";           // framed by pillars
  put1(g,37,14,"m");put1(g,40,18,"g");put1(g,35,21,"o");put1(g,38,21,"x");

  // --- NORTH VESTRY (small) with the RED KEY, guarded ---
  carve(g,18,2,28,7);
  g[7][22]="+";                          // door into the hall
  g[4][23]="K";                          // the red key
  put1(g,19,3,"U");                      // a guardian miniboss
  aperture(g,20,7,"W");aperture(g,26,7,"W"); // windows: see the key room from the hall

  // --- WEST ROOM (same floor, opens into the hall via windows) ---
  carve(g,9,12,13,22);
  for(let z=14;z<=20;z+=2)aperture(g,14,z,"W");
  hall(g,11,22,11,24,1);
  put1(g,10,13,"j");put1(g,12,20,"a");put1(g,10,17,"h");

  // --- SECRET ALCOVE (hidden behind a secret door off the east wing) ---
  carve(g,38,24,42,27);
  g[23][40]="S";                          // secret door
  // `r`, not `A`: `A` is also the Mancubus in ENEMY_DEFS and loadLevel checks
  // the enemy table first, so this reward cache spawned a 260 hp enemy for the
  // whole life of the game. KNOWN-11.
  put1(g,40,25,"r");put1(g,41,26,"c");put1(g,39,26,"2");  // armor, cross, shotgun

  // --- SOUTH HALL to the EXIT (long, narrow, opposite corner from start) ---
  hall(g,30,26,30,31,1);
  carve(g,27,31,35,35);
  g[33][31]="X";                          // exit pad, far southeast
  put1(g,28,32,"z");put1(g,34,34,"z");put1(g,31,34,"l");
  g[30][26]="+";                          // door from hall to south hall

  // --- populate the hall with a proper fight ---
  put1(g,17,12,"z");put1(g,29,12,"f");put1(g,16,22,"g");put1(g,30,22,"m");
  put1(g,23,18,"t");put1(g,24,13,"z");put1(g,22,24,"f");put1(g,31,19,"s");
  // torches for atmosphere along the hall
  put1(g,15,9,"i");put1(g,31,9,"i");put1(g,15,25,"i");put1(g,31,25,"i");
  put1(g,23,8,"l");

  // --- pickup and prop moves (levels-feel-full plan, Task 2; argued in dress1.ts) ---
  // The reference set a bullets box (4,32) and a health pack (9,32) at the spawn, where a player is at full
  // health with a full magazine, and put nothing in the hall, eight enemies and no supply. They are at
  // the hall's south rim now, beside the entrance from the west corridor, the first place a fight is lost.
  // Both stay in the same run of the level's scan order (no enemy is between the old cell and the new one),
  // so the loader hands every enemy the same seeded draws it always did.
  put1(g,19,25,"a");put1(g,26,25,"h");
  // Two barrels in the hall: the fight had nothing in it to shoot but the enemies.
  put1(g,28,16,"O");put1(g,26,21,"O");

  return {...L,decor:dressLevel1(L)};
}
