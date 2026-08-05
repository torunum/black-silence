import * as THREE from "three";
import { clamp, pick, rnd } from "./utils/math";
import { MONOLOGUE as M } from "./content/monologue";
import { aperture, blankGrid, carve, emptyGrid, hall, link, pillarsRing, put, put1, putAbs, roomXZ } from "./world/LevelBuilder";
/* ============================================================
   THE BLACK SILENCE — The Hollow Parish (v3 gothic overhaul)
   2 levels · 9 enemy types + elites · 3 bosses · 6 weapons ·
   power kick · destructibles · playable piano · monologues
   ============================================================ */
const CELL=2, WALLH=3.4, EYE=1.0;

/* ============================================================
   LEVEL BUILDER (pure — validated offline)
   chars: # wall · I pillar · W window-wall · . floor
   + door · D locked · S secret
   P spawn · K key · X exit pad
   enemies z f g m t w s B · bosses E U Q
   pickups h A a b o c · weapons 2 3 4 5 6
   props x crate · T table · C chair · F shelf · V pew · O ex-barrel
   ambient i torch · l candles · p piano · Y challenge plate
   ============================================================ */
function buildPrologue(){
  /* Hand-built open map with a real rising staircase (height map).
     Layout (21 wide x 27 tall): hell cavern at the bottom (south),
     a staircase climbing north, a raised tomb chamber at the top with the exit. */
  const W=21,H=27;
  const g=Array.from({length:H},()=>Array(W).fill("#"));
  const hm=Array.from({length:H},()=>Array(W).fill(0));
  const open=(x0,z0,x1,z1)=>{for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)g[z][x]=".";};
  // hell cavern (bottom) — wide irregular hall
  open(2,17,18,25);
  // central corridor leading north to the stairs
  open(8,9,12,17);
  // the tomb chamber (top), raised up high
  open(4,2,16,8);
  // player wakes here, deep in hell
  g[23][10]="P";
  // a few props/torches in the cavern
  g[20][4]="i";g[20][16]="i";g[24][3]="x";g[24][17]="x";g[22][6]="l";g[22][14]="l";
  // no enemies here — just the climb out of the pit
  // a little starter ammo + health
  g[21][10]="a";g[25][10]="h";
  /* STAIRCASE: corridor cells z=9..16 at x=9..11 rise step by step.
     Bottom of stairs (south, z=16) = height 0, top (north, z=9) ~ 3.0 high,
     reaching the tomb floor which sits on a raised slab. */
  const stepH=0.42;
  for(let i=0;i<8;i++){
    const z=16-i;                 // 16 (bottom) -> 9 (top)
    const hgt=i*stepH;
    for(let x=9;x<=11;x++)hm[z][x]=hgt;}
  // the whole tomb chamber sits at the top height so you walk off the stairs onto it
  const topH=7*stepH;
  for(let z=2;z<=8;z++)for(let x=4;x<=16;x++)hm[z][x]=topH;
  // torches + a stone sarcophagus (prop) in the tomb, and the EXIT out of the grave
  g[3][6]="i";g[3][14]="i";g[5][6]="T";g[5][14]="T";
  g[3][10]="X";                  // climb out of the grave -> Level 1
  // a candle marking the grave mouth
  g[7][10]="l";
  return {g,W,H,hmap:hm};
}
function buildLevel1(){
  /* Simple, flat, single-level layout. Asymmetric room shapes and sizes,
     but ONE floor height everywhere — no galleries, no pits, no balconies,
     no jutting diagonal walls. Clean and easy to read. */
  const W=44,H=36;
  const L=blankGrid(W,H);const g=L.g;

  // --- START CHAMBER (small, southwest) ---
  carve(g,3,28,11,33);
  g[31][5]="P";
  put1(g,6,29,"i");put1(g,10,29,"i");put1(g,4,32,"a");put1(g,9,32,"h");

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
  put1(g,40,25,"A");put1(g,41,26,"c");put1(g,39,26,"2");  // armor, cross, shotgun

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

  return L;
}
function buildLevel2(){
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
  put(L,1,1,3,1,"V");put(L,1,1,3,3,"V");put(L,2,1,3,1,"V");put(L,2,1,3,3,"V");
  put(L,1,2,3,0,"V");put(L,2,2,3,0,"V");
  put(L,1,2,5,4,"l");put(L,2,2,1,4,"l");
  putAbs(L,16,20,"Q");                 // the Corrupted Priest waits at the altar
  putAbs(L,16,21,"6");                 // Holy Cross Launcher on the altar
  put(L,1,1,0,0,"i");put(L,2,1,6,0,"i");put(L,1,2,0,4,"i");put(L,2,2,6,4,"i");
  /* (1,0) narthex — player arrives */
  put(L,1,0,3,1,"P");put(L,1,0,1,3,"l");put(L,1,0,5,3,"l");put(L,1,0,0,0,"i");
  /* (0,0) bell tower base — sniper nest */
  put(L,0,0,3,2,"5");put(L,0,0,1,1,"o");put(L,0,0,5,1,"o");put(L,0,0,3,4,"F");put(L,0,0,0,0,"i");
  /* (2,0) chapel */
  put(L,2,0,2,2,"z");put(L,2,0,5,1,"z");put(L,2,0,1,4,"l");put(L,2,0,6,4,"h");put(L,2,0,4,3,"V");
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
  put(L,0,1,2,2,"m");put(L,0,1,5,3,"t");put(L,0,1,1,4,"b");put(L,0,1,0,0,"i");put(L,0,1,4,1,"V");
  /* (0,2) catacombs west */
  put(L,0,2,2,1,"w");put(L,0,2,4,3,"w");put(L,0,2,1,4,"z");put(L,0,2,6,0,"h");put(L,0,2,0,0,"i");
  /* (0,3) SECRET reliquary */
  put(L,0,3,3,2,"4");put(L,0,3,1,1,"c");put(L,0,3,5,1,"c");put(L,0,3,3,4,"A");put(L,0,3,1,3,"l");put(L,0,3,5,3,"l");
  /* stained glass windows on nave walls + outer church walls */
  [[9,7],[9,11],[9,15],[23,7],[23,11],[23,15]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  [[11,0],[16,0],[21,0]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  return L;
}

function buildLevel3(){
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
  put(L,0,3,3,2,"A");put(L,0,3,1,1,"l");put(L,0,3,5,1,"a");put(L,0,3,3,4,"b");put(L,0,3,5,3,"f");
  /* (1,3) processional way */
  put(L,1,3,2,2,"k");put(L,1,3,5,1,"z");put(L,1,3,1,1,"l");put(L,1,3,5,4,"l");put(L,1,3,3,3,"b");
  /* (2,3) reliquary stair */
  put(L,2,3,2,1,"m");put(L,2,3,5,3,"y");put(L,2,3,3,2,"A");put(L,2,3,0,4,"i");put(L,2,3,6,0,"a");
  /* (3,2) catacomb deep — MINIBOSS executioner returns */
  put(L,3,2,3,2,"E");put(L,3,2,1,1,"x");put(L,3,2,1,4,"x");put(L,3,2,6,3,"b");put(L,3,2,0,0,"i");
  /* (3,3) SECRET charnel reliquary */
  put(L,3,3,3,2,"c");put(L,3,3,1,1,"c");put(L,3,3,5,1,"A");put(L,3,3,3,4,"h");put(L,3,3,1,3,"o");put(L,3,3,5,3,"l");
  /* (1,2) merged tomb — single barrel */
  put(L,1,2,6,0,"O");
  /* bone-lattice windows on tomb walls + outer */
  [[9,7],[9,11],[9,15],[23,7],[23,11],[23,15]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  [[11,0],[16,0],[21,0]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  /* ===== VERTICAL TOMB (Hexen-style tiers) =====
     GREAT TOMB spans x:9..23, z:7..17. Raised perimeter ledges with a
     sunken sovereign pit, plus four stepped sarcophagus daises to climb. */
  const hm=Array.from({length:L.H},()=>Array(L.W).fill(0));
  const sH=(x0,z0,x1,z1,h)=>{for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)
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
  const rmp=(x,z,dx,dz)=>{for(let i=0;i<3;i++){const cx=x+dx*i,cz=z+dz*i;
    if(L.g[cz]&&"#WI".indexOf(L.g[cz][cx])<0)hm[cz][cx]=Math.min(hm[cz][cx],i*0.55);}};
  rmp(12,7,0,1);rmp(20,7,0,1);rmp(12,17,0,-1);rmp(20,17,0,-1);
  L.hmap=hm;
  return L;
}

function buildLevel4(){
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
function buildLevel5(){
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
  put(L,0,3,3,2,"6");put(L,0,3,1,1,"c");put(L,0,3,5,1,"A");put(L,0,3,3,4,"h");put(L,0,3,1,3,"l");
  /* (1,3) lower main */
  put(L,1,3,2,2,"s");put(L,1,3,5,1,"t");put(L,1,3,1,1,"l");put(L,1,3,5,4,"l");put(L,1,3,3,3,"b");
  /* (2,3) sump */
  put(L,2,3,2,1,"t");put(L,2,3,5,3,"w");put(L,2,3,3,2,"A");put(L,2,3,0,4,"i");put(L,2,3,6,0,"a");
  /* (3,2) sludge gallery — EXECUTIONER miniboss */
  put(L,3,2,3,2,"E");put(L,3,2,1,1,"O");put(L,3,2,1,4,"x");put(L,3,2,6,3,"b");put(L,3,2,0,0,"i");
  /* (3,3) outfall */
  put(L,3,3,3,2,"o");put(L,3,3,1,1,"x");put(L,3,3,5,1,"A");put(L,3,3,3,4,"h");put(L,3,3,5,3,"t");
  /* grates as windows along outer walls */
  [[9,7],[9,15],[23,7],[23,15]].forEach(([x,z])=>putAbs(L,x,z,"W"));
  return L;
}
function buildLevel6(){
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
function buildLevel7(){
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
const LEVELS=[
 {name:"PROLOGUE — OUT OF THE PIT",build:buildPrologue,
  fog:0x180604,fogD:.07,amb:0x6e2a14,ambI:.6,floor:"hell",sub:"hell",hell:true},
 {name:"LEVEL 1 — THE GOTHIC DUNGEON",build:buildLevel1,
  fog:0x07080b,fogD:.05,amb:0x3a4250,ambI:.5,floor:"dungeon",sub:"dungeon",dungeon:true},
 {name:"LEVEL 2 — THE ABANDONED CHURCH",build:buildLevel2,
  fog:0x0b070d,fogD:.042,amb:0x453a50,ambI:.5,floor:"church",sub:"church"},
 {name:"LEVEL 3 — THE NECROPOLIS",build:buildLevel3,
  fog:0x0a0a07,fogD:.046,amb:0x4a4636,ambI:.46,floor:"church",sub:"necropolis"},
 {name:"LEVEL 4 — THE GRAVEYARD",build:buildLevel4,
  fog:0x10120e,fogD:.04,amb:0x3e463a,ambI:.52,floor:"dungeon",sub:"graveyard"},
 {name:"LEVEL 5 — THE SEWERS",build:buildLevel5,
  fog:0x0a0e0a,fogD:.055,amb:0x36443a,ambI:.44,floor:"church",sub:"sewers"},
 {name:"LEVEL 6 — THE FACTORY",build:buildLevel6,
  fog:0x0c0a08,fogD:.05,amb:0x4a4038,ambI:.5,floor:"dungeon",sub:"factory"},
 {name:"LEVEL 7 — THE WOMB",build:buildLevel7,
  fog:0x1a0606,fogD:.06,amb:0x6e2a28,ambI:.5,floor:"flesh",sub:"womb",flesh:true},
];

/* ============================================================
   ADEM'S MOUTH — monologue data
   ============================================================ */

/* ============================================================
   GLOBAL STATE
   ============================================================ */
const S={hp:100,armor:0,key:false,dead:false,won:false,level:0,
  kills:0,gibs:0,secrets:0,secretsTotal:0,shots:0,hitsLanded:0,propsBroken:0,
  totKills:0,totGibs:0,totSecrets:0,t0:0,levelT0:0,
  ammo:{bullets:60,shells:0,slugs:0,crosses:0,nails:0,souls:0},
  mag:[6,0,0,0,0,0,0,0],weapons:[true,false,false,false,false,false,false,false],cur:0,
  kickCd:0,pianoNotes:0,ach:{}};
let started=false,inputLock=false,pianoOpen=false;

/* ============================================================
   THREE CORE
   ============================================================ */
let scene,camera,renderer,lamp,lampCore,muzzleLight,boomLight,ambLight;
camera=new THREE.PerspectiveCamera(78,4/3,.05,90);
renderer=new THREE.WebGLRenderer({canvas:document.getElementById("game"),antialias:false});
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
if(THREE.sRGBEncoding!==undefined)renderer.outputEncoding=THREE.sRGBEncoding;
function sizeRender(){const a=innerWidth/innerHeight,w=400,h=Math.round(w/a);
  renderer.setSize(w,h,false);camera.aspect=a;camera.updateProjectionMatrix();
  const c=renderer.domElement;c.style.width="100%";c.style.height="100%";}
addEventListener("resize",sizeRender);sizeRender();
let trauma=0,hitStop=0,zoomT=0;
function shake(a){trauma=Math.min(1,trauma+a);}

/* ============================================================
   TEXTURES (gothic, procedural)
   ============================================================ */
function makeTex(draw,w=64,h=64){const c=document.createElement("canvas");c.width=w;c.height=h;
  draw(c.getContext("2d"),w,h);const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;}
function noiseFill(g,w,h,base,vary,n){for(let i=0;i<n;i++){const v=(Math.random()-.5)*vary;
  g.fillStyle=`rgb(${base[0]+v|0},${base[1]+v|0},${base[2]+v|0})`;
  g.fillRect(Math.random()*w|0,Math.random()*h|0,1+Math.random()*3|0,1+Math.random()*3|0);}}
const TEX={};
function buildTextures(){
  TEX.dungeonWall=makeTex((g,w,h)=>{ // big rough stone blocks, mossy seams
    g.fillStyle="#262a2e";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[40,44,48],28,900);
    g.fillStyle="#101316";
    for(let y=0;y<h;y+=21){g.fillRect(0,y,w,3);
      for(let x=(y/21%2)*21|0;x<w;x+=42)g.fillRect(x,y,3,21);}
    g.fillStyle="rgba(46,74,40,.30)"; // moss
    for(let i=0;i<7;i++)g.fillRect(Math.random()*w|0,Math.random()*h|0,rnd(3,9),rnd(2,5));
    g.fillStyle="rgba(0,0,0,.35)";
    for(let i=0;i<4;i++){const x=Math.random()*w|0;g.fillRect(x,0,2,rnd(10,30));}});
  TEX.churchWall=makeTex((g,w,h)=>{ // pale masonry + arch shadow
    g.fillStyle="#2e2a30";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[52,46,54],24,800);
    g.fillStyle="#15121a";
    for(let y=0;y<h;y+=13){g.fillRect(0,y,w,2);
      for(let x=(y/13%2)*16|0;x<w;x+=32)g.fillRect(x,y,2,13);}
    g.strokeStyle="rgba(0,0,0,.5)";g.lineWidth=3; // pointed arch relief
    g.beginPath();g.moveTo(10,h);g.quadraticCurveTo(10,16,w/2,8);
    g.quadraticCurveTo(w-10,16,w-10,h);g.stroke();});
  TEX.window=makeTex((g,w,h)=>{ // broken stained glass in pointed arch
    g.fillStyle="#0a0b0d";g.fillRect(0,0,w,h);
    const cols=["#5a2a6e","#2a4a7e","#7e2a2a","#7e6a2a","#2a6e4a"];
    g.save();g.beginPath();
    g.moveTo(12,h);g.quadraticCurveTo(12,18,w/2,8);
    g.quadraticCurveTo(w-12,18,w-12,h);g.closePath();g.clip();
    for(let i=0;i<46;i++){g.fillStyle=pick(cols);
      g.beginPath();const x=rnd(12,w-12),y=rnd(8,h);
      g.moveTo(x,y);g.lineTo(x+rnd(-9,9),y+rnd(-9,9));g.lineTo(x+rnd(-9,9),y+rnd(-9,9));
      g.closePath();g.fill();}
    g.fillStyle="#0a0b0d"; // missing shards
    for(let i=0;i<7;i++){g.beginPath();const x=rnd(14,w-14),y=rnd(12,h-6);
      g.moveTo(x,y);g.lineTo(x+rnd(-11,11),y+rnd(-11,11));g.lineTo(x+rnd(-11,11),y+rnd(-11,11));
      g.closePath();g.fill();}
    g.strokeStyle="#000";g.lineWidth=2;
    for(let i=0;i<8;i++){g.beginPath();g.moveTo(rnd(12,w-12),8);g.lineTo(rnd(12,w-12),h);g.stroke();}
    g.restore();
    g.strokeStyle="#23262b";g.lineWidth=4;
    g.beginPath();g.moveTo(12,h);g.quadraticCurveTo(12,18,w/2,8);
    g.quadraticCurveTo(w-12,18,w-12,h);g.stroke();});
  TEX.dungeonFloor=makeTex((g,w,h)=>{g.fillStyle="#1a1c1e";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[27,29,31],18,1100);
    g.strokeStyle="#0d0e10";g.lineWidth=2;
    g.strokeRect(1,1,w-2,h-2);
    g.beginPath();g.moveTo(w/2,0);g.lineTo(w/2,h);g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();
    g.fillStyle="rgba(46,74,40,.18)";
    for(let i=0;i<4;i++)g.fillRect(Math.random()*w|0,Math.random()*h|0,rnd(2,7),rnd(2,4));});
  TEX.churchFloor=makeTex((g,w,h)=>{g.fillStyle="#1c1a20";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[30,28,34],16,900);
    g.fillStyle="#121016";g.fillRect(0,0,w/2,h/2);g.fillRect(w/2,h/2,w/2,h/2);
    noiseFill(g,w,h,[24,22,28],12,500);
    g.strokeStyle="#0a090d";g.lineWidth=2;
    g.beginPath();g.moveTo(w/2,0);g.lineTo(w/2,h);g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();});
  TEX.ceil=makeTex((g,w,h)=>{g.fillStyle="#0e1013";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[15,17,20],12,700);
    g.strokeStyle="rgba(0,0,0,.6)";g.lineWidth=3; // vault ribs
    g.beginPath();g.moveTo(0,0);g.lineTo(w,h);g.moveTo(w,0);g.lineTo(0,h);g.stroke();});
  TEX.door=makeTex((g,w,h)=>{ // iron-banded wood
    g.fillStyle="#3a2c1e";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[62,46,32],22,500);
    g.fillStyle="#241a12";
    for(let x=8;x<w;x+=12)g.fillRect(x,0,2,h);
    g.fillStyle="#23262b";g.fillRect(0,12,w,6);g.fillRect(0,h-20,w,6);
    g.fillStyle="#5c6068";
    for(let x=4;x<w;x+=12){g.fillRect(x,14,2,2);g.fillRect(x,h-18,2,2);}});
  TEX.doorLocked=makeTex((g,w,h)=>{g.fillStyle="#2e2024";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[50,36,38],20,400);
    g.fillStyle="#241a12";for(let x=8;x<w;x+=12)g.fillRect(x,0,2,h);
    g.fillStyle="#9c2f1e";
    g.beginPath();g.arc(w/2,h/2,10,0,7);g.fill();
    g.fillStyle="#000";g.beginPath();g.arc(w/2,h/2,4,0,7);g.fill();
    g.fillStyle="#9c2f1e";g.fillRect(w/2-2,h/2,4,12);});
  TEX.pillar=makeTex((g,w,h)=>{g.fillStyle="#26262c";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[42,42,48],20,500);
    g.fillStyle="rgba(0,0,0,.4)";
    for(let x=3;x<w;x+=8)g.fillRect(x,0,3,h);},32,64);
  TEX.wood=makeTex((g,w,h)=>{g.fillStyle="#3a2c1e";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[60,44,30],20,400);
    g.fillStyle="rgba(0,0,0,.3)";for(let y=4;y<h;y+=7)g.fillRect(0,y,w,2);},32,32);
  TEX.barrel=makeTex((g,w,h)=>{g.fillStyle="#5a2a18";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[96,48,30],30,500);
    g.fillStyle="#2a1410";g.fillRect(0,8,w,4);g.fillRect(0,h-12,w,4);g.fillRect(0,h/2-2,w,4);
    g.fillStyle="#a08c5a";g.fillRect(w/2-6,h/2-10,12,6);},32,40);
  /* ===== FLESH / VISCERA TEXTURES (the meat level) ===== */
  TEX.fleshWall=makeTex((g,w,h)=>{ // raw muscle wall, veins, weeping sores
    g.fillStyle="#6e1e18";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[120,40,36],34,1100);
    // sinew striations
    g.strokeStyle="rgba(40,8,8,.5)";g.lineWidth=2;
    for(let i=0;i<10;i++){g.beginPath();const x=rnd(0,w);
      g.moveTo(x,0);g.bezierCurveTo(x+rnd(-12,12),h*.33,x+rnd(-12,12),h*.66,x+rnd(-10,10),h);g.stroke();}
    // bulging veins
    g.strokeStyle="rgba(150,60,70,.55)";g.lineWidth=3;
    for(let i=0;i<5;i++){g.beginPath();const y=rnd(0,h);
      g.moveTo(0,y);g.bezierCurveTo(w*.3,y+rnd(-14,14),w*.6,y+rnd(-14,14),w,y+rnd(-8,8));g.stroke();}
    // open sores / wet highlights
    for(let i=0;i<8;i++){const x=rnd(8,w-8),y=rnd(8,h-8),r=rnd(3,9);
      g.fillStyle="rgba(30,4,6,.7)";g.beginPath();g.arc(x,y,r,0,7);g.fill();
      g.fillStyle="rgba(200,90,90,.4)";g.beginPath();g.arc(x-r*.3,y-r*.3,r*.4,0,7);g.fill();}});
  TEX.fleshFloor=makeTex((g,w,h)=>{ // glistening meat floor with pooled fluid
    g.fillStyle="#4a1410";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[90,30,28],26,1300);
    for(let i=0;i<6;i++){const x=rnd(0,w),y=rnd(0,h),r=rnd(6,16);
      g.fillStyle="rgba(20,2,4,.6)";g.beginPath();g.arc(x,y,r,0,7);g.fill();
      g.fillStyle="rgba(160,50,50,.3)";g.beginPath();g.arc(x-2,y-2,r*.5,0,7);g.fill();}
    g.strokeStyle="rgba(30,6,8,.5)";g.lineWidth=2;
    for(let i=0;i<6;i++){g.beginPath();g.moveTo(rnd(0,w),rnd(0,h));
      g.lineTo(rnd(0,w),rnd(0,h));g.stroke();}});
  TEX.fleshCeil=makeTex((g,w,h)=>{ // dripping fleshy vault
    g.fillStyle="#3a100c";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[70,24,22],20,900);
    g.fillStyle="rgba(20,2,4,.6)";
    for(let i=0;i<10;i++){const x=rnd(0,w);g.beginPath();
      g.moveTo(x,0);g.lineTo(x-3,rnd(6,18));g.lineTo(x+3,rnd(6,18));g.closePath();g.fill();}});
  TEX.fleshDoor=makeTex((g,w,h)=>{ // sphincter/membrane door, vertical seam
    g.fillStyle="#7a221a";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[140,50,46],30,600);
    // central wet seam that looks like it could part
    g.fillStyle="rgba(20,2,4,.85)";g.fillRect(w/2-3,4,6,h-8);
    g.fillStyle="rgba(190,80,80,.5)";g.fillRect(w/2-5,4,2,h-8);g.fillRect(w/2+3,4,2,h-8);
    // radial muscle fibers pulling toward the seam
    g.strokeStyle="rgba(40,8,8,.5)";g.lineWidth=2;
    for(let y=6;y<h;y+=7){g.beginPath();g.moveTo(2,y);g.lineTo(w/2-4,y+rnd(-2,2));g.stroke();
      g.beginPath();g.moveTo(w-2,y);g.lineTo(w/2+4,y+rnd(-2,2));g.stroke();}
    // sphincter ring
    g.strokeStyle="rgba(150,60,60,.5)";g.lineWidth=3;
    g.beginPath();g.ellipse(w/2,h/2,w*.32,h*.42,0,0,7);g.stroke();});
  /* ===== HELL TEXTURES (the prologue) ===== */
  TEX.hellWall=makeTex((g,w,h)=>{
    g.fillStyle="#241211";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[60,28,22],26,1000);
    g.fillStyle="#120808";
    for(let y=0;y<h;y+=18){g.fillRect(0,y,w,3);
      for(let x=(y/18%2)*18|0;x<w;x+=36)g.fillRect(x,y,3,18);}
    g.strokeStyle="rgba(255,110,30,.7)";g.lineWidth=2;
    for(let i=0;i<5;i++){g.beginPath();const x=rnd(0,w);
      g.moveTo(x,0);g.lineTo(x+rnd(-10,10),h*.4);g.lineTo(x+rnd(-12,12),h);g.stroke();}
    g.strokeStyle="rgba(255,200,80,.5)";g.lineWidth=1;
    for(let i=0;i<4;i++){g.beginPath();const y=rnd(0,h);
      g.moveTo(0,y);g.lineTo(w,y+rnd(-10,10));g.stroke();}});
  TEX.hellFloor=makeTex((g,w,h)=>{
    g.fillStyle="#1c0e0a";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[44,20,14],20,1200);
    g.strokeStyle="rgba(255,90,20,.55)";g.lineWidth=2;
    for(let i=0;i<7;i++){g.beginPath();g.moveTo(rnd(0,w),rnd(0,h));
      g.lineTo(rnd(0,w),rnd(0,h));g.stroke();}
    for(let i=0;i<5;i++){const x=rnd(0,w),y=rnd(0,h);
      g.fillStyle="rgba(255,140,40,.3)";g.beginPath();g.arc(x,y,rnd(2,5),0,7);g.fill();}});
  TEX.hellCeil=makeTex((g,w,h)=>{
    g.fillStyle="#0a0605";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[20,10,8],12,700);
    g.strokeStyle="rgba(120,40,10,.3)";g.lineWidth=2;
    g.beginPath();g.moveTo(0,0);g.lineTo(w,h);g.moveTo(w,0);g.lineTo(0,h);g.stroke();});
  TEX.stair=makeTex((g,w,h)=>{
    g.fillStyle="#2a2622";g.fillRect(0,0,w,h);
    noiseFill(g,w,h,[46,42,38],18,500);
    g.fillStyle="rgba(0,0,0,.5)";
    for(let y=0;y<h;y+=8)g.fillRect(0,y,w,2);
    g.fillStyle="rgba(255,120,40,.12)";g.fillRect(0,0,w,h);},32,32);
}

/* ============================================================
   PIXEL SPRITES — frame A + mirrored frame B for walk
   ============================================================ */
function texFromPx(px,pal,opts){
  opts=opts||{};
  const w=px[0].length,h=px.length,S=3;
  const c=document.createElement("canvas");c.width=w*S;c.height=h*S;
  const g=c.getContext("2d");
  if(opts.mirror){g.translate(w*S,0);g.scale(-1,1);}
  const masks=opts.masks||(opts.blankTop?[[0,0,w,opts.blankTop]]:null);
  const inMask=(x,y)=>{if(!masks)return false;
    for(const m of masks)if(x>=m[0]&&x<m[2]&&y>=m[1]&&y<m[3])return true;return false;};
  const at=(x,y)=>{if(y<0||y>=h||x<0||x>=px[y].length)return " ";const k=px[y][x];return (k===" "||inMask(x,y))?" ":k;};
  const lit=(hex,f)=>{if(!hex||hex[0]!=="#"||hex.length<7)return hex;
    let r=parseInt(hex.slice(1,3),16),gg=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    r=Math.max(0,Math.min(255,r+f));gg=Math.max(0,Math.min(255,gg+f));b=Math.max(0,Math.min(255,b+f));
    return "rgb("+r+","+gg+","+b+")";};
  px.forEach((row,y)=>{
    for(let x=0;x<row.length;x++){const k=row[x];if(k===" ")continue;
      if(inMask(x,y))continue;
      const base=pal[k];if(!base||base==="#00000000")continue;
      g.fillStyle=base;g.fillRect(x*S,y*S,S,S);
      // bevel: lit top/left edges, shaded bottom/right where a transparent neighbor sits -> volume
      const up=at(x,y-1)===" ",lf=at(x-1,y)===" ",dn=at(x,y+1)===" ",rt=at(x+1,y)===" ";
      if(up||lf){g.fillStyle=lit(base,30);
        if(up)g.fillRect(x*S,y*S,S,1);
        if(lf)g.fillRect(x*S,y*S,1,S);}
      if(dn||rt){g.fillStyle=lit(base,-26);
        if(dn)g.fillRect(x*S,y*S+S-1,S,1);
        if(rt)g.fillRect(x*S+S-1,y*S,1,S);}}});
  // wet red stump at torn edges
  if(opts.stumps&&masks){
    for(const m of masks){
      const sy=m[3];
      for(let x=m[0];x<m[2];x++){
        if(sy<h&&px[sy]&&px[sy][x]&&px[sy][x]!==" "){
          g.fillStyle=Math.random()<.5?"#7a190c":"#b8341c";g.fillRect(x*S,(sy-1)*S,S,S);
          g.fillStyle="#52120a";g.fillRect(x*S,sy*S,S,S);}}}}
  const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;return t;}
const PXDEF={
 z:{head:8,px:[ // ROTTING GHOUL — sunken corpse face, cracked ribcage, entrails spilling
  "     ..gGGg..      ","    .gGaaGGg.      ","    .Ge00e0Gg.     ","    .GaeeeaGg.     ",
  "    .Ga000aGg.     ","     .Gaaag.        ","      .Gjg.         ","     .GG.GG.        ",
  "    .Gg.  .gG.      ","   dd......dd      ","  d.bRbRbRb.d      "," d.RbRbRbRb.d      ",
  " d.bRb..bRb.d      "," R.Rb.HH.bR.R      "," R.bR.HH.Rb.R      ","dd.Rb....bR.dd     ",
  "  .db0000bd.        ","   .dbbbbd.         ","    .dRRd.          ","   d.iRRi.d         ",
  "   d.iRRi.d         ","    di..id          ","    di  id          ","   dd    dd         "],
  pal:{".":"#0a0b08","g":"#4a5636","G":"#324226","a":"#26301c","e":"#0e0f0a","0":"#150605",
   "j":"#8fb838","d":"#2e3320","b":"#8c9270","R":"#6e1a0e","H":"#c8583e","i":"#7a1c10"},
  atk:[ // lunging forward, jaw wide, claws reaching
  "     ..gGGg..      ","    .gGaaGGg.      ","    .Ge00e0Gg.     ","    .Gajjja0g.     ",
  "     .Gaaa.         ","    RR.Gag.RR       ","   RbR.Gg.RbR       ","  RbbR..  RbbR      ",
  "  bRb      bRb      "," dd..    ..dd       ","d.bRb.    .bRb.d    ","d.RbR.    .RbR.d    ",
  " d.b........b.d     "," R..HH....HH..R     "," R.b........b.R     ","  .db0000bd.        ",
  "   .dbbbbd.         ","    .dRRd.          ","   d.iRRi.d         ","    di..id          "],
  die1:[ // knees buckling, one arm flailing, toppling
  "                    ","      .gGGg.        ","     .Ge00e0.       ","      .Gaaag.       ",
  "  RR   .Gjg.         ","  RbR   ..    RR    "," RbbR         RbR   ","   dd    b0R  RbR   ",
  "  d.bRbRb0.   dd     "," d.RbRbRb0d          ","d.bRb..0d            ","..iRR.0d             ",
  "  .dbbbd.             ","   .dRRd.             ","    dii d             "],
  die2:[ // flat, splayed corpse
  "                          ","                          ",
  "   .gGGg.                 ","  .Ge00e0.  RbR   RbR     ",
  " ..Gaaag.. d.bRbRbRbRbRb.d","RR.Gjg.RR d.RbRbRbRbRbRb.d",
  "RbR ...  RbRd.b0000000bd.d","dd       dd  .dbbbbbbd.   ",
  "              .dRRRRd.    ","               diiiid     "]},

 f:{head:5,px:[ // FLAYED SPRINTER — skinless, crouched, jaw unhinged, claws out
  "      .RR.RR.       ","     .R00R00R.      ","    .Rb00b00bR.     ","    .RbbbRbbbR.     ",
  "     .RjjjjjR.      ","    ..RbRbRbR..     ","   .bRbRbRbRbb.     ","  db.RbRbRbR.bd     ",
  " dR..bRbRbRb..Rd    ","dR....RbRbR....Rd   ","R......bRb......R   ","  .i    R    i.     ",
  "  .i   RRR   i.     ","  R.   Rii   .R     ","  R.   R  i  .R     ","   R       R        ",
  "  RR       RR       "],
  pal:{".":"#0a0908","R":"#7c1a10","b":"#c2ac86","0":"#160707","j":"#c8c030",
   "i":"#4c1206","d":"#2a241a"},
  atk:[ // pouncing, claws forward, jaw unhinged wide
  "    .RR.RR.        ","   .R00R00R.        ","  .Rb00b00bR.       ",
  " .RbbbjjjbbR.       ","  RbRbjjjbRbR        "," bRbRbRbRbb          ",
  "dbRbRbRbRbb.d       ","dR.bRbRbR..Rd       ","R...bRb....R        ",
  " i    R    i         ","RR   RRR   RR        "],
  die1:[ // crumpling mid-air, limbs splaying
  "     .RR.RR.        ","    .R00R00R.       ","      .Rb0bR.       ",
  "   RR  .RjR.  RR    ","  bRb   Rb.   bRb   "," db..   R.   ..bd   ",
  "d......bRb......d   ","  i.    R    .i     ","  RR    i    RR     "],
  die2:[ // flat, twisted corpse
  "                        ","    .RR.RR.            ",
  "   .R00R00R.  RR   RR  ","dbRbRb0bRbbR bRb bRb   ",
  "d......RbR.....d       ","  i     i     i        "]},

 g:{head:0,px:[ // HOUND — flayed quadruped, spine ridge, unhinged jaw, drool
  "              .dGd.  ","      .dbRbdbRd.dGGd ","    .dRbdbdd.jj..dGd ",
  "   .d.bdbdd..jjbb..  ","  ..  .R..R.. i  b   ","      .d.   .d.      ",
  "     dd     dd       "],
  pal:{".":"#0a0b0c","d":"#4a3c2c","G":"#2c2418","b":"#a89478","R":"#7c1a10",
   "j":"#b8301c","i":"#8c2216"},
  atk:[ // leaping bite, jaw wide open
  "            .dGd.    ","    .dbRbdbRd.dGGd   ","  .dRbRRRRbd.jj..dGd ",
  " .d.bRRRRbd..jjbb..  ","..  .R.RR.R.. i  b   ","    .d.RR   .d.      ",
  "   dd  RR    dd      "],
  die1:[ // collapsing sideways
  "     .dGd.           ","   .dbRbdb.dGGd      "," .dRbdbdd.jj..d      ",
  "   .bdbdd..jjb.      ","    .R..R.. i  b     ","      dd    dd       "],
  die2:[ // flat on its side
  "                          ",
  " .dGd.  .dbRbdbRd.jj..   ",
  ".dGGdj.dRbdbdd.jjbb.dd   ",
  "        ..  ..R..R.. i   "]},

 m:{head:8,px:[ // PLATED HORROR — riveted rust armor bolted over rotting flesh
  "     .AArAA.        ","    .ArA0ArA.       ","    .Ar0e0rA.       ","    .AreeerA.       ",
  "    .AAAAAAA.       ","     .Ar.rA.        ","      .Arg.         ","     rAA.AAr        ",
  "    rA A. A Ar      ","   dAAA..AAAd       ","  d.AbAbAbAb.d      "," d.ARbRbRbA.d       ",
  " d.AbA..AbA.d       "," R.Ab.HH.bA.R       "," R.bA.HH.Ab.R       ","dd.Ab....bA.dd      ",
  "  .g0000gg.         ","   .gRiRig.         ","    .gAAg.          ","   d.iAAi.d         ",
  "   d.iAAi.d         ","    di..id          ","    di  id          ","   dd    dd         "],
  pal:{".":"#0b0c10","A":"#585e64","r":"#6e3018","0":"#150605","e":"#0d0e10","g":"#3c4230",
   "R":"#6e1a0e","H":"#c8583e","b":"#8c9270","i":"#7a1c10","d":"#26282c"},
  atk:[ // armored slam, both arms raised
  "  rAA.AAr           ","  rA A. A Ar        ","   .AArAA.          ",
  "  .ArA0ArA.          "," .Ar0e0rA.           ","  .AAAAAAA.          ",
  "   .Ar.rA.            ","    .Arg.              ",
  "  dAAA..AAAd           "," d.AbAbAbAb.d         ",
  "d.ARbRbRbA.d          ","d.AbA..AbA.d          ",
  " R.Ab.HH.bA.R         "," R.bA.HH.Ab.R         ","dd.Ab....bA.dd       "],
  die1:[ // toppling, armor plates scraping
  "     .AArAA.        ","    .ArA0ArA.       ","    .Ar0e0rA.       ",
  "  RR .AreeerA. RR   "," AbA  .AAAAAAA. AbA ","dd..   .Ar.rA.   ..dd",
  " d.AbAbAb.rg.bAd     ","  d.ARbRb....d       ","    d.AbA.d          "],
  die2:[ // flat, plates splayed open
  "                              ",
  "  .AArAA.  d.AbAbAbAb.d      ",
  " .ArA0ArA.d.ARbRbRbA.d       ",
  " .Ar0e0rA.d.AbA..AbA.d       ",
  "  .AAAAAA. R.Ab.HH.bA.R      ",
  "   .Ar.rA.   dd.Ab....bA.dd  "]},

 t:{head:7,px:[ // PLAGUE BLOAT — grotesquely swollen, split rind, weeping bile
  "     .tttttt.       ","    .tY00000Yt.     ","   .tY0IeeI0Yt.     ","   .t0IeYYeI0t.     ",
  "   .ttHIYYIHtt.     ","  .tttHIIIHttt.     "," .tttttttttttt.     ",
  ".tHtiiiiiiiitHt.    ",".tHiYYYYYYYYiHt.    ",".tItYYIIIIYYtIt.    ",
  ".tItiHHHHHHitIt.    ",".tt.tiiiiiit.tt.    ","  tt.tYYYYt.tt      ",
  "   tt.HHHH.tt       ","    tt.ii.tt        ","    tI.  .It        ",
  "    tI    It        "],
  pal:{".":"#0a0e08","t":"#3a5228","Y":"#93b840","0":"#140805","I":"#1e3a10",
   "e":"#0a0f06","H":"#b8d84c","i":"#517a2c"},
  atk:[ // heaving forward, sores bursting
  "     .tttttt.       ","    .tY00000Yt.     ","   .tY0IeeI0Yt.     ",
  "  Y.t0IeYYeI0t.Y    "," H.ttHIYYIHtt.H     ","H.tttHIIIHttt.H     ",
  "Y.tttttttttttt.Y    ",".tHtiiiiiiiitHt.     ",
  ".tHiYYYYYYYYiHt.    ",".tItYYIIIIYYtIt.    ",
  ".tItiHHHHHHitIt.    ",".tt.tiiiiiit.tt.    "],
  die1:[ // buckling, split wider, oozing
  "    .tttttt.        ","   .tY00000Yt.      ","  .tY0IeeI0Yt.      ",
  " Y.t0IeYYeI0t.Y     ","YY.ttHIYYIHtt.YY    ",
  "YYY.tttttttt.YYY    ","  .tHtiiiitHt.      ","   .tIYYYYIt.       "],
  die2:[ // collapsed puddle of rind and bile
  "                            ",
  "   .tttttttttt.            ",
  "  .tY00000000Yt.           ",
  " YY.tIeeeeeeIt.YY YYY  YYY ",
  "YYYY.tttttttt.YYYYYYYYYYYYY",
  "  ...tHtiiiitHt...         "]},

 w:{head:0,px:[ // DRAGGER — torn in half at the waist, hauling its own guts
  "                      ","   .R0g0R.           ","  .gRjbgj0g...       ",
  " .gbRbgddiii..       ",".R.bRddiiiiii.i      ","..  .R.iiiiiii.i     ",
  "     RR   ii  i i    "],
  pal:{".":"#0a0c09","g":"#4a4636","R":"#7c1a10","0":"#160706","j":"#b8301c",
   "b":"#a89478","d":"#332c1e","i":"#7a1c10"},
  atk:[ // grabbing lunge, arm outstretched
  "  RRRR                ","  .R0g0R.             ",
  " .gRjbgj0g...RR       ",".gbRbgddiii..RbR      ",
  ".R.bRddiiiiii.i.bd    ","..  .R.iiiiiii.i..    ",
  "     RR   ii  i i     "],
  die1:[ // going limp
  "                       ","   .R0g0R.            ",
  "  .gRjbgj0g..         "," .gbRbgddiii.         ",
  ".R.bRddiiii.i         ","..  .R.iiii.i         "],
  die2:[ // finally still, flattened
  "                          ",
  "  .R0g0R.  .gRjbgj0g..   ",
  " .gbRbgddiii...R.bRdd.i  ",
  "..  .R.iiiiiii.i.i.....  "]},

 s:{head:6,px:[ // WAILER — gaunt, cheeks torn open, throat split in a permanent scream
  "     .ppPPpp.       ","    .pP0000Pp.      ","    .p0R  R0p.      ",
  "    .pR0BB0Rp.      ","    .RBBBBBBR.      ","   ..RBBBBBBR..     ",
  "   p.pRBBBBRp.p     ","  pp.pRRRRRRp.pp    "," pp.pRb....bRp.pp   ",
  " p...RbbbbbbR...p   ","p....RbHHHHbR....p  ","     pRbb..bbRp     ",
  "     pR......Rp     ","      p.RRRR.p      ","      p.RiiR.p      ",
  "       pi..ip       ","       pi  ip        "],
  pal:{".":"#0a0810","p":"#584a5c","P":"#7c6a86","0":"#160512","R":"#7c1a10",
   "B":"#c8402a","b":"#b8a2c0","H":"#e6d8ec","i":"#7a1c10","d":"#332838"},
  atk:[ // shrieking lunge, arms flung wide
  "pp   .ppPPpp.   pp  "," pp  .pP0000Pp.  pp ",
  "  pp .p0R  R0p. pp  ","   p .pR0BB0Rp. p   ",
  "    .RBBBBBBR.      ","   ..RBBBBBBR..     ",
  "   p.pRBBBBRp.p     ","  pp.pRRRRRRp.pp    ",
  " pp.pRb....bRp.pp   "],
  die1:[ // crumbling, mouth still open
  "      .ppPPpp.      ","     .pP0000Pp.     ",
  "     .p0R  R0p.     ","  RR .pR0BB0Rp. RR  ",
  " pRp  .RBBBBBBR.  pRp","dd..  ..RBBBBBBR..  ..dd",
  "      p.pRBBBBRp.p      "],
  die2:[ // slumped, jaw finally shut in death
  "                            ",
  "   .ppPPpp.   pRp   pRp    ",
  "  .pP0000Pp. dd..RBBBBBBR..dd",
  "  .p0R  R0p.      p.pRRRRp.p "]},

 C:{head:0,px:[ // CACODEMON — floating orb of meat, one huge eye, ring of fangs
  "  hh          hh   ","   hh.RRRRRRRR.hh  "," .RRRRRRRRRRRRRR.  ",
  ".RRRRrrrrrrrrRRRR. ","RRRrrGGGGGGGGrrRRR ","RRrrGGGeeeeGGGrrRR ",
  "RRrGGGe0000eGGGrR  ","RRrGGGe0WW0eGGGrR  ","RRrrGGGeeeeGGGrrRR ",
  "RRRrrGGGGGGGGrrRRR ",".RRRRrrrrrrrrRRRR. ",".RWtWtWtWtWtWtW.   ",
  " .WtWtWtWtWtWtW.   ","  .RRRRRRRRRRRR.   ","   .rrrrrrrrrr.    ",
  "    .RRRRRRRR.     ","     .RRRRRR.      ","      .RRRR.       "],
  pal:{".":"#100708","h":"#5c1610","R":"#8c241a","r":"#6e1a12","G":"#3e6428",
   "e":"#0a1206","0":"#e0e0d8","W":"#c8382a","t":"#f0dcc0"},
  atk:[ // maw stretched wide, charging a blast
  "  hh          hh   ","   hh.RRRRRRRR.hh  "," .RRRRRRRRRRRRRR.  ",
  ".RRRRrrrrrrrrRRRR. ","RRRrrGGGGGGGGrrRRR ","RRrrGWWWWWWWWWrrRR ",
  "RRrGWW0000000WWGrR ","RRrGWW0WWWWWW0WGrR ","RRrrGWWWWWWWWWrrRR ",
  "RRRrrGGGGGGGGrrRRR ",".RRRRrrrrrrrrRRRR. ",".RtWtWtWtWtWtWt.   "],
  die1:[ // deflating, eye rolling back
  "  hh          hh   ","   hh.RRRRRRRR.hh  "," .RRRRRrrrrrRRR.   ",
  ".RRRrrrrrrrrRRR.   ","RRrrGGeGGGGGGrrRR  ","RRrGGG0000GGrrR    ",
  " RrrGGGGGGGGrr     ","  .RRRRrrrrRR.      ","   .RtWtWtWt.       "],
  die2:[ // burst, collapsed husk on the ground
  "                             ",
  "   hh                hh     ",
  " .RRRrrrrrrrrrrrrrrrrrRRR.  ",
  "RRRrGGGGeGGGGGGeGGGGGGrRRR  ",
  " .RRRR.RtWtWtWtWtWtWt.RRRR. "]},

 A:{head:5,px:[ // MANCUBUS — obese hulk, arm-mounted cannons, split gut, gaping maw
  "     .ggggggg.       ","    .g0igg0igg.      ","    .gMMMMMMMg.      ",
  "   .ggggggggggg.     ","  .gg.gggggggg.gg.   "," TT.gg.ggggggg.gg.TT ",
  "TTT.ggiiiiiiiigg.TTT ","TTT.gi..iiii..ig.TTT ",
  "TTT.giIIIIIIIIig.TTT ","TTT.gWWWWWWWWWWg.TTT ",
  " TT.giI0000000Iig.TT ","  .ggiiiiiiiiiigg.   ","   .gg..g..g..gg.    ",
  "   .gg.  .  .gg.     ","    gg.    .gg       ","    gg.    .gg       ",
  "   .gg      gg.      "],
  pal:{".":"#0c0906","g":"#8c6a44","0":"#c8d840","M":"#4a1a12","i":"#7c1a10",
   "I":"#4a0e0a","W":"#2a0806","T":"#42392e","R":"#6e1a0e"},
  atk:[ // arm-cannons raised and flaring
  "  00     .ggggggg.     00  ","  0i0    .g0igg0igg.   0i0  ",
  "   i     .gMMMMMMMg.    i   ","         .ggggggggggg.      ",
  "        .gg.gggggggg.gg.    ","      TT.gg.ggggggg.gg.TT   ",
  "     TTT.ggiiiiiiiigg.TTT   ","     TTT.gi..iiii..ig.TTT   ",
  "     TTT.giIIIIIIIIig.TTT   ","     TTT.gWWWWWWWWWWg.TTT   "],
  die1:[ // buckling backward, gut splitting further
  "     .ggggggg.       ","    .g0igg0igg.      ",
  "    .gMMMMMMMg.      ","  RR.ggggggggggg.RR  ",
  " gg.gg.gggggggg.gg.gg","TT..ggiiiiiiiigg..TT ",
  "   .gi..IIII..ig.    ","    .giIIIIIIIIig.   "],
  die2:[ // collapsed heap, arm-cannons splayed
  "                                ",
  "  .ggggggg.   TTT       TTT    ",
  " .g0igg0igg. TTT.ggiiiiig.TTT  ",
  " .gMMMMMMMg.gg.giIIIIIIig.gg   ",
  "  ggggggggggg..gWWWWWWWWg..    "]},

 L:{head:0,px:[ // LOST SOUL — burning skull, wreathed in fire, jaw agape
  "   yy    yy    ","   oyyo  oyyo  "," .oRRRRoooRRRRo",
  " .RbbbbRRbbbbR.",".Rb00b0RRb0b00b",".Rb0bb0bRb0bb0b",
  " .RRbbbbRRbbbbR"," .R.bb.RR.bb.R."," yo.bb.RRR.bb.o",
  " y o..RRRR..o y","    o.RRRR.o   ","     .Rii.     "],
  pal:{".":"#140804","R":"#c8c0b0","b":"#e8e0d0","0":"#1a0a06","o":"#d86020",
   "y":"#f0c040","i":"#7a2810"},
  atk:[ // charging dash, flame trail streaming back
  "yy   yy   oo   oo  ","oyyo oyyo  o   o    ",
  ".oRRRRoooRRRRo  o   "," .RbbbbRRbbbbR.     ",
  ".Rb00b0RRb0b00b     ",".Rb0bb0bRb0bb0b     ",
  " .RRbbbbRRbbbbR     "," .R.bb.RR.bb.R.     "],
  die1:[ // skull cracking apart mid-air
  "  y   y  y   y    ","  oo     oo       ",
  " .oRR. .RRRo.     ","  .Rb0   0bR.     ",
  "  .R0b   b0R.     ","   .Rb...bR.      ",
  "    o.RRR.o        "],
  die2:[ // shattered fragments, fire guttering out
  "                        ",
  " y    y   y    y       ",
  "o.oR   Ro.  0R  Ro     ",
  "  .b0   0b.  b   b     "]},

 j:{head:4,px:[ // CULTIST — hooded robe, gun, Blood-style
  "   .hhhh.   ","  .hhhhhh.  ","  .h.00.h.  ","  .hhhhhh.  ",
  " .rrrrrr.SSS"," rr.rrrr.rSS","rr.rrrrrr.rr","r..rrrrrr..r",
  "  .rrrrrr.  ","  .rr..rr.  ","  .rr..rr.  ","  rr    rr  "],
  pal:{".":"#0c0a0c","h":"#2a1c2e","0":"#c83a20","r":"#3a2838","S":"#5a5048"}},
 n:{head:4,px:[ // ETTIN — Hexen brute, two-handed maul, tusks
  "   .kkkk.   ","  .kRkkRk.  ","  .ktttk..  M","  .kkkkk. MM"," .gggggggg.M ",
  "gg.gggggg.gg","gg.gggggg.gg","g..gggggg..g","  .gg..gg.  ","  .gg..gg.  ",
  "  .gg..gg.  ","  kk    kk  "],
  pal:{".":"#0c0d0a","k":"#6a5a44","R":"#9c2f1e","t":"#d8c8a0","g":"#4a4636","M":"#7a7e86"}},
 V:{head:4,px:[ // FACTORY FOREMAN form 1 — mechanized hulk, cannon arms
  "    .MMMM.     ","   .M0MM0M.    ","   .MMMMMM.    ","  .gMMMMMMg.   ",
  "TT.gggggggg.TT","T0.gg.gg.gg.0T","TT.gggggggg.TT","TT.gRRRRRRg.TT",
  "  .gg0000gg.  ","  .gggggggg.  ","   .gg..gg.   ","  .MM.  .MM.  "],
  pal:{".":"#0c0a08","M":"#5a5660","0":"#ff8020","g":"#7a6a4a","R":"#3a1810","T":"#4a4a52"}},
 V2:{head:3,px:[ // FACTORY FOREMAN final form — overheated, core exposed
  "   .M00M00M.   ","  .MM0000MM.   ","  .MMMMMMMM.   "," .gMMMMMMMMg.  ",
  "T0.gg0000gg.0T","T0.g000000g.0T","T0.gg0000gg.0T","TT.gMMMMMMg.TT",
  "  .M000000M.  ","  .MMMMMMMM.  ","   .MM..MM.   ","  .MM.  .MM.  "],
  pal:{".":"#0c0a08","M":"#4a4650","0":"#ff9028","g":"#6a3018","T":"#52525a"}},
 G:{head:0,px:[ // THE LIVING HEART — bulging muscle, arteries, open ventricle
  "   vv    vv   ","  vRRv  vRRv  "," vRRRRvvRRRRv "," .RRRRRRRRRR. ",
  ".RRSSRRRRSSRR.",".RSSWSRRSWSSR.",".RRSSRRRRSSRR.",".RRRRRiiRRRRR.",
  " .RRRiIIiRRR. "," .RRRiIIiRRR. ","  .RRRiiRRR.  ","  .vRRRRRRv.  ",
  "   .vRRRRv.   ","    .vRRv.    ","     .vv.     "],
  pal:{".":"#1a0606","R":"#8c1e14","S":"#b8342a","W":"#e06050","i":"#3a0a0a","I":"#c8403a","v":"#5a1410"}},
 G2:{head:0,px:[ // THE LIVING HEART ruptured — split ventricles, spilling
  "  vv  vv  vv  "," vRSv vRSv vRv","vRSSRvRSSRvRSR",".RSWSRRSWSRSWR",
  ".RSSRRRRSSRRSR",".RRiIIiRRiIIiR",".RRiIIiRRiIIiR",".RRRiiRRRRiiR.",
  " RRRRRRRRRRRR "," vRSSRRRRSSRv ","  vRRRiiRRRv  ","  .vRRRRRRv.  ",
  "   .vRRRRv.   ","   .vRiiRv.   ","    vRiiRv    "],
  pal:{".":"#1a0606","R":"#a02218","S":"#c8403a","W":"#f07060","i":"#2a0606","I":"#e0504a","v":"#6e1810"}},
 k:{head:5,px:[ // SLAUGHTAUR — armored centaur, screaming-skull shield, fire
  "   .hhh.    ","  .hRhRh.   ","  .hhhhh.   ","  .ggg..    ","SS.gggg..   ",
  "SbS.ggggHH  ","SBS.ggg.bH  ","SbS.ggggHH  ","SS.kkkkkk.  ","  .kk.kk.   ",
  "  kk. .kk   ","  k.   .k   "],
  pal:{".":"#0c0b09","h":"#6a5644","R":"#9c2f1e","g":"#7a6a4e","k":"#4a4030","S":"#3a3632","B":"#c83a20","b":"#e8d088","H":"#d8c8a0"}},
 q:{head:0,px:[ // AFRIT — flying fire demon, burning wings
  " F  FF  F ","Fo.oFo.oF ",".oRRRRo.  ",".oRFFFFRo.","FoRF00FRoF",
  ".oRFFFFRo.",".oRRRRo.  "," Fo.RR.oF "," F .RR. F ","   o..o   "],
  pal:{".":"#1a0a04","R":"#c84020","F":"#ff8828","o":"#ffd060","0":"#fff0c0"}},
 R:{head:0,px:[ // REIVER — half-corpse flying undead, tattered
  "  .bbbb.  "," .bGEEGb. "," .bE00Eb. "," .bEGGEb. "," .bbEEbb. ",
  " R.bbbb.R ","RR.bRRb.RR"," R..RR..R ","  R.RR.R  ","   R..R   "],
  pal:{".":"#0a0c0a","b":"#9a9482","G":"#4a4636","E":"#1a1a14","0":"#c8d048","R":"#5a3a2a"}},
 y:{head:0,px:[ // STONE GARGOYLE (Blood) — winged stone, blue eyes
  "ss      ss"," ss.ss.ss "," .sSSSSs. "," sS0SS0Ss ",".sSSSSSSs.",
  "sS.sSSs.Ss","ss.sSSs.ss"," .sSSSSs. "," ss.SS.ss ","  s.SS.s  ","   ssss   "],
  pal:{".":"#0a0c10","s":"#4a525c","S":"#5e6670","0":"#5ab0e0"}},
 B:{head:4,px:[ // heavy brute — massive shoulders
  "   .mmmm.     ","  .mRmmRm.    ","  .mmmmmm.    "," .mmmmmmmm.   ",
  ".mmmddddmmm.  ",".mm.dddd.mm.  ",".mm.dddd.mm.  ","mm .dddd. mm  ",
  "mm .dd.dd. mm ","   .dd.dd.    ","   .dd.dd.    ","  .mm. .mm.   "],
  pal:{".":"#0e0d0c","m":"#6e5a48","R":"#c83a20","d":"#4a3a2c"}},
 E:{head:4,px:[ // MUTANT EXECUTIONER — hooded, great axe
  "    .hhhh.      ","   .hhhhhh.     ","   .h.RR.h.     ","   .hhhhhh. AA  ",
  "  .dddddddd.AA  "," .dd.dddd.ddAA  ",".dd.dddddd.dAAA ",".dd.dddddd.dAAA ",
  "hh .dddddd.  A  ","hh .dd..dd.  A  ","   .dd..dd.  A  ","   .dd..dd.  A  ",
  "  .hh.  .hh. A  "],
  pal:{".":"#0c0b0a","h":"#3a3026","R":"#c83a20","d":"#52423a","A":"#7a7e86"}},
 U:{head:4,px:[ // CATHEDRAL GUARDIAN — stone knight, shield
  "    .kkkk.      ","   .kkkkkk.     ","   .k.BB.k.     ","SS .kkkkkk.     ",
  "SS.kkkkkkkk.    ","SS.kk.kk.kk.    ","SS.kk.kk.kk. A  ","SS.kkkkkkkk. A  ",
  "SS .kkkkkk.  A  ","   .kk..kk.  A  ","   .kk..kk.  A  ","  .kk.  .kk.    "],
  pal:{".":"#0c0d10","k":"#6e7078","B":"#4a8ab8","S":"#52565e","A":"#9a948a"}},
 Q:{head:5,px:[ // CORRUPTED PRIEST form 1 — tall, mitred, wrong
  "     .MM.       ","    .MMMM.      ","    .MRRM.      ","    .MMMM.      ",
  "    .rBBr.      ","    .rrrr.      ","   .rrrrrr.     ","  .rrrrrrrr.    ",
  " .rr.rrrr.rr.   ",".rr..rrrr..rr.  ",".r. .rrrr. .r.  ","    .rrrr.      ",
  "    .rrrr.      ","    .rrrr.      ","   .rr..rr.     ","   .rr..rr.     "],
  pal:{".":"#0d0a10","M":"#8a7a3e","R":"#c83a20","r":"#3e2030","B":"#c8d83a"}},
 Q2:{head:4,px:[ // CORRUPTED PRIEST final form — hunched horror
  "    .RR..RR.      ","   .RRRRRRRR.     ","  .RR.MM.MM.RR.   ","  .RRRRRRRRRR.    ",
  " .rrRRRRRRRRrr.   ",".rr.rrrrrrrr.rr.  ",".r.rrbbbbbbrr.r.  ",".r.rrbrrrrbrr.r.  ",
  "rr.rrbrrrrbrr.rr  ","rr .rrrrrrrr. rr  ","   .rrr..rrr.     ","   .rrr..rrr.     ",
  "  .rrr.  .rrr.    "],
  pal:{".":"#0d0a10","R":"#c83a20","M":"#c8d83a","r":"#3e2030","b":"#7a766c"}},
 Z:{head:5,px:[ // THE BONE SOVEREIGN form 1 — crowned skeleton king
  "    YYMMYY.      ","   .YbYYbY.      ","    .bbbb.       ","    .EbbE.       ",
  "    .bbbb.       ","   .RbbbbR.      ","  .RRbbbbRR.     "," .RcccccccR.    ",
  " .cc.cccc.cc.   ",".cc..cccc..cc.  ",".c. .cccc. .c.  ","    .cccc.      ",
  "    .bbbb.       ","    .bbbb.       ","   .bb..bb.      ","   .bb..bb.      "],
  pal:{".":"#0c0c08","Y":"#d8c050","M":"#f0e088","b":"#cfc8b0","c":"#3a3a30","E":"#1a0a10","R":"#8a3020"}},
 Z2:{head:4,px:[ // THE BONE SOVEREIGN final form — risen ossuary giant
  "   .YYMMMMYY.     ","  .YbbEbbEbbY.    ","  .bbbbbbbbbb.    "," .RbbbbbbbbbbR.   ",
  " .RRbbbbbbbbRR.   ",".cc.bbbbbbbb.cc.  ",".c.bbWWWWWWbb.c.  ",".c.bbWbbbbWbb.c.  ",
  "cc.bbWbbbbWbb.cc  ","cc .bbbbbbbb. cc  ","   .bbb..bbb.     ","   .bbb..bbb.     ",
  "  .bbb.  .bbb.    "],
  pal:{".":"#0c0c08","Y":"#f0e088","M":"#d8c050","b":"#cfc8b0","c":"#3a3a30","E":"#c83a20","R":"#8a3020","W":"#1a0a10"}},
 N:{head:4,px:[ // THE GRAVEDIGGER form 1 — hooded, shovel, shroud
  "   .hhhh.    ssss","  .hhhhhh.   s  ","  .h.RR.h.   s  ","  .hhhhhh.  ss  ",
  " .gggggggg. s   "," gg.gggg.ggSS   ","gg.gggggg.gSS   ","g..gggggg..SS   ",
  "  .gggggg.  s   ","  .gg..gg.  s   ","  .gg..gg.  s   ","  .gg..gg.      ",
  " .gg.  .gg.     "],
  pal:{".":"#0c0d0a","h":"#26281f","R":"#c8d83a","g":"#3a3c30","S":"#7a7066","s":"#5a5448"}},
 N2:{head:3,px:[ // THE GRAVEDIGGER final form — unearthed wraith
  "  .RR..RR.   ssss"," .RRRRRRRR.  s   "," .R.MM.M.R.  s   ","  .gggggg.  ss  ",
  " .gggggggg. ss  ",".gg.gggg.gg.SS  ",".g.gWWWWg.g.SS  ",".g.gWggWg.g.SS  ",
  "gg.gWggWg.gg.S  ","gg .gggggg. gg  ","   .gg..gg.     ","   .gg..gg.     ",
  "  .gg.  .gg.    "],
  pal:{".":"#0c0d0a","R":"#7fd05a","M":"#c8d83a","g":"#2e3026","W":"#0c1a0c","S":"#6a6258","s":"#4a4238"}},
 H:{head:4,px:[ // THE HOLLOW LEVIATHAN form 1 — bloated sludge maw
  "    .gggg.      ","  .ggGGGGgg.    "," .gGGggggGGg.   "," gGG.gggg.GGg   ",
  ".gG.gRRRRg.Gg.  ",".g.gRG00GRg.g.  ",".g.gRRRRRRg.g.  ","gg.gggggggg.gg  ",
  "gg.g.gggg.g.gg  ","g.gg.gggg.gg.g  ",".g.gg.gg.gg.g.  "," gg gg  gg gg   ",
  "  g  g  g  g    "],
  pal:{".":"#0a0e0a","g":"#3a4a32","G":"#5a7048","R":"#6a3020","0":"#c8d83a"}},
 H2:{head:4,px:[ // THE HOLLOW LEVIATHAN final form — split toxic horror
  "   .GG.GG.GG.   ","  .GggggggggG.  "," .Ggg0gg0ggG.   "," GggRRggRRggG   ",
  ".Gg.gR00Rg.gG. ",".G.gRG00GRg.G.  ",".G.gRRRRRRg.G.  ","GG.gg0000gg.GG  ",
  "GG.gggggggg.GG  ","G.gg.gggg.gg.G  ",".G.gg.gg.gg.G.  "," GG.g.  .g.GG   ",
  "  G  GG  GG  G  "],
  pal:{".":"#0a0e0a","G":"#4a6038","g":"#2e3c28","R":"#7a3020","0":"#9fe04a"}},
};
const PX={};
function buildSprites(){
  for(const k in PXDEF){const d=PXDEF[k];
    const W=d.px[0].length,H=d.px.length;
    const head=d.head||0;
    // region rectangles [x0,y0,x1,y1]
    const headM=head>0?[[0,0,W,head]]:null;
    const armTop=head, armBot=Math.min(H-3,head+Math.ceil((H-head)*0.45));
    const lArm=[[0,armTop,Math.ceil(W*0.32),armBot]];
    const rArm=[[Math.floor(W*0.68),armTop,W,armBot]];
    const legM=[[0,H-3,W,H]];
    const mk=(masks,stumps)=>masks?texFromPx(d.px,d.pal,{masks,stumps:stumps!==false}):null;
    const mkM=(masks,stumps)=>masks?texFromPx(d.px,d.pal,{masks,stumps:stumps!==false,mirror:true}):null;
    PX[k]={a:texFromPx(d.px,d.pal),b:texFromPx(d.px,d.pal,{mirror:true}),
      hl:texFromPx(d.px,d.pal,{blankTop:head}),
      hlb:texFromPx(d.px,d.pal,{blankTop:head,mirror:true}),head:head,
      // dismemberment frames
      noHead: headM?mk(headM):null,    noHeadB: headM?mkM(headM):null,
      noLArm: mk(lArm),                noLArmB: mkM(lArm),
      noRArm: mk(rArm),                noRArmB: mkM(rArm),
      noLegs: mk(legM),               noLegsB: mkM(legM),
      // fully gibbed combos for overkill
      gibbed: headM?mk([headM[0],lArm[0],rArm[0]]):mk([lArm[0],rArm[0]]),
      gibbedB: headM?mkM([headM[0],lArm[0],rArm[0]]):mkM([lArm[0],rArm[0]]),
      // attack pose + death collapse frames (only for redesigned enemies that define them)
      atk: d.atk?texFromPx(d.atk,d.pal):null,
      die1: d.die1?texFromPx(d.die1,d.pal):null,
      die2: d.die2?texFromPx(d.die2,d.pal):null,
      regions:{W,H,head,armTop,armBot}};}
}
function pickupTex(rows,pal){return texFromPx(rows,pal);}
const ITEMTEX={};
function buildItemTex(){
  ITEMTEX.health=pickupTex(["........",".wwwwww.",".w.RR.w.",".wRRRRw.",".wRRRRw.",".w.RR.w.",".wwwwww.","........"],{".":"#101216","w":"#7a766c","R":"#9c2f1e"});
  ITEMTEX.bullets=pickupTex(["........",".bbbbbb.",".b.y.yb.",".b.y.yb.",".b.y.yb.",".b.y.yb.",".bbbbbb.","........"],{".":"#101216","b":"#4a4438","y":"#a08c5a"});
  ITEMTEX.shells=pickupTex(["........",".RRRRRR.",".RyRRyR.",".RyRRyR.",".RyRRyR.",".RyRRyR.",".RRRRRR.","........"],{".":"#101216","R":"#6e2e1c","y":"#a08c5a"});
  ITEMTEX.slugs=pickupTex(["........",".kkkkkk.",".k.y..k.",".k.yy.k.",".k.yy.k.",".k..y.k.",".kkkkkk.","........"],{".":"#101216","k":"#3a3d44","y":"#b8b2a6"});
  ITEMTEX.crosses=pickupTex(["...yy...","...yy...",".yyyyyy.",".yyyyyy.","...yy...","...yy...","...yy...","........"],{".":"#00000000","y":"#d8c87a"});
  ITEMTEX.armor=pickupTex(["...AA...","..AAAA..",".AAAAAA.",".A.AA.A.",".AAAAAA.","..AAAA..","...AA...","........"],{".":"#101216","A":"#4a6b8a"});
  ITEMTEX.key=pickupTex(["..RR....",".R..R...",".R..R...","..RR....","...R....","...RR...","...R....","...RR..."],{".":"#00000000","R":"#c83a20"});
  ITEMTEX.gun=pickupTex(["........","..gggg..",".gggggg.",".gg..gg.",".gggggg.","..g..g..","..g..g..","........"],{".":"#101216","g":"#5c6068"});
  ITEMTEX.torch=[texFromPx(["..yy.",".yYYy","yYOYy",".yOy.","..w..","..w..","..w.."],{".":"#00000000","y":"#e8a83a","Y":"#f8e87a","O":"#c85a1e","w":"#3a2c1e"}),
    texFromPx([".yy..","yYYy.","yYOYy",".yOy.","..w..","..w..","..w.."],{".":"#00000000","y":"#e8a83a","Y":"#f8e87a","O":"#c85a1e","w":"#3a2c1e"})];
  ITEMTEX.candle=texFromPx(["..y..",".yYy.","..w..",".www.",".www."],{".":"#00000000","y":"#e8c85a","Y":"#f8f0a0","w":"#b8b2a6"});
}
const blobTexC=document.createElement("canvas");blobTexC.width=blobTexC.height=32;
{const g=blobTexC.getContext("2d");const gr=g.createRadialGradient(16,16,2,16,16,16);
 gr.addColorStop(0,"rgba(0,0,0,.55)");gr.addColorStop(1,"rgba(0,0,0,0)");
 g.fillStyle=gr;g.fillRect(0,0,32,32);}
const blobTex=new THREE.CanvasTexture(blobTexC);
function addSprite(tex,wx,wz,sw,sh,y){
  const m=new THREE.SpriteMaterial({map:tex,transparent:true});
  const sp=new THREE.Sprite(m);sp.scale.set(sw,sh,1);
  sp.position.set(wx,y!==undefined?y:sh/2,wz);scene.add(sp);return sp;}
function addBlob(wx,wz,s){const m=new THREE.Mesh(new THREE.PlaneGeometry(s,s),
  new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set(wx,.012,wz);scene.add(m);return m;}

/* ============================================================
   PARTICLES / DECALS / GIBS (pooled, rebuilt per level)
   ============================================================ */
const PMAX=1100;
let pGeo,pPos,pCol,points,parts,pNext;
function buildParticles(){
  pGeo=new THREE.BufferGeometry();
  pPos=new Float32Array(PMAX*3);pCol=new Float32Array(PMAX*3);
  pGeo.setAttribute("position",new THREE.BufferAttribute(pPos,3));
  pGeo.setAttribute("color",new THREE.BufferAttribute(pCol,3));
  const pMat=new THREE.PointsMaterial({size:.09,vertexColors:true,sizeAttenuation:true});
  points=new THREE.Points(pGeo,pMat);points.frustumCulled=false;scene.add(points);
  parts=Array.from({length:PMAX},()=>({life:0}));pNext=0;
  for(let i=0;i<PMAX;i++)pPos[i*3+1]=-100;
}
function spawnP(x,y,z,vx,vy,vz,r,g,b,life,kind){
  const i=pNext;pNext=(pNext+1)%PMAX;
  const p=parts[i];
  p.x=x;p.y=y;p.z=z;p.vx=vx;p.vy=vy;p.vz=vz;p.life=life;p.kind=kind||0;
  pCol[i*3]=r;pCol[i*3+1]=g;pCol[i*3+2]=b;}
function blood(x,y,z,n,pow){for(let i=0;i<n;i++)
  spawnP(x,y,z,rnd(-1,1)*pow,rnd(.3,1.6)*pow,rnd(-1,1)*pow,
    rnd(.35,.62),rnd(.02,.08),rnd(.01,.04),rnd(.5,1.3),1);}
function sparks(x,y,z,n){for(let i=0;i<n;i++)
  spawnP(x,y,z,rnd(-2.4,2.4),rnd(.5,3),rnd(-2.4,2.4),
    rnd(.8,1),rnd(.6,.85),rnd(.2,.4),rnd(.15,.4),2);}
function smoke3d(x,y,z,n){for(let i=0;i<n;i++)
  spawnP(x,y,z,rnd(-.3,.3),rnd(.4,1),rnd(-.3,.3),.28,.28,.3,rnd(.6,1.4),3);}
function fireP(x,y,z,n){for(let i=0;i<n;i++)
  spawnP(x,y,z,rnd(-1.5,1.5),rnd(1,4),rnd(-1.5,1.5),
    rnd(.85,1),rnd(.3,.6),.1,rnd(.3,.8),2);}
function holyP(x,y,z,n){for(let i=0;i<n;i++)
  spawnP(x,y,z,rnd(-2.5,2.5),rnd(.5,3.5),rnd(-2.5,2.5),
    rnd(.9,1),rnd(.85,1),rnd(.5,.7),rnd(.3,.7),2);}
function toxicP(x,y,z,n){for(let i=0;i<n;i++)
  spawnP(x,y,z,rnd(-.6,.6),rnd(.1,.8),rnd(-.6,.6),
    rnd(.3,.5),rnd(.6,.85),rnd(.15,.25),rnd(.4,1),3);}
function emberP(x,y,z){spawnP(x,y,z,rnd(-.2,.2),rnd(.4,.9),rnd(-.2,.2),
  rnd(.85,1),rnd(.45,.65),.15,rnd(.3,.7),3);}
function partTick(dt){
  for(let i=0;i<PMAX;i++){const p=parts[i];
    if(p.life<=0){pPos[i*3+1]=-100;continue;}
    p.life-=dt;
    p.vy-=(p.kind===3?-1.2:14)*dt;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    if(p.y<0.02&&p.kind!==3){
      if(p.kind===1){if(Math.random()<.14)addPool(p.x,p.z,rnd(.12,.3));p.life=0;}
      else{p.y=.02;p.vy*=-.35;p.vx*=.6;p.vz*=.6;}}
    pPos[i*3]=p.x;pPos[i*3+1]=p.y;pPos[i*3+2]=p.z;}
  pGeo.attributes.position.needsUpdate=true;
  pGeo.attributes.color.needsUpdate=true;}
let pools,wallDecals,gibs,heads=[];
const poolMat=new THREE.MeshBasicMaterial({color:0x4a0d06,transparent:true,opacity:.85,depthWrite:false});
const splatMat=new THREE.MeshBasicMaterial({color:0x5a1008,transparent:true,opacity:.8,depthWrite:false});
const holeMat=new THREE.MeshBasicMaterial({color:0x0c0d10,transparent:true,opacity:.9,depthWrite:false});
const scorchMat=new THREE.MeshBasicMaterial({color:0x0a0a0a,transparent:true,opacity:.85,depthWrite:false});
const POOLMAX=150,WDMAX=200,GIBMAX=110;
function addPool(x,z,s){
  let m;
  if(pools.length>=POOLMAX){m=pools.shift();}
  else{m=new THREE.Mesh(new THREE.CircleGeometry(1,8),poolMat);m.rotation.x=-Math.PI/2;scene.add(m);}
  m.position.set(x,.01+Math.random()*.004,z);m.scale.set(s*.3,s*.3,1);m.userData.target=s;
  pools.push(m);}
function poolTick(dt){for(const m of pools){const t=m.userData.target;
  if(m.scale.x<t){m.scale.x=Math.min(t,m.scale.x+dt*1.4);m.scale.y=m.scale.x;}}}
function addWallDecal(x,y,z,nx,nz,s,mat){
  let m;
  if(wallDecals.length>=WDMAX){m=wallDecals.shift();m.material=mat;}
  else{m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat);scene.add(m);}
  m.scale.set(s,s*rnd(.7,1.3),1);
  m.position.set(x+nx*.012,y,z+nz*.012);
  m.lookAt(x+nx,y,z+nz);m.rotation.z=Math.random()*Math.PI;
  wallDecals.push(m);}
const gibMatsFlesh=[new THREE.MeshLambertMaterial({color:0x6e1208}),
  new THREE.MeshLambertMaterial({color:0x3a0c06}),
  new THREE.MeshLambertMaterial({color:0x9a948a})];
const gibMatsWood=[new THREE.MeshLambertMaterial({color:0x4a3826}),
  new THREE.MeshLambertMaterial({color:0x2e2418}),
  new THREE.MeshLambertMaterial({color:0x6a543a})];
const gibGeo=new THREE.BoxGeometry(.13,.13,.13);
function spawnGibs(x,y,z,n,pow,wood){
  const mats=wood?gibMatsWood:gibMatsFlesh;
  for(let i=0;i<n;i++){
    let g;
    if(gibs.length>=GIBMAX){g=gibs.shift();}
    else{g={m:new THREE.Mesh(gibGeo,mats[0])};scene.add(g.m);}
    g.m.material=mats[Math.random()*3|0];
    g.m.position.set(x,y,z);
    g.vx=rnd(-1,1)*pow;g.vy=rnd(.5,1.4)*pow;g.vz=rnd(-1,1)*pow;
    g.spin=rnd(2,9);g.live=true;g.wood=wood;
    g.m.scale.setScalar(rnd(.6,1.7));
    gibs.push(g);}
  if(!wood)blood(x,y,z,Math.min(40,n*3),3.4);}
function gibTick(dt){for(const g of gibs){if(!g.live)continue;
  g.vy-=16*dt;g.m.position.x+=g.vx*dt;g.m.position.y+=g.vy*dt;g.m.position.z+=g.vz*dt;
  g.m.rotation.x+=g.spin*dt;g.m.rotation.z+=g.spin*.7*dt;
  if(g.m.position.y<.07){g.m.position.y=.07;
    if(Math.abs(g.vy)>1.2){g.vy*=-.4;g.vx*=.5;g.vz*=.5;
      if(!g.wood&&Math.random()<.5)addPool(g.m.position.x,g.m.position.z,rnd(.15,.35));}
    else{g.live=false;g.vy=0;}}}}

/* ============================================================
   AUDIO
   ============================================================ */
let AC=null,masterG=null,echoG=null,bossPulse=null,masterVol=.5;
function audioInit(){
  AC=new (window.AudioContext||window.webkitAudioContext)();
  masterG=AC.createGain();masterG.gain.value=masterVol;masterG.connect(AC.destination);
  const dly=AC.createDelay(1);dly.delayTime.value=.34;
  const fb=AC.createGain();fb.gain.value=.42;
  echoG=AC.createGain();echoG.gain.value=1;
  echoG.connect(dly);dly.connect(fb);fb.connect(dly);dly.connect(masterG);
  const lp=AC.createBiquadFilter();lp.type="lowpass";lp.frequency.value=170;lp.connect(masterG);
  [[33,"sawtooth",.05],[49.5,"sine",.07],[24.7,"triangle",.06],[66,"sine",.025]].forEach(([f,t,g])=>{
    const o=AC.createOscillator();o.type=t;o.frequency.value=f;
    const og=AC.createGain();og.gain.value=g;
    const lfo=AC.createOscillator();lfo.frequency.value=.05+Math.random()*.07;
    const lg=AC.createGain();lg.gain.value=g*.6;
    lfo.connect(lg);lg.connect(og.gain);
    o.connect(og);og.connect(lp);o.start();lfo.start();});}
function blip(freq,dur,type,vol,slide,echo){
  if(!AC)return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=type||"square";o.frequency.setValueAtTime(freq,AC.currentTime);
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,AC.currentTime+dur);
  g.gain.setValueAtTime(vol||.15,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+dur);
  o.connect(g);
  // harsh waveforms get muffled through a lowpass so they read as dark/organic, not chiptune
  if(o.type==="square"||o.type==="sawtooth"){
    const lp=AC.createBiquadFilter();lp.type="lowpass";
    lp.frequency.value=Math.max(420,Math.min(freq*3.2,2200));lp.Q.value=.6;
    g.connect(lp);lp.connect(echo?echoG:masterG);
  } else g.connect(echo?echoG:masterG);
  o.start();o.stop(AC.currentTime+dur);}
function bang(dur,vol,low,hi){
  if(!AC)return;
  const n=AC.createBufferSource(),buf=AC.createBuffer(1,AC.sampleRate*dur,AC.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2);
  n.buffer=buf;
  const f=AC.createBiquadFilter();f.type="lowpass";f.frequency.value=low||1800;
  let node=f;
  if(hi){const h=AC.createBiquadFilter();h.type="highpass";h.frequency.value=hi;f.connect(h);node=h;}
  const g=AC.createGain();g.gain.value=vol||.4;
  n.connect(f);node.connect(g);g.connect(masterG);n.start();}
function click(vol){bang(.025,vol||.18,4000,600);}
/* one clean, deep explosion — low body thud + soft noise tail, no chiptune, no stacking */
function boom(power){
  if(!AC)return;const t0=AC.currentTime;power=power||1;
  const out=AC.createGain();out.gain.value=Math.min(.7,.5*power);out.connect(masterG);
  // sub thud (sine drop)
  const o=AC.createOscillator();o.type="sine";
  o.frequency.setValueAtTime(150,t0);o.frequency.exponentialRampToValueAtTime(38,t0+.4);
  const og=AC.createGain();og.gain.setValueAtTime(.9,t0);og.gain.exponentialRampToValueAtTime(.001,t0+.5);
  o.connect(og);og.connect(out);o.start(t0);o.stop(t0+.5);
  // low rumble noise, lowpassed, fading
  const dur=.7;const ns=AC.createBufferSource();
  const buf=AC.createBuffer(1,AC.sampleRate*dur,AC.sampleRate);const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,1.6);
  ns.buffer=buf;
  const lp=AC.createBiquadFilter();lp.type="lowpass";
  lp.frequency.setValueAtTime(900,t0);lp.frequency.exponentialRampToValueAtTime(120,t0+dur);
  const ng=AC.createGain();ng.gain.setValueAtTime(.6,t0);ng.gain.exponentialRampToValueAtTime(.001,t0+dur);
  ns.connect(lp);lp.connect(ng);ng.connect(out);ns.start(t0);ns.stop(t0+dur);}
/* ===== GUTTURAL MONSTER VOICES (Doom/Blood style, not chiptune) =====
   Built from filtered noise + detuned low oscillators + formant bandpass,
   so they read as wet, throaty, organic — never clean beeps. */
function noiseBuf(dur){
  const n=AC.createBuffer(1,Math.max(1,AC.sampleRate*dur|0),AC.sampleRate);
  const d=n.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  return n;}
/* low throaty growl: a roar with a formant + tremolo "vocal cords" */
function growl(base,dur,vol,echo){
  if(!AC)return;
  const t0=AC.currentTime;
  const out=AC.createGain();out.gain.value=vol||.5;out.connect(echo?echoG:masterG);
  // rumble oscillators (detuned, sub + body)
  [base,base*1.01,base*1.5,base*.5].forEach((f,i)=>{
    const o=AC.createOscillator();o.type=i<2?"sawtooth":"square";
    o.frequency.setValueAtTime(f*1.15,t0);
    o.frequency.exponentialRampToValueAtTime(f*.7,t0+dur);
    const g=AC.createGain();g.gain.value=(i<2?.6:.25);
    o.connect(g);g.connect(out);o.start(t0);o.stop(t0+dur);});
  // breathy noise layer through a moving bandpass (the "throat")
  const ns=AC.createBufferSource();ns.buffer=noiseBuf(dur);
  const bp=AC.createBiquadFilter();bp.type="bandpass";bp.Q.value=4;
  bp.frequency.setValueAtTime(420,t0);bp.frequency.linearRampToValueAtTime(160,t0+dur);
  const ng=AC.createGain();ng.gain.value=.5;
  ns.connect(bp);bp.connect(ng);ng.connect(out);ns.start(t0);ns.stop(t0+dur);
  // vocal-cord tremolo
  const lfo=AC.createOscillator();lfo.type="sine";lfo.frequency.value=22+Math.random()*18;
  const lg=AC.createGain();lg.gain.value=vol*.5||.25;lfo.connect(lg);lg.connect(out.gain);
  lfo.start(t0);lfo.stop(t0+dur);
  // amplitude envelope
  out.gain.setValueAtTime(.0001,t0);
  out.gain.exponentialRampToValueAtTime(vol||.5,t0+.04);
  out.gain.exponentialRampToValueAtTime(.0001,t0+dur);}
/* wet gurgle / splatter — bubbling viscera */
function gurgle(dur,vol){
  if(!AC)return;const t0=AC.currentTime;
  const out=AC.createGain();out.gain.value=vol||.4;out.connect(masterG);
  const ns=AC.createBufferSource();ns.buffer=noiseBuf(dur);
  const lp=AC.createBiquadFilter();lp.type="lowpass";lp.frequency.value=900;
  ns.connect(lp);lp.connect(out);ns.start(t0);ns.stop(t0+dur);
  // burbling pitch wobble
  const o=AC.createOscillator();o.type="sawtooth";
  o.frequency.setValueAtTime(120,t0);
  for(let i=0;i<6;i++)o.frequency.linearRampToValueAtTime(80+Math.random()*120,t0+dur*(i+1)/6);
  const og=AC.createGain();og.gain.value=.3;o.connect(og);og.connect(out);
  o.start(t0);o.stop(t0+dur);
  out.gain.setValueAtTime(vol||.4,t0);out.gain.exponentialRampToValueAtTime(.0001,t0+dur);}
/* pain yelp — short rising-then-falling throaty cry */
function pain(base,vol){
  if(!AC)return;const t0=AC.currentTime,dur=.22;
  const out=AC.createGain();out.gain.value=vol||.3;out.connect(echoG);
  const o=AC.createOscillator();o.type="sawtooth";
  o.frequency.setValueAtTime(base*1.4,t0);
  o.frequency.exponentialRampToValueAtTime(base*.6,t0+dur);
  const bp=AC.createBiquadFilter();bp.type="bandpass";bp.Q.value=3;bp.frequency.value=base*2;
  o.connect(bp);bp.connect(out);
  const ns=AC.createBufferSource();ns.buffer=noiseBuf(dur);
  const hp=AC.createBiquadFilter();hp.type="highpass";hp.frequency.value=600;
  const ng=AC.createGain();ng.gain.value=.25;ns.connect(hp);hp.connect(ng);ng.connect(out);
  ns.start(t0);ns.stop(t0+dur);
  o.start(t0);o.stop(t0+dur);
  out.gain.setValueAtTime(.0001,t0);out.gain.exponentialRampToValueAtTime(vol||.3,t0+.02);
  out.gain.exponentialRampToValueAtTime(.0001,t0+dur);}
/* death — guttural roar collapsing into a wet gurgle */
function deathCry(base){
  if(!AC)return;
  growl(base,.5,.5,true);
  setTimeout(()=>gurgle(.4,.4),180);}
/* sighting snarl per enemy archetype */
function snarl(kind){
  if(!AC)return;
  if(kind==="C"){growl(70,.7,.4,true);}          // cacodemon bellow
  else if(kind==="A"){growl(48,.9,.55,true);}    // mancubus deep groan
  else if(kind==="L"){blip(900,.18,"sawtooth",.14,1700,true);growl(220,.25,.25);} // lost soul shriek
  else if(kind==="j"){growl(180,.3,.2);bang(.06,.1,800);} // cultist chant-grunt
  else if(kind==="n"){growl(60,.7,.5,true);}     // ettin roar
  else if(kind==="k"){growl(70,.5,.4,true);blip(300,.12,"square",.08,160);} // slaughtaur
  else if(kind==="q"){blip(820,.2,"sawtooth",.12,1500,true);growl(180,.3,.25);} // afrit screech
  else if(kind==="R"){growl(90,.5,.35,true);blip(500,.2,"sine",.08,260,true);} // reiver wail
  else if(kind==="y"){growl(54,.6,.45,true);}    // gargoyle stone growl
  else if(kind==="s"){blip(680,.5,"sawtooth",.14,1500,true);growl(240,.4,.3,true);} // wailer
  else growl(110+Math.random()*60,.45,.32,true);} // generic ghoul moan
/* wet flesh door — tearing membrane, squelch, low organic groan */
function wetDoor(){
  if(!AC)return;const t0=AC.currentTime,dur=1.1;
  const out=AC.createGain();out.gain.value=.5;out.connect(echoG);
  // squelch: lowpassed noise sweeping down (suction/tearing)
  const ns=AC.createBufferSource();ns.buffer=noiseBuf(dur);
  const lp=AC.createBiquadFilter();lp.type="lowpass";
  lp.frequency.setValueAtTime(1400,t0);lp.frequency.exponentialRampToValueAtTime(180,t0+dur);
  const ng=AC.createGain();ng.gain.value=.6;
  ns.connect(lp);lp.connect(ng);ng.connect(out);ns.start(t0);ns.stop(t0+dur);
  // low organic groan underneath
  const o=AC.createOscillator();o.type="sawtooth";
  o.frequency.setValueAtTime(60,t0);o.frequency.linearRampToValueAtTime(38,t0+dur);
  const bp=AC.createBiquadFilter();bp.type="bandpass";bp.Q.value=5;bp.frequency.value=160;
  const og=AC.createGain();og.gain.value=.4;
  o.connect(bp);bp.connect(og);og.connect(out);o.start(t0);o.stop(t0+dur);
  out.gain.setValueAtTime(.0001,t0);out.gain.exponentialRampToValueAtTime(.5,t0+.06);
  out.gain.exponentialRampToValueAtTime(.0001,t0+dur);
  setTimeout(()=>gurgle(.4,.35),260);}
/* heavy stone/iron door — deep grind + low thud, no chiptune */
function stoneDoor(){
  if(!AC)return;const t0=AC.currentTime,dur=.9;
  const out=AC.createGain();out.gain.value=.45;out.connect(echoG);
  const ns=AC.createBufferSource();ns.buffer=noiseBuf(dur);
  const bp=AC.createBiquadFilter();bp.type="bandpass";bp.Q.value=2;
  bp.frequency.setValueAtTime(300,t0);bp.frequency.linearRampToValueAtTime(90,t0+dur);
  const ng=AC.createGain();ng.gain.value=.5;
  ns.connect(bp);bp.connect(ng);ng.connect(out);ns.start(t0);ns.stop(t0+dur);
  const o=AC.createOscillator();o.type="square";
  o.frequency.setValueAtTime(44,t0);o.frequency.linearRampToValueAtTime(30,t0+dur);
  const og=AC.createGain();og.gain.value=.3;o.connect(og);og.connect(out);
  o.start(t0);o.stop(t0+dur);
  out.gain.setValueAtTime(.0001,t0);out.gain.exponentialRampToValueAtTime(.45,t0+.05);
  out.gain.exponentialRampToValueAtTime(.0001,t0+dur);}
function bellToll(){if(!AC)return;
  [196,98,147].forEach((f,i)=>blip(f,2.6-i*.4,"sine",.05-i*.012,f*.99,true));}
function organChord(){if(!AC)return;
  [65.4,98,130.8,155.6].forEach(f=>blip(f,4,"square",.012,f*.995,true));}
function pianoNote(midi){
  if(!AC)return;
  const f=440*Math.pow(2,(midi-69)/12);
  [[f,"triangle",.12],[f*2,"sine",.04],[f*.5,"sine",.03]].forEach(([fr,t,v])=>{
    const o=AC.createOscillator(),g=AC.createGain();
    o.type=t;o.frequency.value=fr;
    g.gain.setValueAtTime(v,AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+1.4);
    o.connect(g);g.connect(echoG);o.start();o.stop(AC.currentTime+1.4);});}
function startBossMusic(){if(!AC||bossPulse)return;
  let beat=0;
  bossPulse=setInterval(()=>{
    bang(.09,.22,140);
    if(beat%2===1)bang(.05,.1,900,300);
    if(beat%4===3)blip(49,.25,"sawtooth",.07,46);
    beat++;},300);}
function stopBossMusic(){if(bossPulse){clearInterval(bossPulse);bossPulse=null;}}

/* ============================================================
   SUBTITLES (Adem) + ACHIEVEMENTS
   ============================================================ */
const onceSaid={};let subT=0,lastSayT=-9;
function say(id,force){
  const lines=M[id];if(!lines)return;
  const now=performance.now()/1000;
  if(!force){
    if(id.startsWith("see_")||id.startsWith("boss_")||["kickready","piano","w2","w5","w6","challenge","key"].includes(id)){
      if(onceSaid[id])return;onceSaid[id]=1;}
    if(now-lastSayT<3)return;}
  lastSayT=now;
  document.getElementById("subt").innerHTML="<b>ADEM</b><br>“"+pick(lines)+"”";
  subT=4.3;}
function ach(id,title,desc){
  if(S.ach[id])return;S.ach[id]={title,desc};
  const t=document.createElement("div");t.className="toast";
  t.innerHTML="✦ "+title+"<small>"+desc+"</small>";
  document.getElementById("toasts").appendChild(t);
  requestAnimationFrame(()=>t.style.opacity=1);
  blip(160,.5,"sine",.05,120,true);
  setTimeout(()=>{t.style.opacity=0;setTimeout(()=>t.remove(),500);},4200);}

/* ============================================================
   INPUT
   ============================================================ */
const keys={};
let yaw=Math.PI,pitch=0,locked=false,swayX=0,swayY=0,firing=false,zoomOn=false;
addEventListener("keydown",e=>{
  if(pianoOpen){pianoKeyDown(e.code);if(e.code==="KeyE")closePiano();return;}
  keys[e.code]=true;
  if(e.code==="KeyE")interact();
  if(e.code==="KeyR")startReload();
  if(e.code==="KeyZ"&&S.cur===4)zoomOn=!zoomOn;
  if(/^Digit[1-8]$/.test(e.code))requestSwitch(+e.code[5]-1);},false);
addEventListener("keyup",e=>keys[e.code]=false);
addEventListener("wheel",e=>{if(!started||pianoOpen)return;
  let i=S.cur;for(let k=0;k<6;k++){i=(i+(e.deltaY>0?1:5))%6;
    if(S.weapons[i]){requestSwitch(i);break;}}});
document.addEventListener("mousemove",e=>{if(!locked||inputLock)return;
  const sens=.0022*(1-.68*zoomLerp);
  yaw-=e.movementX*sens;pitch-=e.movementY*sens;
  pitch=clamp(pitch,-1.45,1.45);
  swayX=clamp(swayX+e.movementX*.035,-10,10);
  swayY=clamp(swayY+e.movementY*.035,-7,7);});
document.addEventListener("pointerlockchange",()=>{locked=document.pointerLockElement===renderer.domElement;});
addEventListener("mousedown",e=>{
  if(pianoOpen)return;
  if(started&&!locked&&!overlayOpen())renderer.domElement.requestPointerLock();
  if(e.button===0)firing=true;
  if(e.button===2)doKick();});
addEventListener("mouseup",e=>{if(e.button===0)firing=false;});
addEventListener("contextmenu",e=>e.preventDefault());
function overlayOpen(){return !document.getElementById("levelend").classList.contains("hidden")||
  !document.getElementById("win").classList.contains("hidden")||
  !document.getElementById("dead").classList.contains("hidden")||pianoOpen;}

/* ============================================================
   HUD MESSAGES
   ============================================================ */
const msgEl=document.getElementById("msg");let msgT=0;
function showMsg(t,sec){msgEl.textContent=t;msgT=sec||2.2;}
function flashDmg(a){const d=document.getElementById("dmg");d.style.opacity=a;
  setTimeout(()=>d.style.opacity=0,90);}
function flashHoly(a){const d=document.getElementById("holy");d.style.opacity=a;
  setTimeout(()=>d.style.opacity=0,80);}

/* ============================================================
   WEAPONS — 6 slots, state machine, interruptible reloads
   ============================================================ */
const WEAPONS=[
 {name:"FLARE PISTOL",ammo:"bullets",dmg:34,rate:.42,pellets:1,spread:.004,kind:"hit",
  magSize:6,reload:2.0,trauma:.15,kick:14,
  snd:()=>{bang(.13,.42,2400);blip(180,.08,"square",.1,60,true);}},
 {name:"SAWED-OFF SHOTGUN",ammo:"shells",dmg:9,rate:.85,pellets:8,spread:.075,kind:"hit",
  magSize:5,reload:2.1,trauma:.42,kick:26,pump:true,
  snd:()=>{bang(.24,.65,1400);bang(.1,.3,500);}},
 {name:"COMBAT RIFLE",ammo:"bullets",dmg:14,rate:.1,pellets:1,spread:.018,kind:"hit",
  magSize:24,reload:1.7,trauma:.09,kick:9,
  snd:()=>{bang(.07,.34,2600);blip(140,.05,"square",.06,70);}},
 {name:"TOMMY GUN",ammo:"bullets",dmg:8,rate:.065,pellets:1,spread:.04,kind:"hit",
  magSize:36,reload:1.5,trauma:.06,kick:6,
  snd:()=>{bang(.055,.26,3000);}},
 {name:"BMG SNIPER",ammo:"slugs",dmg:160,rate:1.4,pellets:1,spread:0,kind:"hit",
  magSize:4,reload:2.4,trauma:.32,kick:24,pierce:2,
  snd:()=>{bang(.3,.6,1900);blip(90,.3,"sawtooth",.12,40,true);}},
 {name:"HOLY CROSS LAUNCHER",ammo:"crosses",dmg:60,rate:1.1,pellets:1,spread:.005,kind:"cross",
  magSize:3,reload:2.2,trauma:.26,kick:18,
  snd:()=>{blip(520,.3,"sine",.12,780,true);bang(.1,.2,800);}},
 {name:"NAIL CANNON",ammo:"nails",dmg:11,rate:.05,pellets:1,spread:.03,kind:"hit",
  magSize:50,reload:2.0,trauma:.05,kick:5,
  snd:()=>{bang(.04,.22,3200);blip(260,.04,"square",.05,120);}},
 {name:"SOUL REAPER",ammo:"souls",dmg:75,rate:1.3,pellets:1,spread:0,kind:"reap",
  magSize:4,reload:2.6,trauma:.4,kick:22,pierce:3,
  snd:()=>{blip(70,.5,"sawtooth",.16,360,true);bang(.28,.45,500);growl(90,.4,.3,true);}},
];
let wstate="equip",wtime=0,wCool=0,pending=-1,reloadFlags={},recoilPitch=0;
let kickAmt=0,kickRot=0,muzzle=0,zoomLerp=0;
const EQUIP_T=.24,UNEQUIP_T=.16;
function requestSwitch(i){
  if(!started||!S.weapons[i]||i===S.cur||pending===i)return;
  pending=i;zoomOn=false;
  if(wstate!=="unequip"){wstate="unequip";wtime=0;click(.12);}}
function startReload(){
  if(!started||S.dead||inputLock)return;
  const w=WEAPONS[S.cur];
  if(wstate!=="idle"&&wstate!=="fire")return;
  if(S.mag[S.cur]>=w.magSize||S.ammo[w.ammo]<=0)return;
  wstate="reload";wtime=0;reloadFlags={};}
function weaponTick(dt){
  wtime+=dt;wCool-=dt;
  const w=WEAPONS[S.cur];
  if(wstate==="unequip"&&wtime>=UNEQUIP_T){
    if(pending>=0){S.cur=pending;pending=-1;}
    wstate="equip";wtime=0;click(.16);}
  else if(wstate==="equip"&&wtime>=EQUIP_T){wstate="idle";wtime=0;}
  else if(wstate==="fire"&&wtime>=Math.min(.35,w.rate)){wstate="idle";wtime=0;}
  else if(wstate==="reload"){
    const rt=wtime/w.reload;
    if(rt>.18&&!reloadFlags.a){reloadFlags.a=1;click(.16);
      if(S.cur===0)for(let i=0;i<6;i++)ejectCasing(1);
      if(S.cur===1){ejectCasing(2);ejectCasing(2);}
      if(S.cur===4)ejectCasing(3);}
    if(rt>.62&&!reloadFlags.b){reloadFlags.b=1;click(.14);}
    if(rt>=1){
      const need=w.magSize-S.mag[S.cur];
      const take=Math.min(need,S.ammo[w.ammo]);
      S.ammo[w.ammo]-=take;S.mag[S.cur]+=take;
      wstate="idle";wtime=0;click(.2);}
    if(firing&&S.mag[S.cur]>0){wstate="idle";wtime=0;}}
  if(firing&&(wstate==="idle"||wstate==="fire")&&wCool<=0&&!S.dead&&started&&!inputLock){
    if(S.mag[S.cur]<=0){
      if(S.ammo[w.ammo]>0)startReload();
      else{click(.1);wCool=.3;}}        // dry click, not a beep
    else fire(w);}
  if(wstate==="idle"&&S.mag[S.cur]===0&&S.ammo[w.ammo]>0&&wtime>.4)startReload();
  kickAmt*=Math.exp(-10*dt);kickRot*=Math.exp(-9*dt);
  muzzle=Math.max(0,muzzle-dt*9);
  muzzleLight.intensity*=Math.exp(-16*dt);
  boomLight.intensity*=Math.exp(-7*dt);
  swayX*=Math.exp(-7*dt);swayY*=Math.exp(-7*dt);
  /* sniper zoom */
  const zt=(S.cur===4&&zoomOn)?1:0;
  zoomLerp+=(zt-zoomLerp)*Math.min(1,dt*9);
  camera.fov=78-46*zoomLerp;camera.updateProjectionMatrix();
  /* kick cooldown */
  if(S.kickCd>0){S.kickCd-=dt;
    if(S.kickCd<=0){say("kickready");click(.12);}}
  kickAnim=Math.max(0,kickAnim-dt);}
function fire(w){
  S.mag[S.cur]--;wCool=w.rate;wstate="fire";wtime=0;
  S.shots++;
  kickAmt=w.kick;kickRot=(Math.random()-.5)*w.kick*.25;
  shake(w.trauma);muzzle=.4+(S.cur===1?.15:0)+(S.cur===4?.2:0);
  muzzleLight.position.copy(camera.position);
  muzzleLight.intensity=2.6+(S.cur===1?1.4:0)+(S.cur===5?1.6:0);
  muzzleLight.color.setHex(S.cur===5?0xfff0b0:0xffc878);
  w.snd();
  if(S.cur===2||S.cur===3)ejectCasing(0);
  if(S.cur===1)setTimeout(()=>{ejectCasing(2);click(.12);},300); // pump
  recoilPitch+=(S.cur===1?.04:S.cur===4?.05:S.cur===0?.022:S.cur===5?.03:.006);
  alertSound(px,pz,18);
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  volleyHit=false;
  for(let i=0;i<w.pellets;i++){
    const d=dir.clone();
    d.x+=(Math.random()-.5)*w.spread*2;d.y+=(Math.random()-.5)*w.spread*2;d.z+=(Math.random()-.5)*w.spread*2;
    d.normalize();
    if(w.kind==="hit")hitscan(d,w.dmg,S.cur);
    else if(w.kind==="reap"){
      hitscan(d,w.dmg,S.cur);
      // green energy bolt + glow tracer
      const grp=new THREE.Group();
      const core=new THREE.Mesh(new THREE.SphereGeometry(.22,8,8),reapCoreMat);
      const tail=new THREE.Mesh(new THREE.BoxGeometry(.12,.12,.7),reapTailMat);
      tail.position.z=-.35;grp.add(core);grp.add(tail);
      grp.position.copy(camera.position);
      nails.push({m:grp,vx:d.x*30,vy:d.y*30,vz:d.z*30,dmg:0,life:1.2,reap:true,spin:0});
      scene.add(grp);
      muzzleLight.color.setHex(0x7fe05a);muzzleLight.intensity=2.4;}
    else if(w.kind==="cross"){
      const grp=new THREE.Group();
      const m1=new THREE.Mesh(new THREE.BoxGeometry(.09,.5,.09),crossMat);
      const m2=new THREE.Mesh(new THREE.BoxGeometry(.3,.09,.09),crossMat);
      m2.position.y=.1;grp.add(m1);grp.add(m2);
      grp.position.copy(camera.position);grp.position.y-=.1;
      nails.push({m:grp,vx:d.x*22,vy:d.y*22,vz:d.z*22,dmg:w.dmg,life:3,cross:true,
        spin:rnd(4,7)});
      scene.add(grp);}}
  if(volleyHit)S.hitsLanded++;
  const mp=camera.position.clone().add(dir.clone().multiplyScalar(.5));
  smoke3d(mp.x,mp.y-.1,mp.z,S.cur===1?6:2);}
let volleyHit=false;
const crossMat=new THREE.MeshBasicMaterial({color:0xe8d88a});
const reapCoreMat=new THREE.MeshBasicMaterial({color:0xaff060});
const reapTailMat=new THREE.MeshBasicMaterial({color:0x4fa030,transparent:true,opacity:.7});

/* ---------- POWER KICK ---------- */
let kickAnim=0;
function doKick(){
  if(!started||S.dead||inputLock||S.kickCd>0||pianoOpen)return;
  S.kickCd=15;kickAnim=.32;
  shake(.3);bang(.15,.5,900);
  setTimeout(()=>{
    const dir=new THREE.Vector3();camera.getWorldDirection(dir);
    let hitAny=false;
    for(const e of enemies){if(e.dead)continue;
      const dx=e.x-px,dz=e.z-pz,d=Math.hypot(dx,dz);
      if(d>2.5)continue;
      const dot=(dx*dir.x+dz*dir.z)/d;
      if(dot<.55)continue;
      hitAny=true;
      const kb=e.boss?3:16;
      e.kx+=dx/d*kb;e.kz+=dz/d*kb;
      e.stun=Math.max(e.stun,e.boss?.25:.9);
      if(!e.boss&&e.maxhp<=60){e.flung=.9;e.flungT=0;}
      blood(e.x,e.h*.6,e.z,4,2);
      damageEnemy(e,15,{dir:{x:dx/d,z:dz/d},wIdx:-1});}
    for(const p of props){if(p.dead)continue;
      const dx=p.x-px,dz=p.z-pz,d=Math.hypot(dx,dz);
      if(d>2.6)continue;
      const dot=(dx*dir.x+dz*dir.z)/Math.max(.001,d);
      if(dot<.5)continue;
      hitAny=true;
      if(p.explosive)explodeBarrel(p);else breakProp(p);}
    if(hitAny){bang(.12,.4,500);shake(.15);hitStop=Math.max(hitStop,.03);}
  },110);}

/* ---------- HITSCAN ---------- */
let nails=[],orbs=[];
const orbGeo=new THREE.SphereGeometry(.16,6,6);
function solidAt(wx,wz){
  const gx=wx/CELL|0,gz=wz/CELL|0;
  const row=grid[gz];if(!row)return true;
  const ch=row[gx];if(ch===undefined)return true;
  if(ch==="#"||ch==="I"||ch==="W")return true;
  if(ch==="+"||ch==="D"||ch==="S"){const d=doors[gx+","+gz];return d&&!d.open;}
  return false;}
/* ===== arbitrary (non-orthogonal) wall segments — the Doom/Blood look =====
   Each seg: {x1,z1,x2,z2}. Rendered as angled wall meshes; collided against
   with a point-to-segment distance test; line-of-sight blocked by crossing. */
let wallSegs=[];
function distToSeg(px_,pz_,s){
  const dx=s.x2-s.x1,dz=s.z2-s.z1,L2=dx*dx+dz*dz;
  let t=L2?((px_-s.x1)*dx+(pz_-s.z1)*dz)/L2:0;t=Math.max(0,Math.min(1,t));
  const cx=s.x1+t*dx,cz=s.z1+t*dz;
  return Math.hypot(px_-cx,pz_-cz);}
function segBlocked(x,z,rad){
  for(const s of wallSegs)if(distToSeg(x,z,s)<rad)return true;
  return false;}
function segsCrossRay(ax,az,bx,bz){ // does player->target ray cross any wall segment?
  for(const s of wallSegs){
    const d1x=bx-ax,d1z=bz-az,d2x=s.x2-s.x1,d2z=s.z2-s.z1;
    const den=d1x*d2z-d1z*d2x;if(Math.abs(den)<1e-6)continue;
    const t=((s.x1-ax)*d2z-(s.z1-az)*d2x)/den;
    const u=((s.x1-ax)*d1z-(s.z1-az)*d1x)/den;
    if(t>=0&&t<=1&&u>=0&&u<=1)return true;}
  return false;}
/* per-cell floor height (0 = base). Lets us build raised galleries,
   balconies and sunken courtyards you can look/shoot down into. */
let heightMap=null;
function floorHeightAt(wx,wz){
  if(!heightMap)return 0;
  const gx=wx/CELL|0,gz=wz/CELL|0;
  const row=heightMap[gz];if(!row)return 0;
  return row[gx]||0;}
function wallNormal(x,z,dir){
  if(!solidAt(x-dir.x*.13,z))return{x:-Math.sign(dir.x),z:0};
  if(!solidAt(x,z-dir.z*.13))return{x:0,z:-Math.sign(dir.z)};
  return{x:-dir.x,z:-dir.z};}
function hitscan(dir,dmg,wIdx){
  const o=camera.position;
  const cands=[];
  enemies.forEach(e=>{if(e.dead||e.dormant)return;
    const ecy=e.fly?(e.flyH||1.5):e.h*.5+(e.fy||0);   // sprite center height
    const ex=e.x-o.x,ez=e.z-o.z,ey=ecy-o.y;
    const t=ex*dir.x+ez*dir.z+ey*dir.y;if(t<0)return;
    const cx=o.x+dir.x*t,cz=o.z+dir.z*t,cy=o.y+dir.y*t;
    const dd=Math.hypot(cx-e.x,cz-e.z);
    if(dd<e.w*.45+.1&&cy>ecy-e.h*.55&&cy<ecy+e.h*.55)cands.push({kind:"e",t,e,cy});});
  props.forEach(p=>{if(p.dead)return;
    const ex=p.x-o.x,ez=p.z-o.z;
    const t=ex*dir.x+ez*dir.z;if(t<0)return;
    const cx=o.x+dir.x*t,cz=o.z+dir.z*t,cy=o.y+dir.y*t;
    if(Math.hypot(cx-p.x,cz-p.z)<p.r+.08&&cy>0&&cy<p.hgt)cands.push({kind:"p",t,p});});
  let wallT=1e9,wx=0,wz=0,wy=0;
  for(let t=0;t<46;t+=.1){
    const sx=o.x+dir.x*t,sz=o.z+dir.z*t;
    if(solidAt(sx,sz)||(wallSegs.length&&segBlocked(sx,sz,.12))){wallT=t;wx=sx;wz=sz;wy=o.y+dir.y*t;break;}}
  cands.sort((a,b)=>a.t-b.t);
  const pierce=WEAPONS[wIdx]&&WEAPONS[wIdx].pierce||1;
  let used=0;
  for(const c of cands){
    if(c.t>wallT)break;
    if(c.kind==="p"){
      volleyHit=true;
      if(c.p.explosive){c.p.hp-=dmg;
        sparks(o.x+dir.x*c.t,o.y+dir.y*c.t,o.z+dir.z*c.t,5);
        if(c.p.hp<=0)explodeBarrel(c.p);}
      else{c.p.hp-=dmg;
        spawnGibs(o.x+dir.x*c.t,o.y+dir.y*c.t,o.z+dir.z*c.t,1,2,true);
        bang(.04,.12,1500,300);
        if(c.p.hp<=0)breakProp(c.p);}
      used++;if(used>=pierce)return;continue;}
    const e=c.e;
    volleyHit=true;
    const reg=PX[e.key].regions||{H:e.h,head:0};
    // vertical fraction up the sprite (0 feet .. 1 head)
    const ecy0=e.fly?(e.flyH||1.5):e.h*.5;
    const frac=clamp((c.cy-(ecy0-e.h*.5))/e.h,0,1);
    // horizontal: project hit point onto camera-right axis, normalized to half-width
    const rightX=Math.cos(yaw),rightZ=-Math.sin(yaw);
    const hxp=o.x+dir.x*c.t,hzp=o.z+dir.z*c.t;
    const lateral=((hxp-e.x)*rightX+(hzp-e.z)*rightZ)/(e.w*.5); // -1..1
    const head=frac>0.74&&PX[e.key].head>0;
    const leg=frac<0.26;
    const arm=!head&&!leg&&Math.abs(lateral)>0.45;
    const armSide=lateral<0?"L":"R"; // screen-space side
    const hx=hxp,hy=o.y+dir.y*c.t,hz=hzp;
    if(e.plate>0){sparks(hx,hy,hz,6);}
    else blood(hx,hy,hz,head?10:5,head?2.6:1.8);
    for(let t2=c.t;t2<c.t+6;t2+=.2){
      const sx=o.x+dir.x*t2,sz=o.z+dir.z*t2;
      if(solidAt(sx,sz)){const n=wallNormal(sx,sz,dir);
        if(Math.random()<.5&&e.plate<=0)
          addWallDecal(sx-dir.x*.06,clamp(hy+rnd(-.3,.3),.2,WALLH-.2),sz-dir.z*.06,n.x,n.z,rnd(.2,.45),splatMat);
        break;}}
    damageEnemy(e,dmg*(head?2:1),{head,leg,arm,armSide,lateral,wIdx,dir:{x:dir.x,z:dir.z},dist:c.t,hx,hy,hz});
    used++;if(used>=pierce)return;}
  if(wallT<45){
    const n=wallNormal(wx,wz,dir);
    sparks(wx-dir.x*.05,clamp(wy,.1,WALLH-.1),wz-dir.z*.05,4);
    addWallDecal(wx,clamp(wy,.15,WALLH-.15),wz,n.x,n.z,.08,holeMat);
    if(Math.random()<.3)bang(.03,.08,4000,800);}}
function crossExplode(x,y,z){
  flashHoly(.35);shake(.35);hitStop=Math.max(hitStop,.04);
  boomLight.position.set(x,y,z);boomLight.intensity=4;boomLight.color.setHex(0xfff0b0);
  holyP(x,y,z,40);smoke3d(x,y,z,10);
  boom(.7);
  for(const e of enemies){if(e.dead)continue;
    const d=Math.hypot(e.x-x,e.z-z);
    if(d<3.4){
      const dd=60*(1-d/3.4)+20;
      e.kx+=(e.x-x)/Math.max(.2,d)*6;e.kz+=(e.z-z)/Math.max(.2,d)*6;
      damageEnemy(e,dd,{explosive:true,dir:{x:(e.x-x)/Math.max(.2,d),z:(e.z-z)/Math.max(.2,d)}});}}
  for(const p of props){if(p.dead)continue;
    if(Math.hypot(p.x-x,p.z-z)<3){p.explosive?explodeBarrel(p):breakProp(p);}}
  alertSound(x,z,20);}

/* ============================================================
   2D LAYER — viewmodels, kick boot, casings, smoke, blood
   ============================================================ */
const fx=document.getElementById("fx2d"),fg=fx.getContext("2d");
let FW=640,FH=400,VW=320,VH=200;
function sizeFx(){const a=innerWidth/innerHeight;FW=640;FH=Math.round(FW/a);
  fx.width=FW;fx.height=FH;VW=320;VH=Math.round(VW/a);}
addEventListener("resize",sizeFx);sizeFx();
const casings=[],puffs=[],bloodHits=[];
function ejectCasing(kind){
  casings.push({x:FW/2+rnd(4,12),y:FH*.62,vx:rnd(20,55),vy:rnd(-70,-30),
    rot:rnd(0,6),vr:rnd(-12,12),kind,life:1.6});
  if(AC)setTimeout(()=>blip(rnd(1800,2600),.04,"square",.025),rnd(250,450));}
function screenBlood(){
  for(let i=0;i<5;i++)bloodHits.push({x:rnd(0,FW),y:rnd(0,FH),r:rnd(6,22),life:1});}
const SKIN="#7a6a52",SLEEVE="#2e3036",BOOT="#241c14",
  DARK="#1c1e22",MID="#3a3d44",LIT="#5c6068",RUST="#6e2e1c",WOOD="#4a3826",
  GLOW="#a08c5a",HOLY="#d8c87a";
/* ===== viewmodel art kit — consistent palette + shading helpers ===== */
const VM={OUT:"#07080a",
  S1:"#1e2126",S2:"#343941",S3:"#4e5560",S4:"#737b88",S5:"#9aa3b0",
  G1:"#23282e",G2:"#39414c",G3:"#566272",
  W1:"#2c2012",W2:"#46331e",W3:"#604829",W4:"#7a6038",
  R1:"#5e2716",R2:"#8a3a22",
  B1:"#7a683c",B2:"#b09a58",B3:"#dcc685",
  H2:"#f4ead0",SH:"#7a2418",SHY:"#c2ab6c",
  GLV:"#5e503c",GLV2:"#73624a"};
function vRect(x,y,w,h,c){fg.fillStyle=c;fg.fillRect(x,y,w,h);
  fg.strokeStyle=VM.OUT;fg.lineWidth=1;fg.strokeRect(x+.5,y+.5,w-1,h-1);}
function vFlat(x,y,w,h,c){fg.fillStyle=c;fg.fillRect(x,y,w,h);}
function vGrad(x,y,w,h,c1,c2){const g=fg.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,c1);g.addColorStop(1,c2);
  fg.fillStyle=g;fg.fillRect(x,y,w,h);
  fg.strokeStyle=VM.OUT;fg.lineWidth=1;fg.strokeRect(x+.5,y+.5,w-1,h-1);}
function vBarrel(x,y,w,h){ /* cylindrical: dark→light→dark */
  const g=fg.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,VM.S1);g.addColorStop(.32,VM.S4);g.addColorStop(.5,VM.S3);
  g.addColorStop(.7,VM.S2);g.addColorStop(1,VM.S1);
  fg.fillStyle=g;fg.fillRect(x,y,w,h);
  fg.strokeStyle=VM.OUT;fg.lineWidth=1;fg.strokeRect(x+.5,y+.5,w-1,h-1);}
function vTube(x,y,w,h,c1,c2,c3){const g=fg.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,c1);g.addColorStop(.4,c2);g.addColorStop(1,c3||c1);
  fg.fillStyle=g;fg.fillRect(x,y,w,h);
  fg.strokeStyle=VM.OUT;fg.lineWidth=1;fg.strokeRect(x+.5,y+.5,w-1,h-1);}
function vWood(x,y,w,h){const g=fg.createLinearGradient(x,0,x+w,0);
  g.addColorStop(0,VM.W3);g.addColorStop(.5,VM.W2);g.addColorStop(1,VM.W1);
  fg.fillStyle=g;fg.fillRect(x,y,w,h);
  fg.strokeStyle="rgba(18,11,5,.55)";fg.lineWidth=1;
  for(let i=1;i<4;i++){fg.beginPath();
    fg.moveTo(x+1,y+h*i/4+(i*7)%3-1);
    fg.bezierCurveTo(x+w*.4,y+h*i/4-2,x+w*.6,y+h*i/4+2,x+w-1,y+h*i/4);
    fg.stroke();}
  fg.strokeStyle=VM.OUT;fg.strokeRect(x+.5,y+.5,w-1,h-1);}
function vScrew(x,y){fg.fillStyle=VM.S1;fg.beginPath();fg.arc(x,y,1.7,0,7);fg.fill();
  fg.strokeStyle=VM.S4;fg.lineWidth=1;
  fg.beginPath();fg.moveTo(x-1.1,y);fg.lineTo(x+1.1,y);fg.stroke();}
function vHole(x,y,r){fg.fillStyle="#0a0b0d";fg.beginPath();fg.arc(x,y,r,0,7);fg.fill();
  fg.strokeStyle=VM.S3;fg.lineWidth=.8;fg.beginPath();fg.arc(x,y,r,0,7);fg.stroke();}
function vTrigger(x,y){ /* guard loop + blade */
  fg.strokeStyle=VM.S2;fg.lineWidth=2.4;
  fg.beginPath();fg.arc(x,y,6.5,.15*Math.PI,.95*Math.PI);fg.stroke();
  fg.strokeStyle=VM.OUT;fg.lineWidth=1;
  fg.beginPath();fg.arc(x,y,7.7,.15*Math.PI,.95*Math.PI);fg.stroke();
  fg.fillStyle=VM.S4;fg.fillRect(x-1.2,y-3,2.4,5);}
/* per-weapon muzzle tip (flash alignment) */
const MUZ=[{y:-90,r:1},{y:-82,r:1.7},{y:-101,r:1},{y:-90,r:1.2},{y:-109,r:1.6},{y:-91,r:1.4},{y:-95,r:1.3},{y:-92,r:2}];
/* ============================================================
   WEAPON PIXEL SPRITES (Doom/Blood-style painted look)
   Each weapon is hand-pixeled at low res then nearest-neighbor
   upscaled — the same technique the real games used.
   Frames: idle / fire / reloadA / reloadB. Drawn anchored to
   bottom-center; muzzle tip sits at the top.
   ============================================================ */
function pxCanvas(rows,pal){
  const w=rows[0].length,h=rows.length,S=3;        // 3x supersample for detail
  const c=document.createElement("canvas");c.width=w*S;c.height=h*S;
  const g=c.getContext("2d");
  const at=(x,y)=>{if(y<0||y>=h||x<0||x>=rows[y].length)return " ";return rows[y][x]||" ";};
  const lit=(hex,f)=>{ // shift a hex color lighter(+)/darker(-)
    if(!hex||hex[0]!=="#"||hex.length<7)return hex;
    let r=parseInt(hex.slice(1,3),16),gg=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    r=Math.max(0,Math.min(255,r+f));gg=Math.max(0,Math.min(255,gg+f));b=Math.max(0,Math.min(255,b+f));
    return "rgb("+r+","+gg+","+b+")";};
  rows.forEach((row,y)=>{for(let x=0;x<row.length;x++){
    const k=row[x];if(k===" ")continue;
    const base=pal[k];if(!base||base==="#00000000")continue;
    g.fillStyle=base;g.fillRect(x*S,y*S,S,S);
    const up=at(x,y-1)===" ",lf=at(x-1,y)===" ",dn=at(x,y+1)===" ",rt=at(x+1,y)===" ";
    if(up||lf){g.fillStyle=lit(base,34);
      if(up)g.fillRect(x*S,y*S,S,1);
      if(lf)g.fillRect(x*S,y*S,1,S);}
    if(dn||rt){g.fillStyle=lit(base,-30);
      if(dn)g.fillRect(x*S,y*S+S-1,S,1);
      if(rt)g.fillRect(x*S+S-1,y*S,1,S);}
  }});
  return c;}
/* shared gun palette — cold gunmetal ramp, brass, wood, glove */
const GP={
 " ":"#00000000",".":"#08090b",            // transparent / black outline
 a:"#121317",b:"#1d2025",c:"#2b2f37",d:"#3c424c",e:"#525a66",f:"#6e7783",g:"#8e98a6",h:"#b2bcc9", // steel 8-step
 w:"#241a0e",x:"#3c2c18",y:"#543e22",z:"#6e5230",Z:"#8a6a40",                  // wood 5-step
 r:"#52220f",s:"#7e3219",t:"#a85230",                                          // rust 3
 m:"#6a5a30",n:"#998148",o:"#c8b06a",p:"#e6d690",                              // brass 4
 R:"#7a190c",S:"#b8341c",T:"#e85a2c",H:"#f4ead0",E:"#d8d0b8",                  // shell / bone / bone-shade
 G:"#3e3324",K:"#544532",J:"#6e5b42",                                          // glove dark/mid/light
 L:"#2e3540",P:"#161a22",N:"#454f5e",                                          // blued steel 3
 Q:"#cfe6ff",U:"#3a5a80",V:"#7aa0c8",                                          // scope lens hi/mid/lo
 B:"#b89a58",C:"#e8d68a",F:"#ff9038",I:"#ffd27a",W:"#fff0c0",        // brass-bright / holy / flame / hot / white-hot
 j:"#2a6a3a",0:"#7fe05a"};                                            // energy green dark / bright
const WPX={};
function wcv(key,frame,rows){WPX[key]=WPX[key]||{};WPX[key][frame]=pxCanvas(rows,GP);}
/* frames stored as arrays: idle[], fire[N], reload[N]. Higher-res art (≈30px). */
function buildWeaponSprites(){
 const W={};
 // helper: register a list of frames under a name
 const reg=(key,name,frames)=>{WPX[key]=WPX[key]||{};WPX[key][name]=frames.map(f=>pxCanvas(f,GP));};

 /* ===================== 0: FLARE PISTOL ===================== */
 const pistolIdle=[
  "         .ddhd.          ","        .dcbbhd.         ","        .dcabhd.         ","        .dcabhd.         ",
  "        .dcabhd.         ","        .dcabhd.         ","       .mpooonm.         ","       .mpooonm.         ",
  "      .bmpooonmd.        ","     .abcgghddee.        ","    .abcdggfddee.        ","    .abc..dggfee.        ",
  "   .Gabc...dggfee.J.     ","   GJKbc....dggeeKJG     ","  GJKKJbc..dggeeJKKJG    ","  GJKKKKbcdggeKKKKJG     ",
  "  .JKKKKKKKKKKKKKJ.      ","   .GJKKKKKKKKKJG.       ","    .GJKKKKKKKJG.        ","     .GGJJJJJGG.         ",
  "      .GGGGGGG.          "
 ];
 const pistolFire1=pistolIdle.map(r=>r); // recoil handled in code; flash drawn separately
 reg(0,"idle",[pistolIdle]);
 reg(0,"fire",[pistolIdle,pistolIdle]); // 2-step (code adds recoil/flash)
 reg(0,"reload",[
  pistolIdle,
  [
  "         .ddhd.          ","        .dcbbhd.         ","        .dcabhd.         ","        .dcabhd.         ",
  "        .dcabhd.         ","        .dcabhd.         ","       .mpooonm.         ","       .mpooonm.         ",
  "      .bmpooonmd.        ","     .abcgghddee.        ","    .abcdggfddee.        ","    .abc..dggfee.        ",
  "   .Gabc...dggfee.       ","   GJKbc....dggee.       ","  ..JKbc..dggee...       ","  .SS.bcdgg.SS..         ",
  "  .ooS......oS..         ","   .So......So.          ","    .S......S.           ","     ........            ",
  "                         "
 ],
  pistolIdle]);

 /* ===================== 1: SAWED-OFF DOUBLE BARREL ===================== */
 const sgIdle=[
  "  .aab.      .baa.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ",
  "  .abddb.  .bddba.   ","  .acddb.  .bddca.   ","  .acdec.  .cedca.   ","  .acdec.  .cedca.   ",
  "  .acdec.. .cedca.   ","   .bbcccdddeeb.     ","   .bccSdSddeeb.     ","   .bcSSSSSSeeb.     ",
  "  .GbccSdSSdee.J.    ","  GJKbccddddeeKJG    "," GJKKwxyzZZyxwKKJG   "," GJKKwxyZppZyxwKJG   ",
  " .JKwxyzZZZyxw.J.    ","   .wxyyzZZyxw.      ","   .wxxyyzzxw.       ","    .wwxxyyzw.       ",
  "     .wwxxyw.        "
 ];
 reg(1,"idle",[sgIdle]);
 reg(1,"fire",[sgIdle,sgIdle]);
 reg(1,"reload",[
  sgIdle,
  // break open
  [
  "   ...........      ","  .aabbaaaabba.     ","  .abccbabccba.     ","  .acddcacddca.     ",
  "  ..S......S....    ","  .SSS....SSS...    ","  .ooo....ooo...    ","   .bbcccdddeeb.    ",
  "   .bcccddddeeb.    ","  .GbccddddeeKJG.   ","  GJKbcccddeeKKG    "," GJKKwxyzZZyxwKKJG  ",
  " .JKwxyzZppZyxwKJ.  ","   .wxyyzZZyxw.     ","   .wxxyyzzxw.      ","    .wwxxyyzw.      ",
  "     .wwxxyw.       ","                    ","                    ","                    ",
  "                    "
 ],
  // shells in
  [
  "   ...........      ","  .aabbaaaabba.     ","  .abccbabccba.     ","  .acddcacddca.     ",
  "  ..So.....So...    ","  .SSo....SSo...    ","  .ooo....ooo...    ","   .bbcccdddeeb.    ",
  "   .bcccddddeeb.    ","  .GbccddddeeKJG.   ","  GJKbcccddeeKKG    "," GJKKwxyzZZyxwKKJG  ",
  " .JKwxyzZppZyxwKJ.  ","   .wxyyzZZyxw.     ","   .wxxyyzzxw.      ","    .wwxxyyzw.      ",
  "    SS.....SS       ","   .So.   .oS.      ","   .SH.   .HS.      ","    HH     HH       ",
  "                    "
 ],
  sgIdle]);

 /* ===================== 2: COMBAT RIFLE ===================== */
 const arIdle=[
  "      .aac.          ","      .Lbc.          ","      .Lbc.          ","     .LNbc.          ",
  "     .LNbc.          ","    .LLNbcd.         ","   .LLNbccddee.      ","  .LNNbccdddeeg.     ",
  "  .LNbc.PPP.eeg.     ","  .LNbc.PPP.eeg.     ","  .GLNbcccdddeeJ.    ","  GJKLNbccddeegKJG   ",
  "  .JKLNbcdee.gKJ.    ","    .LNbcdee.g.      ","    .LNPbdee.        ","    .LNPbdee.        ",
  "    .LLPPee.         ","     .LPPe.          ","     .LLPe.          ","     .LLe.           ",
  "      .Le.           "
 ];
 reg(2,"idle",[arIdle]);
 reg(2,"fire",[arIdle,arIdle,arIdle]); // 3-step rapid (code adds shake/flash)
 reg(2,"reload",[
  arIdle,
  [
  "      .aac.          ","      .Lbc.          ","     .LNbc.          ","    .LLNbcd.         ",
  "   .LLNbccddee.      ","  .LNNbccdddeeg.     ","  .GLNbcccdddeeJ.    ","  GJKLNbccddeegKJG   ",
  "   .JKLNbcdeegKJ.    ","    .LNbcdee.g.      ","    .LNbcdee.        ","    ...PPee...       ",
  "    .ePPnPPe.        ","    .ePPnPPe.        ","   G.ePPnPPe.G       ","   GK.ePPPPe.KG      ",
  "    K.ePPPe.K        ","     .PPPP.          ","      .KK.           ","                     ",
  "                     "
 ],
  arIdle]);

 /* ===================== 3: TOMMY GUN ===================== */
 const tgIdle=[
  "      .ccd.          ","      .dce.     .e.  ","      .dce.    .eeg. ","     .ddce.   .eebg. ",
  "    .dddccccccdeeb.  ","    .ddcccccccceeb.  ","    .ddc......ceeb.  ","    .bbccccccddee.   ",
  "   .Gbcc.nno.deeKJ.  ","  GJKwxynoonyyxKKJG  ","  .JKwxynppponyxKJ.  ","  .wxynoppppony.x.   ",
  "  .wxynno..onnyx.    ","  .wxyno.bb.onyx.    ","  .Gwxynnoonnyxz.J.  ","  GJKwxyyzzZZyxzKKJG ",
  "  .JKwxxyyzZyxz.J.   ","    .wxxyyzzyxz.     ","    .wwxxyyzzxz.     ","     .wwxxyyzw.      ",
  "      .wwxxw.        "
 ];
 reg(3,"idle",[tgIdle]);
 reg(3,"fire",[tgIdle,tgIdle,tgIdle]);
 reg(3,"reload",[
  tgIdle,
  [
  "      .ccd.          ","      .dce.          ","      .dce.          ","     .ddce.          ",
  "    .dddcccccc.      ","    .ddccccccccb.    ","    .ddc.......b.    ","    .bbcccccccee.    ",
  "   .Gbccccccdeeb.    ","  GJKwxyyzzZZyxzKKJG ","  .JKwxxyyzzyxzKJ.   ","    .wxyyzzyxz.      ",
  "   ..nnoonn..        ","   .nopppponn.       ","   .noppppponn.      ","   .nnooooonn.       ",
  "   GK.nnoonn.KG      ","    K.nnonn.K        ","     .nnnn.          ","      .KK.           ",
  "                     "
 ],
  tgIdle]);

 /* ===================== 4: BMG SNIPER ===================== */
 const snIdle=[
  "      .aac.          ","      .Lbc.          ","      .Lbc.          ","      .Lbc.          ",
  "      .Lbc.          ","    .eePccPee.       ","   .ePUVQVUPe.       ","   .ePVQQQVPe.       ",
  "   .ePUVQVUPe.       ","  .eccccccccb.       ","   .LLNbccdeeg.      ","   .LNbc.deeb.       ",
  "  .GLNbccddeegJ.     ","  GJKLNbccdeegKJG    ","   .JKwxyzZeKJ.      ","    .wxyzze.         ",
  "    .wxyzze.         ","    .wwxyzz.         ","     .wxzz.          ","     .wwz.           ",
  "      .wz.           "
 ];
 reg(4,"idle",[snIdle]);
 reg(4,"fire",[snIdle,snIdle]);
 reg(4,"reload",[
  snIdle,
  [
  "      .aac.          ","      .Lbc.          ","      .Lbc.          ","    .eePccPee.       ",
  "   .ePUVQVUPe.       ","   .ePVQQQVPe.       ","  .eccccccccb.       ","   .LLNbccdeeg.      ",
  "  .GLNbccddeegJ.     ","  GJKLNbccdeegKJG    ","   .JKwxyzZeKJ.      ","    ..eeoee..        ",
  "    .eoooooe.        ","    .eoooooe.        ","   GK.eooooe.KG      ","    K.eoooe.K        ",
  "     .eooe.          ","      .KK.           ","                     ","                     ",
  "                     "
 ],
  snIdle]);

 /* ===================== 5: HOLY CROSS LAUNCHER ===================== */
 const crIdle=[
  "      .mmnn.         ","     .mBnnBm.        ","     .mB..Bm.        ","     .mn.Cnm.        ",
  "     .mnCCnm.        ","    .mmnoonmm.       ","   .mBnooooBnm.      ","  .mnooooooonm.      ",
  "  .mnoo.CC.oonm.     ","  .mnoCCWWCConm.     ","  .mnoo.CC.oonm.     ","  .GmnooooooonmJ.    ",
  "  GJKmmnoooonmKJG    ","  .JKwxyzZZyxwKJ.    ","    .wxyzZZyxw.      ","    .wxy.zzyxw.      ",
  "    .wwx.zzyxw.      ","     .wx.zzxw.       ","     .wwzzzzw.       ","      .wwzzw.        ",
  "       .wwz.         "
 ];
 reg(5,"idle",[crIdle]);
 reg(5,"fire",[crIdle,crIdle]);
 reg(5,"reload",[
  crIdle,
  [
  "      .mmnn.         ","     .mBnnBm.        ","     .mnoonm.        ","    .mmnoonmm.       ",
  "   .mBnooooBnm.      ","  .mnooooooonm.      ","  .GmnooooooonmJ.    ","  GJKmmnoooonmKJG    ",
  "  .JKwxyzZZyxwKJ.    ","    .wxyzZZyxw.      ","     CCWWC..         ","    CWWWWC..         ",
  "   C.CCWC.JK         ","    CCWCC.K          ","    .CCCC.           ","     CCC.            ",
  "      C.             ","                     ","                     ","                     ",
  "                     "
 ],
  crIdle]);

 /* ===================== 6: NAIL CANNON ===================== */
 const ncIdle=[
  "  .a..a..a..a.       ","  .b..b..b..b.       ","  .b..b..b..b.       ","  .baabaabaab.       ",
  "  .bccbccbccb.       ","  .bcdcdcdccb.       ","  .ddddddddde.       ","  .dccccccddee.      ",
  " .Gddcccccddeeg.     ","  GJKddccddeegKJG    ","  .JKLddcddeegKJ.    ","  .LLddccddee.       ",
  "  .Ldd.PP.dee.       ","  .Gdd.PP.dee.J.     ","  GJKwxyzZZyxzKJG    ","  .JKwxxyyzzxzJ.     ",
  "    .wwxxyyzzw.      ","     .wwxxyzw.       ","      .wwxyw.        ","       .wwz.         ",
  "        .w.          "
 ];
 reg(6,"idle",[ncIdle]);
 reg(6,"fire",[ncIdle,ncIdle,ncIdle]);
 reg(6,"reload",[
  ncIdle,
  [
  "  .a..a..a..a.       ","  .b..b..b..b.       ","  .baabaabaab.       ","  .bccbccbccb.       ",
  "  .ddddddddde.       ","  .dccccccddee.      "," .Gddcccccddeeg.     ","  GJKddccddeegKJG    ",
  "  .JKwxyzZZyxzKJ.    ","    .wwxxyyzzw.      ","    .HHHHHHH..       ","   .HnHnHnHn..       ",
  "   .HHHHHHHH.        ","   GK.HHHHH.KG       ","    K.HHH.K          ","     ....            ",
  "                     ","                     ","                     ","                     ",
  "                     "
 ],
  ncIdle]);

 /* ===================== 7: SOUL REAPER ===================== */
 const srIdle=[
  "      .EEEE.         ","    .EHHHHHHE.       ","   .EH.0jj0.HE.      ","   .H.0jWWj0.H.      ",
  "  .EH.jWGGWj.HE.     ","  .EHjWG00GWjHE.     ","  .EH.jWGGWj.HE.     ","   .H.0jWWj0.H.      ",
  "   .EH.0jj0.HE.      ","  .GEHHHHHHHHEgJ.    ","  GJKEEHHHHHEEKJG    ","  .JKaEHHHHEaKJ.     ",
  "   .LaaEHHEaaL.      ","  .LLaa.PP.aaL.      ","  GJKwxyzZZyxzKJG    ","  .JKwxxyyzzxzJ.     ",
  "    .wwxxyyzzw.      ","     .wwxxyzw.       ","      .wwxyw.        ","       .wwz.         ",
  "        .w.          "
 ];
 reg(7,"idle",[srIdle]);
 reg(7,"fire",[srIdle,srIdle,srIdle]);
 reg(7,"reload",[
  srIdle,
  [
  "      .EEEE.         ","    .EHHHHHHE.       ","   .EH0jjjj0HE.      ","  .EHjWGGGGWjHE.     ",
  "  .EHjWG00GWjHE.     ","  .GEHHHHHHHHEgJ.    ","  GJKEEHHHHHEEKJG    ","  .JKaEHHHHEaKJ.     ",
  "   .LaaEHHEaaL.      ","  GJKwxyzZZyxzKJG    ","    .jj00jj..        ","   .j0GGGG0j.        ",
  "   .0GGGGGG0.        ","   GK.0GG0.KG        ","    K.00.K           ","     ....            ",
  "                     ","                     ","                     ","                     ",
  "                     "
 ],
  srIdle]);
}
/* time-based frame selection: animates fire & reload */
function frameFor(idx,rT){
  const set=WPX[idx];if(!set)return null;
  if(rT>=0){ // reload: spread frames across the reload duration
    const fr=set.reload||[set.idle[0]];
    const k=Math.min(fr.length-1,Math.floor(rT*fr.length));
    return fr[k];}
  if(wstate==="fire"&&set.fire){
    const w=WEAPONS[idx];
    const ft=1-(wtime/Math.max(.001,w.rate)); // 0..1 through the shot
    const fr=set.fire;
    const k=Math.min(fr.length-1,Math.floor(ft*fr.length));
    return fr[k]||set.idle[0];}
  return set.idle[0];}
function fxTick(dt,t){
  fg.setTransform(1,0,0,1,0,0);
  fg.clearRect(0,0,FW,FH);
  fg.imageSmoothingEnabled=false;
  const SF=FW/320;            // scale factor: draw in 320-space, upscale crisply
  fg.scale(SF,SF);
  for(let i=bloodHits.length-1;i>=0;i--){const b=bloodHits[i];
    b.life-=dt*.6;if(b.life<=0){bloodHits.splice(i,1);continue;}
    fg.fillStyle=`rgba(110,18,8,${b.life*.5})`;
    fg.beginPath();fg.arc(b.x,b.y,b.r,0,7);fg.fill();}
  for(let i=casings.length-1;i>=0;i--){const c=casings[i];
    c.life-=dt;c.vy+=240*dt;c.x+=c.vx*dt;c.y+=c.vy*dt;c.rot+=c.vr*dt;
    if(c.life<=0||c.y>VH+10){casings.splice(i,1);continue;}
    fg.save();fg.translate(c.x,c.y);fg.rotate(c.rot);
    fg.fillStyle=c.kind===2?"#8a2a14":c.kind===3?"#b8b2a6":"#a08c5a";
    fg.fillRect(-2,-1,c.kind===2?5:c.kind===3?6:4,2);
    if(c.kind===2){fg.fillStyle="#a08c5a";fg.fillRect(-2,-1,1,2);}
    fg.restore();}
  for(let i=puffs.length-1;i>=0;i--){const p=puffs[i];
    p.life-=dt;p.y-=14*dt;p.x+=p.vx*dt;p.r+=8*dt;
    if(p.life<=0){puffs.splice(i,1);continue;}
    fg.fillStyle=`rgba(120,120,128,${p.life*.16})`;
    fg.beginPath();fg.arc(p.x,p.y,p.r,0,7);fg.fill();}
  /* sniper scope overlay */
  if(zoomLerp>.5){
    fg.fillStyle="rgba(0,0,0,"+((zoomLerp-.5)*1.6)+")";
    const r=VH*.42;
    fg.beginPath();fg.rect(0,0,VW,VH);
    fg.arc(VW/2,VH/2,r,0,7,true);fg.fill();
    fg.strokeStyle="rgba(180,178,166,.6)";fg.lineWidth=1;
    fg.beginPath();fg.moveTo(VW/2-r,VH/2);fg.lineTo(VW/2+r,VH/2);
    fg.moveTo(VW/2,VH/2-r);fg.lineTo(VW/2,VH/2+r);fg.stroke();}
  drawKickBoot();
  drawViewmodel(dt,t);}
function drawKickBoot(){
  if(kickAnim<=0)return;
  const p=1-kickAnim/.32;
  const ext=Math.sin(p*Math.PI);
  fg.save();
  /* motion streaks */
  if(ext>.3){fg.strokeStyle="rgba(180,178,166,"+(ext*.25)+")";fg.lineWidth=2;
    for(let i=0;i<3;i++){fg.beginPath();
      fg.moveTo(VW/2+44+i*9,VH-ext*VH*.3+i*14);
      fg.lineTo(VW/2+10+i*9,VH-ext*VH*.55+i*14);fg.stroke();}}
  fg.translate(VW/2+30-ext*26,VH+40-ext*(VH*.62));
  fg.rotate(-.5+ext*.25);
  const s=VH/200*1.4;fg.scale(s,s);
  vGrad(-10,18,24,60,SLEEVE,"#1e2026");                 // trouser leg
  fg.fillStyle="rgba(0,0,0,.3)";fg.fillRect(-10,30,24,3); // crease
  vGrad(-16,-8,36,30,"#32281c",BOOT);                   // boot leather
  fg.fillStyle="rgba(140,120,90,.25)";fg.fillRect(-16,-8,36,3); // top sheen
  vRect(-16,16,36,8,"#0e0b07");                          // sole
  fg.fillStyle="#1c1610";                                // tread
  for(let i=0;i<5;i++)fg.fillRect(-14+i*7,22,4,3);
  fg.strokeStyle="#0a0806";fg.lineWidth=1.4;             // laces
  for(let i=0;i<3;i++){fg.beginPath();
    fg.moveTo(-10,-4+i*6);fg.lineTo(4,0+i*6);fg.stroke();
    fg.beginPath();fg.moveTo(4,-4+i*6);fg.lineTo(-10,0+i*6);fg.stroke();}
  vRect(8,-4,8,6,VM.B1);                                 // buckle
  fg.fillStyle=VM.B3;fg.fillRect(10,-2,4,2);
  fg.restore();}
function drawViewmodel(dt,tNow){
  if(!started||S.dead||pianoOpen)return;
  if(zoomLerp>=.85&&S.cur===4)return; // scoped: hide rifle
  const w=WEAPONS[S.cur];
  const spd=Math.hypot(vx,vz);
  const sprint=(keys.ShiftLeft||keys.ShiftRight)&&spd>7;
  /* bob only scales in once you're actually moving; near-zero when still */
  const moveAmt=clamp((spd-0.6)/6.4,0,1);          // 0 when standing
  const bobAmt=moveAmt*(sprint?0.55:0.28);         // subtle walk, slightly more sprint (Doom-like)
  const bx=Math.sin(bobT*4)*2.4*bobAmt;
  const by=Math.abs(Math.cos(bobT*4))*1.8*bobAmt;
  let oy=0,rot=0;
  if(wstate==="equip"){const p=1-wtime/EQUIP_T;oy=p*p*120;rot=p*.4;}
  if(wstate==="unequip"){const p=wtime/UNEQUIP_T;oy=p*p*120;rot=p*.4;}
  /* idle breathing: tiny, and fades out entirely while moving */
  const idleB=Math.sin(tNow*.0011)*0.7*(1-moveAmt);
  const ky=kickAmt*1.3;
  const rT=wstate==="reload"?wtime/w.reload:-1;
  let rdy=0;
  if(rT>=0){ // reload dip/bob
    rdy=Math.sin(clamp(rT,0,1)*Math.PI)*42;}
  const cv=frameFor(S.cur,rT);
  const pw=cv.width,ph=cv.height;
  /* upscale: a bit smaller so it doesn't dominate the screen */
  const targetH=VH*0.42;
  const sc=targetH/ph;
  const drawW=pw*sc,drawH=ph*sc;
  const cx=VW/2+bx+swayX*.25;
  const cyTop=VH-drawH+12+by+idleB+swayY*.2+ky+oy+rdy; // bottom-anchored
  fg.save();
  fg.translate(cx,cyTop+drawH/2);
  fg.rotate((rot+kickRot*.013+swayX*.0008));
  fg.imageSmoothingEnabled=false;
  // recoil: sharp kick back/down then settle, scaled per shot progress
  let punch=0,punchX=0;
  if(wstate==="fire"){
    const w=WEAPONS[S.cur];
    const ft=clamp(1-(wtime/Math.max(.001,w.rate)),0,1);
    const env=Math.sin(Math.min(1,ft*3)*Math.PI); // fast rise, settle
    punch=env*(8+w.kick*0.7);
    punchX=Math.sin(ft*22)*env*2.2;
  }
  fg.drawImage(cv,-drawW/2+punchX,-drawH/2+punch,drawW,drawH);
  fg.restore();
  /* muzzle flash anchored to the sprite's top-center barrel */
  if(muzzle>0){
    const my=cyTop+drawH*0.04; // near the barrel tip
    const r=(10+Math.random()*10)*(MUZ[S.cur].r);
    const col=S.cur===5?["255,250,220","235,210,140","220,180,90"]:["255,240,190","255,170,80","255,120,40"];
    fg.save();fg.translate(cx,my);
    fg.fillStyle=`rgba(${col[0]},${Math.min(1,muzzle*2.2)})`;
    fg.beginPath();
    fg.moveTo(0,-r*1.5);fg.lineTo(r*.22,-r*.22);fg.lineTo(r*1.4,0);
    fg.lineTo(r*.22,r*.22);fg.lineTo(0,r*1.2);fg.lineTo(-r*.22,r*.22);
    fg.lineTo(-r*1.4,0);fg.lineTo(-r*.22,-r*.22);fg.closePath();fg.fill();
    const grd=fg.createRadialGradient(0,0,2,0,0,r*1.3);
    grd.addColorStop(0,`rgba(${col[1]},${muzzle})`);
    grd.addColorStop(1,`rgba(${col[2]},0)`);
    fg.fillStyle=grd;fg.beginPath();fg.arc(0,0,r*1.3,0,7);fg.fill();
    fg.restore();
    if(Math.random()<.6)puffs.push({x:cx+rnd(-5,5),y:my,vx:rnd(-6,6),r:3,life:rnd(.5,1)});}
}
/* ============================================================
   AMBIENT AUDIO + MISSING PARTICLE HELPER
   ============================================================ */
function woodP(x,y,z,n){for(let i=0;i<n;i++)
  spawnP(x,y,z,rnd(-2.5,2.5),rnd(.6,3.4),rnd(-2.5,2.5),
    rnd(.32,.45),rnd(.2,.3),rnd(.08,.14),rnd(.4,.9),2);}
let ambT=6,heartT=0,breathT=0;
function ambience(dt){
  if(!AC)return;ambT-=dt;if(ambT>0)return;
  ambT=rnd(8,18);
  const r=Math.random();
  if(r<.28)blip(rnd(480,720),1.4,"sine",.022,rnd(140,200),true);      // distant scream
  else if(r<.5)for(let i=0;i<3;i++)setTimeout(()=>bang(.08,.05,400),i*rnd(120,260)); // machinery
  else if(r<.72){bang(.3,.03,6000,1800);setTimeout(()=>bang(.15,.025,6000,1800),200);} // static
  else blip(rnd(1200,2200),.08,"sine",.03,undefined,true);            // drip
}
function vitalsAudio(dt){
  if(!AC||S.dead)return;
  if(S.hp<35){heartT-=dt;
    if(heartT<=0){heartT=S.hp<15?.55:.85;
      blip(52,.1,"sine",.22,40);setTimeout(()=>blip(48,.12,"sine",.18,36),130);}}
  if(S.hp<50){breathT-=dt;
    if(breathT<=0){breathT=rnd(2.2,3);bang(.5,.04,900,300);}}}

/* ============================================================
   WORLD STATE + LEVEL LOADER
   ============================================================ */
let grid,GW,GH,doors,enemies,props,items,torches,candles,exitPos,pianoPos,
  challenge,bossRef,poisonZones,rings,strikes,cine=null,eventT=40,idleT=28;
let px=3,pz=3,vx=0,vy=0,vz=0,pyy=EYE,grounded=true,bobT=0,lastBobSin=0,spawnGuard=0;
const R=.35;
const EDEF={
 z:{hp:50, sp:2.4,mel:12,w:1.0, h:1.4, pain:170,fling:true},
 f:{hp:35, sp:5.2,mel:10,w:.9,  h:1.25,pain:260,dodge:true},
 g:{hp:30, sp:6.0,mel:9, w:1.25,h:.8,  pain:430,lunge:true},
 m:{hp:55, sp:2.2,mel:14,w:1.0, h:1.4, pain:150,plate:45},
 t:{hp:65, sp:2.0,mel:12,w:1.1, h:1.45,pain:200,range:12,toxic:true,fling:true},
 w:{hp:30, sp:2.6,mel:8, w:1.15,h:.65, pain:240},
 s:{hp:40, sp:3.0,mel:8, w:.95, h:1.35,pain:520,scream:true},
 C:{hp:120,sp:2.3,mel:14,w:1.5, h:1.5, pain:200,range:15,fly:true,flyH:1.7,orb:"caco"},  // Cacodemon
 A:{hp:260,sp:1.3,mel:18,w:1.8, h:1.8, pain:90, kbRes:.6,range:13,orb:"manc",twin:true}, // Mancubus
 L:{hp:24, sp:6.4,mel:14,w:.7,  h:.7,  pain:600,fly:true,flyH:1.4,charger:true},         // Lost Soul
 j:{hp:45, sp:3.2,mel:9, w:.9,  h:1.4, pain:240,range:14,dodge:true,orb:"cult"},          // Cultist
 n:{hp:130,sp:2.8,mel:24,w:1.3, h:1.7, pain:130,kbRes:.4,slam:true,fling:true},               // Ettin
 B:{hp:230,sp:2.1,mel:30,w:1.7, h:1.9, pain:90, kbRes:.7,slam:true},
 E:{hp:850, sp:2.7,mel:38,w:2.1,h:2.5,pain:80,kbRes:.85,boss:true,charge:true,
    name:"THE MUTANT EXECUTIONER",title:"warden of the dungeon"},
 U:{hp:700, sp:2.0,mel:26,w:1.9,h:2.2,pain:60,kbRes:.92,boss:true,range:13,stone:true,
    name:"THE CATHEDRAL GUARDIAN",title:"it has always stood here"},
 Q:{hp:1800,sp:2.6,mel:26,w:1.7,h:2.6,pain:55,kbRes:1,boss:true,priest:true,
    name:"THE CORRUPTED PRIEST",title:"he still holds mass"},
 Z:{hp:2400,sp:2.4,mel:30,w:1.9,h:2.9,pain:45,kbRes:1,boss:true,priest:true,sovereign:true,
    name:"THE BONE SOVEREIGN",title:"it wore every crown that rotted here"},
 N:{hp:1500,sp:3.0,mel:24,w:1.6,h:2.3,pain:60,kbRes:1,boss:true,priest:true,sovereign:true,
    name:"THE GRAVEDIGGER",title:"he buries everyone eventually"},
 H:{hp:2200,sp:2.2,mel:32,w:2.4,h:2.6,pain:40,kbRes:1,boss:true,priest:true,sovereign:true,
    name:"THE HOLLOW LEVIATHAN",title:"it learned to breathe the filth"},
 V:{hp:2600,sp:2.2,mel:34,w:2.2,h:2.7,pain:40,kbRes:1,boss:true,priest:true,sovereign:true,
    name:"THE FACTORY FOREMAN",title:"it never clocked out"},
 G:{hp:3000,sp:2.0,mel:36,w:2.6,h:2.8,pain:36,kbRes:1,boss:true,priest:true,sovereign:true,fling:true,
    name:"THE LIVING HEART",title:"the whole place was one body, and this was its heart"},
 k:{hp:200,sp:2.6,mel:20,w:1.3,h:1.7,pain:80,kbRes:.7,shield:true,range:13,orb:"centaur",
    name:"SLAUGHTAUR",title:"it spits fire from a screaming shield"},        // Hexen Centaur/Slaughtaur
 q:{hp:70, sp:2.4,mel:12,w:1.1,h:1.3,pain:200,fly:true,flyH:1.8,range:14,orb:"afrit",burst:true,deathBoom:true,
    name:"AFRIT",title:"it burns even after it dies"},                        // Hexen Afrit
 R:{hp:90, sp:3.0,mel:14,w:1.2,h:1.2,pain:160,fly:true,flyH:1.9,range:16,orb:"reiver",
    name:"REIVER",title:"half a corpse, all of the hate"},                    // Hexen Reiver
 y:{hp:110,sp:2.8,mel:18,w:1.3,h:1.5,pain:120,fly:true,flyH:1.6,range:13,orb:"garg",
    name:"STONE GARGOYLE",title:"it served Cheogh, and Cheogh is dead"},      // Blood Gargoyle
};
function spawnEnemy(ch,wx,wz,summoned){
  const d=EDEF[ch];
  const elite=!d.boss&&!summoned&&Math.random()<.11;
  const SZ=1.18;                       // overall sprite presence bump
  const mul=elite?2:1;
  const ew=d.w*(elite?1.15:1)*SZ, eh=d.h*(elite?1.15:1)*SZ;
  const e={key:ch,name:d.name,x:wx,z:wz,hp:d.hp*mul,maxhp:d.hp*mul,
    speed:d.sp*(elite?1.15:1),mel:d.mel,w:ew,h:eh,
    pain:d.pain,kbRes:d.kbRes||0,boss:!!d.boss,priest:!!d.priest,stone:!!d.stone,
    charge:!!d.charge,slam:!!d.slam,lunge:!!d.lunge,dodge:!!d.dodge,
    scream:!!d.scream,toxic:!!d.toxic,range:d.range||0,plate:d.plate||0,
    sp:addSprite(PX[ch].a,wx,wz,ew,eh),
    blob:addBlob(wx,wz,ew*1.25),elite,summoned:!!summoned,
    cool:0,hurt:0,stun:0,kx:0,kz:0,flung:0,flungT:0,
    dead:false,gone:false,deathT:0,deathKind:0,deathDir:1,dropped:false,
    dodgeT:rnd(.6,2),strafe:0,strafeDir:1,flank:(Math.random()<.5?1:-1)*rnd(.3,.6),
    alertX:-1,alertZ:-1,aware:false,slow:1,animT:0,frame:0,r:d.boss?.8:.45,
    screamT:0,lungeT:rnd(1,2),slamT:rnd(2,4),flingCD:rnd(3,6),
    fy:floorHeightAt(wx,wz),
    dormant:!!d.boss,phase:1,tpT:5,atkT:2.5,sumT:6,ringT:4,debT:3,chT:5,charging:0,cdx:0,cdz:0};
  if(elite)e.sp.material.color.setHex(0xd8c878);
  enemies.push(e);
  if(!summoned)S.killsTotal=(S.killsTotal||0)+1;
  if(d.boss)bossRef=bossRef||e;
  return e;}
function spawnProp(ch,wx,wz){
  let m,r,hgt,hp,explosive=false,kind=ch;
  const wood=new THREE.MeshLambertMaterial({map:TEX.wood});
  if(ch==="x"){m=new THREE.Mesh(new THREE.BoxGeometry(.85,.85,.85),wood);
    m.position.set(wx,.43,wz);r=.55;hgt=.9;hp=22;}
  else if(ch==="T"){m=new THREE.Group();
    const top=new THREE.Mesh(new THREE.BoxGeometry(1.3,.1,.8),wood);top.position.y=.58;m.add(top);
    for(const[lx,lz]of[[-.5,-.3],[.5,-.3],[-.5,.3],[.5,.3]]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.1,.58,.1),wood);
      leg.position.set(lx,.29,lz);m.add(leg);}
    m.position.set(wx,0,wz);r=.62;hgt=.7;hp=26;}
  else if(ch==="C"){m=new THREE.Group();
    const seat=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.5),wood);seat.position.y=.4;m.add(seat);
    const back=new THREE.Mesh(new THREE.BoxGeometry(.5,.55,.07),wood);back.position.set(0,.68,-.22);m.add(back);
    for(const[lx,lz]of[[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.07,.4,.07),wood);
      leg.position.set(lx,.2,lz);m.add(leg);}
    m.position.set(wx,0,wz);m.rotation.y=rnd(0,6);r=.4;hgt=.9;hp=10;}
  else if(ch==="F"){m=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.7,.4),wood);
    m.position.set(wx,.85,wz);r=.6;hgt=1.7;hp=28;}
  else if(ch==="V"){m=new THREE.Group();
    const seat=new THREE.Mesh(new THREE.BoxGeometry(1.6,.09,.45),wood);seat.position.y=.42;m.add(seat);
    const back=new THREE.Mesh(new THREE.BoxGeometry(1.6,.5,.08),wood);back.position.set(0,.7,-.2);m.add(back);
    const l1=new THREE.Mesh(new THREE.BoxGeometry(.1,.42,.42),wood);l1.position.set(-.7,.21,0);m.add(l1);
    const l2=new THREE.Mesh(new THREE.BoxGeometry(.1,.42,.42),wood);l2.position.set(.7,.21,0);m.add(l2);
    m.position.set(wx,0,wz);r=.75;hgt=.95;hp=18;}
  else{m=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,1.05,8),
    new THREE.MeshLambertMaterial({map:TEX.barrel}));
    m.position.set(wx,.525,wz);r=.48;hgt=1.1;hp=24;explosive=true;addBlob(wx,wz,1.1);}
  scene.add(m);
  props.push({m,x:wx,z:wz,r,hgt,hp,dead:false,explosive,kind,fuse:-1});}
function breakProp(p){
  if(p.dead)return;p.dead=true;scene.remove(p.m);S.propsBroken++;
  woodP(p.x,.5,p.z,12);spawnGibs(p.x,.55,p.z,6,3.4,true);
  bang(.12,.32,1200);bang(.08,.2,500);
  if(Math.random()<.2){
    const k=pick(["health","bullets","shells"]);
    items.push({kind:k,x:p.x,z:p.z,sp:addSprite(ITEMTEX[k],p.x,p.z,.55,.55,.5),bob:0});}
  if(S.propsBroken===15)ach("redec","REDECORATOR","Destroy 15 objects");}
function explodeBarrel(b){
  if(b.dead)return;b.dead=true;scene.remove(b.m);S.propsBroken++;
  shake(.7);hitStop=Math.max(hitStop,.05);
  boomLight.position.set(b.x,1.2,b.z);boomLight.intensity=4;boomLight.color.setHex(0xff7830);
  fireP(b.x,.8,b.z,40);smoke3d(b.x,1,b.z,22);sparks(b.x,.8,b.z,18);
  spawnGibs(b.x,.8,b.z,6,5,true);
  const sc=new THREE.Mesh(new THREE.CircleGeometry(1.5,10),scorchMat);
  sc.rotation.x=-Math.PI/2;sc.position.set(b.x,.015,b.z);scene.add(sc);
  boom(1.1);
  const pd=Math.hypot(px-b.x,pz-b.z);
  if(pd<5)damagePlayer(60*(1-pd/5));
  for(const e of enemies){if(e.dead)continue;
    const dd=Math.hypot(e.x-b.x,e.z-b.z);
    if(dd<5){const f=Math.max(dd,.2);
      e.kx+=(e.x-b.x)/f*9;e.kz+=(e.z-b.z)/f*9;
      damageEnemy(e,70*(1-dd/5),{explosive:true,dir:{x:(e.x-b.x)/f,z:(e.z-b.z)/f}});}}
  for(const o of props){if(!o.dead&&o!==b&&Math.hypot(o.x-b.x,o.z-b.z)<4){
    if(o.explosive&&o.fuse<0)o.fuse=rnd(.15,.4);else breakProp(o);}}
  alertSound(b.x,b.z,22);}
function alertSound(x,z,radius){
  for(const e of enemies){if(e.dead||e.dormant)continue;
    if(Math.hypot(e.x-x,e.z-z)<radius){e.alertX=x;e.alertZ=z;}}}

function loadLevel(idx){
  S.level=idx;
  const Ldef=LEVELS[idx],L=Ldef.build();
  grid=L.g;GW=L.W;GH=L.H;
  heightMap=L.hmap||null;
  wallSegs=L.segs||[];
  scene=new THREE.Scene();
  scene.background=new THREE.Color(Ldef.fog);
  scene.fog=new THREE.FogExp2(Ldef.fog,Ldef.fogD*1.5);
  ambLight=new THREE.AmbientLight(Ldef.amb,Ldef.ambI*0.42);scene.add(ambLight);
  lamp=new THREE.PointLight(0xffb060,1.7,9,1.6);scene.add(lamp);
  // a tighter hot core so the player is always in a warm pool that falls off to black
  lampCore=new THREE.PointLight(0xffd890,1.1,4.5,2);scene.add(lampCore);
  muzzleLight=new THREE.PointLight(0xffc878,0,14,1.4);scene.add(muzzleLight);
  boomLight=new THREE.PointLight(0xff7830,0,20,1.4);scene.add(boomLight);
  buildParticles();
  pools=[];wallDecals=[];gibs=[];
  doors={};enemies=[];props=[];items=[];torches=[];candles=[];
  poisonZones=[];rings=[];strikes=[];nails=[];orbs=[];heads=[];
  exitPos=null;pianoPos=null;challenge=null;bossRef=null;cine=null;
  S.dead=false;S.won=false;S.hp=100;
  eventT=rnd(55,100);idleT=rnd(26,40);
  spawnGuard=2.0;   // brief invulnerability on entry
  S.kills=0;S.gibs=0;S.secrets=0;S.secretsTotal=0;S.shots=0;S.hitsLanded=0;
  S.propsBroken=0;S.killsTotal=0;S.key=false;S.levelT0=performance.now();
  const flesh=Ldef.flesh,hell=Ldef.hell,dungeon=Ldef.dungeon;
  const wallTex=hell?TEX.hellWall:flesh?TEX.fleshWall:(dungeon?TEX.dungeonWall:TEX.churchWall);
  const matWall=new THREE.MeshLambertMaterial({map:wallTex});
  const matWin=new THREE.MeshBasicMaterial({map:TEX.window});
  const wallGeo=new THREE.BoxGeometry(CELL,WALLH,CELL);
  const pilGeo=new THREE.CylinderGeometry(.46,.55,WALLH,8);
  const matPil=new THREE.MeshLambertMaterial({map:TEX.pillar});
  for(let z=0;z<GH;z++)for(let x=0;x<GW;x++){
    const ch=grid[z][x],wx=(x+.5)*CELL,wz=(z+.5)*CELL;
    if(ch==="#"||ch==="W"){
      let dx0=0,dz0=0,open=false;
      for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const r=grid[z+dz];
        if(r&&r[x+dx]&&"#W".indexOf(r[x+dx])<0){open=true;dx0=dx;dz0=dz;break;}}
      if(!open)continue;
      const m=new THREE.Mesh(wallGeo,matWall);m.position.set(wx,WALLH/2,wz);scene.add(m);
      if(ch==="W"){
        const gm=new THREE.Mesh(new THREE.PlaneGeometry(1.6,2.6),matWin);
        gm.position.set(wx+dx0*(CELL/2+.02),WALLH*.56,wz+dz0*(CELL/2+.02));
        gm.lookAt(wx+dx0*4,WALLH*.56,wz+dz0*4);scene.add(gm);
        const col=pick([0x5a3a8e,0x3a5a9e,0x9e3a3a]);
        const wl=new THREE.PointLight(col,1.1,9,1.5);
        wl.position.set(wx+dx0*1.7,WALLH*.6,wz+dz0*1.7);scene.add(wl);
        const cone=new THREE.Mesh(new THREE.ConeGeometry(1.2,WALLH-.6,8,1,true),
          new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.05,
            side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
        cone.position.set(wx+dx0*1.7,(WALLH-.6)/2,wz+dz0*1.7);scene.add(cone);}}
    else if(ch==="I"){
      const m=new THREE.Mesh(pilGeo,matPil);m.position.set(wx,WALLH/2,wz);scene.add(m);}
    else if(ch==="+"||ch==="D"||ch==="S"){
      let mat;if(ch==="S"){mat=matWall;S.secretsTotal++;}
      else mat=new THREE.MeshLambertMaterial({map:ch==="D"?TEX.doorLocked:(flesh?TEX.fleshDoor:TEX.door)});
      const m=new THREE.Mesh(wallGeo,mat);m.position.set(wx,WALLH/2,wz);scene.add(m);
      doors[x+","+z]={mesh:m,open:false,locked:ch==="D",secret:ch==="S",flesh:flesh&&ch!=="D"};}}
  const floorTex=(hell?TEX.hellFloor:flesh?TEX.fleshFloor:(dungeon?TEX.dungeonFloor:TEX.churchFloor)).clone();
  floorTex.needsUpdate=true;floorTex.repeat.set(GW,GH);
  floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;
  floorTex.magFilter=THREE.NearestFilter;floorTex.minFilter=THREE.NearestFilter;
  const fm=new THREE.Mesh(new THREE.PlaneGeometry(GW*CELL,GH*CELL),
    new THREE.MeshLambertMaterial({map:floorTex}));
  fm.rotation.x=-Math.PI/2;fm.position.set(GW*CELL/2,0,GH*CELL/2);scene.add(fm);
  const ceilTex=(hell?TEX.hellCeil:flesh?TEX.fleshCeil:TEX.ceil).clone();ceilTex.needsUpdate=true;ceilTex.repeat.set(GW,GH);
  ceilTex.wrapS=ceilTex.wrapT=THREE.RepeatWrapping;
  ceilTex.magFilter=THREE.NearestFilter;ceilTex.minFilter=THREE.NearestFilter;
  const cm=new THREE.Mesh(new THREE.PlaneGeometry(GW*CELL,GH*CELL),
    new THREE.MeshLambertMaterial({map:ceilTex}));
  cm.rotation.x=Math.PI/2;cm.position.set(GW*CELL/2,WALLH,GH*CELL/2);scene.add(cm);
  /* raised floor platforms (verticality) — a textured block per elevated cell */
  if(heightMap){
    const platTexTop=(hell?TEX.hellFloor:flesh?TEX.fleshFloor:(dungeon?TEX.dungeonFloor:TEX.churchFloor));
    const platTexSide=hell?TEX.stair:flesh?TEX.fleshWall:TEX.stair;
    const topMat=new THREE.MeshLambertMaterial({map:platTexTop});
    const sideMat=new THREE.MeshLambertMaterial({map:platTexSide});
    const pmats=[sideMat,sideMat,topMat,sideMat,sideMat,sideMat]; // box face order: +x,-x,+y,-y,+z,-z
    for(let z=0;z<GH;z++)for(let x=0;x<GW;x++){
      const hgt=heightMap[z]&&heightMap[z][x]||0;
      if(hgt<=0)continue;
      const wx=(x+.5)*CELL,wz=(z+.5)*CELL;
      const bg=new THREE.BoxGeometry(CELL,hgt,CELL);
      const bm=new THREE.Mesh(bg,pmats);
      bm.position.set(wx,hgt/2,wz);scene.add(bm);}}
  /* angled wall meshes from arbitrary segments — non-orthogonal Doom/Blood walls */
  if(wallSegs.length){
    const segMat=new THREE.MeshLambertMaterial({map:wallTex});
    for(const s of wallSegs){
      const len=Math.hypot(s.x2-s.x1,s.z2-s.z1);if(len<.01)continue;
      const geo=new THREE.BoxGeometry(len,WALLH,0.18);
      const m=new THREE.Mesh(geo,segMat);
      m.position.set((s.x1+s.x2)/2,WALLH/2,(s.z1+s.z2)/2);
      m.rotation.y=-Math.atan2(s.z2-s.z1,s.x2-s.x1);
      scene.add(m);}}
  for(let z=0;z<GH;z++)for(let x=0;x<GW;x++){
    const ch=grid[z][x];
    if(".#WI+DS".includes(ch))continue;
    const wx=(x+.5)*CELL,wz=(z+.5)*CELL;
    if(ch==="P"){px=wx;pz=wz;}
    else if(ch==="X"){exitPos={x:wx,z:wz};
      const ph=floorHeightAt(wx,wz);
      const pad=new THREE.Mesh(new THREE.BoxGeometry(CELL*1.3,.06,CELL*1.3),
        new THREE.MeshBasicMaterial({color:0x4a6b8a}));
      pad.position.set(wx,ph+.04,wz);scene.add(pad);
      const gl=new THREE.PointLight(0x4a6b8a,.9,6);gl.position.set(wx,ph+1,wz);scene.add(gl);}
    else if(ch==="i"){
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,1.15,6),
        new THREE.MeshLambertMaterial({color:0x1a160f}));
      pole.position.set(wx,.575,wz);scene.add(pole);
      const fl=addSprite(ITEMTEX.torch[0],wx,wz,.45,.6,1.35);
      const Lt=new THREE.PointLight(0xff9838,1.6,10,1.8);
      Lt.position.set(wx,1.45,wz);scene.add(Lt);
      torches.push({L:Lt,sp:fl,x:wx,z:wz,seed:Math.random()*99,fr:0});}
    else if(ch==="l"){
      const c2=addSprite(ITEMTEX.candle,wx,wz,.25,.3,.18);
      candles.push({sp:c2,x:wx,z:wz,seed:Math.random()*99});}
    else if(ch==="p"){pianoPos={x:wx,z:wz};
      const body=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.0,.95),
        new THREE.MeshLambertMaterial({color:0x14100a}));
      body.position.set(wx,.5,wz);scene.add(body);
      const kb=new THREE.Mesh(new THREE.BoxGeometry(1.35,.06,.3),
        new THREE.MeshLambertMaterial({color:0xcfc8b8}));
      kb.position.set(wx,1.02,wz+.42);scene.add(kb);
      props.push({m:body,x:wx,z:wz,r:.95,hgt:1.2,hp:1e9,dead:false,explosive:false,kind:"piano"});}
    else if(ch==="Y"){challenge={x:wx,z:wz,state:0,spawned:[]};
      const plate=new THREE.Mesh(new THREE.CircleGeometry(.9,10),
        new THREE.MeshBasicMaterial({color:0x6a4ab8,transparent:true,opacity:.5}));
      plate.rotation.x=-Math.PI/2;plate.position.set(wx,.02,wz);scene.add(plate);
      const gl=new THREE.PointLight(0x6a4ab8,.7,5);gl.position.set(wx,.8,wz);scene.add(gl);
      challenge.plate=plate;challenge.light=gl;}
    else if(EDEF[ch])spawnEnemy(ch,wx,wz);
    else if("xTCFVO".includes(ch))spawnProp(ch,wx,wz);
    else{
      const map2={h:"health",A:"armor",a:"bullets",b:"shells",o:"slugs",c:"crosses",K:"key",
        "2":"w1","3":"w2","4":"w3","5":"w4","6":"w5","7":"w6","8":"w7","9":"nails","0":"souls"};
      const k=map2[ch];if(!k)continue;
      const tex=k[0]==="w"?ITEMTEX.gun:ITEMTEX[k];
      items.push({kind:k,x:wx,z:wz,sp:addSprite(tex,wx,wz,.55,.55,.5),bob:Math.random()*6});}
    grid[z][x]=".";}
  vx=vy=vz=0;pyy=EYE+floorHeightAt(px,pz);yaw=Math.PI;pitch=0;grounded=true;
  const lt=document.getElementById("lvltitle");
  lt.textContent=Ldef.name;lt.style.opacity=1;
  setTimeout(()=>lt.style.opacity=0,5000);
  showMsg(Ldef.name,3.4);
  setTimeout(()=>say("lvl"+idx,true),1400);}

/* ============================================================
   DAMAGE / DEATH
   ============================================================ */
function damageEnemy(e,dmg,info){
  info=info||{};
  if(e.dead)return;
  /* Hexen Centaur/Slaughtaur shield — blocks most frontal fire */
  if(e.shield&&!info.explosive&&info.dir){
    // facing roughly toward the shot source = blocked
    const toP=Math.atan2(px-e.x,pz-e.z);
    const shotDir=Math.atan2(-info.dir.x,-info.dir.z);
    let d=Math.abs(((toP-shotDir+Math.PI)%(2*Math.PI))-Math.PI);
    if(d<1.0){dmg*=0.25;bang(.04,.3,3000,800);sparks(info.hx||e.x,info.hy||e.h*.6,info.hz||e.z,4);}
  }
  if(e.plate>0&&!info.explosive){
    e.plate-=dmg;
    bang(.05,.32,2800,700);
    e.stun=Math.max(e.stun,.08);
    if(e.plate<=0){
      spawnGibs(e.x,e.h*.7,e.z,4,3.4,true);
      bang(.15,.35,900);showMsg("ARMOR SHATTERED");
      e.sp.material.color.setHex(0x8a9650);}
    return;}
  e.hp-=dmg;
  e.hurt=.12;e.sp.material.color.setHex(0xff8866);
  pain(clamp(e.pain*.35,70,360),.08+Math.random()*.04);
  const res=1-(e.kbRes||0);
  const kb=(info.explosive?7:(info.wIdx===1?5:info.wIdx===0?2.4:info.wIdx===4?6:info.wIdx===-1?0:1.1))*res;
  if(info.dir){e.kx+=info.dir.x*kb;e.kz+=info.dir.z*kb;}
  e.stun=Math.max(e.stun,(info.explosive?.5:(info.wIdx===1?.35:info.wIdx===4?.45:info.wIdx===0?.2:.08))*res+.02);
  if(info.leg&&!e.boss)e.slow=Math.min(e.slow,.6);
  if(e.boss&&e.dormant)wakeBoss(e);
  /* DISMEMBERMENT while still alive — big hits to a limb tear it off */
  if(!e.boss&&e.plate<=0&&PX[e.key].regions&&e.hp>0){
    e.sever=e.sever||{};
    const heavy=info.wIdx===1||info.wIdx===4||info.wIdx===0||info.explosive; // shotgun/sniper/pistol/boom
    const big=dmg>=22;
    if(info.arm&&big&&(heavy||Math.random()<.5)){
      const side=info.armSide;
      if(side==="L"&&!e.sever.lArm){e.sever.lArm=true;severLimb(e,"arm",info);}
      else if(side==="R"&&!e.sever.rArm){e.sever.rArm=true;severLimb(e,"arm",info);}}
    else if(info.leg&&big&&(heavy||Math.random()<.45)&&!e.sever.legs){
      e.sever.legs=true;severLimb(e,"legs",info);}
    refreshSeverSprite(e);}
  if(e.hp<=0)killEnemy(e,dmg,info);}
/* pick the right dismembered texture for the enemy's current sever state */
function refreshSeverSprite(e){
  const P=PX[e.key],s=e.sever||{};
  let key=null;
  if(s.legs)key="noLegs";
  if(s.lArm)key="noLArm";
  if(s.rArm)key="noRArm";
  if(s.lArm&&s.rArm)key="gibbed";
  if(!key)return;
  e.severKey=key;
  e.sp.material.map=P[key]||P.a;e.sp.material.needsUpdate=true;}
/* spawn a flying chunk for a torn-off limb + a wet sound */
function severLimb(e,type,info){
  const y=type==="legs"?e.h*.25:e.h*.55;
  const n=type==="legs"?5:4;
  spawnGibs(e.x,y,e.z,n,3.2);
  blood(e.x,y,e.z,12,2.2);
  addPool(e.x,e.z,rnd(.3,.5));
  gurgle(.25,.4);
  if(info&&info.dir){ // throw a big chunk in the shot direction
    let g;
    if(gibs.length>=GIBMAX){g=gibs.shift();}
    else{g={m:new THREE.Mesh(gibGeo,gibMatsFlesh[0])};scene.add(g.m);}
    g.m.material=gibMatsFlesh[0];
    g.m.position.set(e.x,y,e.z);g.m.scale.setScalar(2.2);
    g.vx=info.dir.x*5+rnd(-2,2);g.vy=rnd(3,5);g.vz=info.dir.z*5+rnd(-2,2);
    g.spin=rnd(6,12);g.live=true;g.wood=false;
    gibs.push(g);}
  showMsg(type==="legs"?"LEGS BLOWN OFF":"LIMB SEVERED");}
function killEnemy(e,finalDmg,info){
  e.dead=true;
  if(!e.summoned)S.kills++;
  S.totKills++;
  e.blob.scale.setScalar(1.6);
  /* Afrit death explosion */
  if(e.key==="q"){
    fireP(e.x,e.fy?e.fy+1:1,e.z,26);sparks(e.x,1,e.z,16);boom(.8);
    boomLight.position.set(e.x,1.2,e.z);boomLight.intensity=3.5;boomLight.color.setHex(0xff7830);
    const pd=Math.hypot(px-e.x,pz-e.z);
    if(pd<3.5&&Math.abs((e.fy||0)-(pyy-EYE))<2)damagePlayer(28*(1-pd/3.5));
    for(const o of enemies){if(o.dead||o===e)continue;
      if(Math.hypot(o.x-e.x,o.z-e.z)<3)o.hp-=30;}}
  if(info.wIdx===-1){S.kickK=(S.kickK||0)+1;
    if(S.kickK===3)ach("boot","PERCUSSIVE DIPLOMACY","3 kick kills");}
  if(S.totKills===1)ach("first","FIRST BLOOD","The parish notices you");
  if(S.totKills===60)ach("sixty","EXTERMINATOR","60 kills");
  alertSound(e.x,e.z,10);
  if(e.toxic){poisonZones.push({x:e.x,z:e.z,r:1.8,t:4.5});}
  if(e.boss){bossDeath(e);return;}
  const overkill=info.explosive||(-e.hp>22)||(info.wIdx===1&&info.dist<4.5);
  if(overkill){
    S.gibs++;S.totGibs++;
    e.gone=true;scene.remove(e.sp);scene.remove(e.blob);
    spawnGibs(e.x,e.h*.6,e.z,12,4.5);
    addPool(e.x,e.z,rnd(.8,1.2));
    shake(.22);hitStop=Math.max(hitStop,.045);
    bang(.2,.45,800);gurgle(.45,.5);
    if(Math.random()<.4)say("gib");
    if(S.totGibs===10)ach("organ","ORGAN DONOR","Gib 10 enemies");
    if(Math.random()<.35)dropAmmo(e.x,e.z);
    return;}
  deathCry(clamp(e.pain*.3,42,200));
  e.deathT=0;
  if(info.head&&PX[e.key].head>0){
    e.deathKind=2;
    e.sp.material.map=(PX[e.key].noHead)||PX[e.key].hl;e.sp.material.needsUpdate=true;
    blood(e.x,e.h,e.z,22,2.8);
    spawnGibs(e.x,e.h,e.z,3,3.2);
    spawnHead(e,info);            // <-- the head pops off and can be kicked
    gurgle(.32,.45);shake(.16);
    showMsg("DECAPITATED");
    if(!S.beheads)S.beheads=0;
    if(++S.beheads===5)ach("behead","OFF WITH THEIR HEADS","Decapitate 5 enemies");
  } else e.deathKind=1;
  e.deathDir=Math.random()<.7?1:-1;
  if(info.dir){e.kx+=info.dir.x*2.5;e.kz+=info.dir.z*2.5;}
  addPool(e.x,e.z,rnd(.6,1));}
/* a severed head: a small sprite that arcs off the body, lands, and can be kicked */
function spawnHead(e,info){
  const tex=PX[e.key].a;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true}));
  const sz=Math.max(.34,e.w*.34);
  sp.scale.set(sz,sz,1);
  sp.position.set(e.x,e.h*.92,e.z);
  scene.add(sp);
  const dx=info&&info.dir?info.dir.x:rnd(-1,1),dz=info&&info.dir?info.dir.z:rnd(-1,1);
  heads.push({sp,x:e.x,y:e.h*.92,z:e.z,
    vx:dx*rnd(2,4)+rnd(-1,1),vy:rnd(3.5,5.5),vz:dz*rnd(2,4)+rnd(-1,1),
    spin:rnd(-8,8),rest:false,life:30,sz});}
function headTick(dt){
  for(let i=heads.length-1;i>=0;i--){const h=heads[i];
    h.life-=dt;
    if(!h.rest){
      h.vy-=15*dt;
      h.x+=h.vx*dt;h.y+=h.vy*dt;h.z+=h.vz*dt;
      h.sp.material.rotation+=h.spin*dt;
      if(solidAt(h.x,h.z)){h.vx*=-.4;h.vz*=-.4;h.x-=h.vx*dt;h.z-=h.vz*dt;}
      if(h.y<=h.sz*.5){h.y=h.sz*.5;
        if(Math.abs(h.vy)>1.3){h.vy*=-.42;h.vx*=.6;h.vz*=.6;h.spin*=.6;
          if(Math.random()<.6)blood(h.x,h.y,h.z,3,1.2);
          if(Math.random()<.5)addPool(h.x,h.z,rnd(.2,.35));
          gurgle(.1,.18);}
        else{h.vy=0;h.vx*=.7;h.vz*=.7;h.spin*=.7;
          if(Math.abs(h.vx)<.2&&Math.abs(h.vz)<.2){h.rest=true;h.spin=0;}}}}
    // player kick: walk into it (or kick action) to punt it
    const pd=Math.hypot(h.x-px,h.z-pz);
    if(pd<.7){
      const a=Math.atan2(h.x-px,h.z-pz);
      const force=kickAnim>0?9:3.4;
      h.vx=Math.sin(a)*force;h.vz=Math.cos(a)*force;h.vy=kickAnim>0?5:2.2;
      h.spin=rnd(-12,12);h.rest=false;
      if(kickAnim>0){bang(.08,.3,500);blood(h.x,h.y,h.z,4,1.4);}}
    h.sp.position.set(h.x,h.y,h.z);
    if(h.life<=0){scene.remove(h.sp);heads.splice(i,1);}}}
function dropAmmo(x,z){
  const k=pick(["bullets","shells","bullets"]);
  items.push({kind:k,x,z,sp:addSprite(ITEMTEX[k],x,z,.55,.55,.5),bob:0});}
function bossDeath(e){
  stopBossMusic();
  shake(.7);hitStop=Math.max(hitStop,.12);
  bang(.6,.7,400);blip(50,1.4,"sawtooth",.2,28,true);
  spawnGibs(e.x,e.h*.6,e.z,10,5,e.stone);
  addPool(e.x,e.z,1.8);
  e.deathKind=1;e.deathT=0;e.deathDir=Math.random()<.5?1:-1;
  say("boss_dead",true);
  if(e.key==="E"){ach("exec","HEADSMAN'S HOLIDAY","Slay the Executioner");
    showMsg("THE EXECUTIONER FALLS — TAKE THE KEY",4);}
  if(e.key==="U"){ach("guard","ICONOCLAST","Fell the Cathedral Guardian");
    showMsg("THE GUARDIAN CRUMBLES",3.5);}
  if(e.key==="Q"){ach("priest","DEFROCKED","End the Corrupted Priest");
    showMsg("THE PRIEST IS SILENCED — A STAIR OPENS DOWNWARD",4.5);
    openExit();}
  if(e.key==="Z"){ach("sovereign","NO MORE CROWNS","End the Bone Sovereign");
    showMsg("THE SOVEREIGN IS UNMADE — A WAY OPENS",4.5);
    openExit();}
  if(e.key==="N"){ach("digger","FILLED HIS OWN GRAVE","End the Gravedigger");
    showMsg("THE GRAVEDIGGER LIES STILL — A DRAIN YAWNS OPEN",4.5);
    openExit();}
  if(e.key==="H"){ach("leviathan","DRAINED","End the Hollow Leviathan");
    showMsg("THE LEVIATHAN COMES APART — A SERVICE LIFT GRINDS OPEN",4.5);
    openExit();}
  if(e.key==="V"){ach("foreman","CLOCKED OUT","End the Factory Foreman");
    showMsg("THE FOREMAN GOES DARK — A WET TUNNEL OPENS BELOW",4.5);
    openExit();}
  if(e.key==="G"){ach("heart","STILL LIFE","Stop the Living Heart");
    showMsg("THE HEART STOPS — AND SO DOES EVERYTHING",4.5);
    setTimeout(()=>showWin(),2800);}}
function openExit(){
  if(exitPos)return;
  // place exit on a guaranteed-open tile in the south processional area
  const cands=[[16,16],[16,15],[15,16],[17,16],[16,17]];
  let gx=16,gz=16;
  for(const[cx,cz] of cands){
    const wx=(cx+.5)*CELL,wz=(cz+.5)*CELL;
    if(!solidAt(wx,wz)){gx=cx;gz=cz;break;}}
  exitPos={x:(gx+.5)*CELL,z:(gz+.5)*CELL};
  const pad=new THREE.Mesh(new THREE.BoxGeometry(CELL*1.3,.06,CELL*1.3),
    new THREE.MeshBasicMaterial({color:0x4a6b8a}));
  pad.position.set(exitPos.x,.03,exitPos.z);scene.add(pad);
  const gl=new THREE.PointLight(0x4a6b8a,1.1,8);gl.position.set(exitPos.x,1,exitPos.z);scene.add(gl);
  blip(120,.7,"sine",.09,90,true);growl(70,.4,.2,true);}
function wakeBoss(e){
  if(!e.dormant)return;
  e.dormant=false;
  cine={t:0,dur:2.7,e};
  inputLock=true;firing=false;
  document.getElementById("barTop").style.height="11%";
  document.getElementById("barBot").style.height="11%";
  const bt=document.getElementById("bossTitle");
  bt.children[0].textContent=e.name;bt.children[1].textContent=e.title||EDEF[e.key].title;
  bt.style.opacity=1;
  blip(40,1.6,"sawtooth",.2,30,true);bang(.5,.4,300);
  if(e.priest)organChord();
  setTimeout(()=>roarFor(e),500);}
function roarFor(e){growl(rnd(42,60),1.0,.6,true);setTimeout(()=>growl(rnd(50,70),.6,.4,true),200);}
function cineTick(dt){
  if(!cine)return;
  cine.t+=dt;
  const b=cine.e;
  const target=Math.atan2(-(b.x-px),-(b.z-pz));
  let diff=((target-yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
  yaw+=diff*Math.min(1,dt*4);
  const want=Math.atan2(b.h*.7-pyy,Math.hypot(b.x-px,b.z-pz));
  pitch+=(want-pitch)*Math.min(1,dt*4);
  if(cine.t>=cine.dur){
    document.getElementById("barTop").style.height="0";
    document.getElementById("barBot").style.height="0";
    document.getElementById("bossTitle").style.opacity=0;
    inputLock=false;
    say("boss_"+cine.e.key,true);
    startBossMusic();
    cine=null;}}

/* ============================================================
   ENEMY AI
   ============================================================ */
function los(x1,z1,x2,z2){
  const d=Math.hypot(x2-x1,z2-z1),steps=d/.3|0;
  for(let i=1;i<steps;i++){const t=i/steps;
    if(solidAt(x1+(x2-x1)*t,z1+(z2-z1)*t))return false;}
  if(wallSegs.length&&segsCrossRay(x1,z1,x2,z2))return false;
  return true;}
function moveEnemy(e,sx,sz,spd,dt){
  const smash=e.boss||e.key==="B";
  const nx=e.x+sx*spd*dt,nz=e.z+sz*spd*dt,rr=e.r;
  for(const p of props){if(p.dead||p.kind==="piano")continue;
    if(Math.hypot(nx-p.x,nz-p.z)<rr+p.r){
      if(smash){p.explosive?explodeBarrel(p):breakProp(p);}
      else return false;}}
  const bx=[[rr,0],[-rr,0],[0,rr],[0,-rr]].some(([ox,oz])=>solidAt(nx+ox,e.z+oz));
  if(!bx)e.x=nx;else return false;
  const bz=[[rr,0],[-rr,0],[0,rr],[0,-rr]].some(([ox,oz])=>solidAt(e.x+ox,nz+oz));
  if(!bz)e.z=nz;else return false;
  return true;}
function fireOrb(e,spreadA,tox){
  e.atkAnim=.22;
  const dx=px-e.x,dz=pz-e.z,dist=Math.hypot(dx,dz);
  const a=Math.atan2(dx,dz)+spreadA;
  const ot=e.orb;
  let col=0x9a4ae0,dmg=15,spd=9.5;
  if(tox){col=0x6ad04a;dmg=12;}
  else if(e.stone){col=0x9a9aa2;}
  else if(ot==="caco"){col=0x5a8a3a;dmg=16;spd=10;}      // green plasma
  else if(ot==="manc"){col=0xff8020;dmg=18;spd=8;}       // orange fireball
  else if(ot==="cult"){col=0xc83a20;dmg=11;spd=11;}      // red bolt
  else if(ot==="centaur"){col=0x4a7aff;dmg=14;spd=11;}   // Slaughtaur blue shield-fire
  else if(ot==="afrit"){col=0xff7020;dmg=13;spd=10;}     // Afrit fireball
  else if(ot==="reiver"){col=0x9fd048;dmg=15;spd=12;}    // Reiver green bolt
  else if(ot==="garg"){col=0x5ab0e0;dmg=14;spd=11;}      // Gargoyle blue energy (Cheogh)
  const mat=new THREE.MeshBasicMaterial({color:col});
  const oy=e.fly?(e.flyH||1.5):e.h*.6+(e.fy||0);
  const m=new THREE.Mesh(orbGeo,mat);m.position.set(e.x,oy,e.z);
  if(ot==="manc")m.scale.setScalar(1.6);
  orbs.push({m,vx:Math.sin(a)*spd,vz:Math.cos(a)*spd,
    vy:((pyy-.2)-oy)/(dist/spd),dmg,life:3.2,tox,col});
  scene.add(m);
  blip(tox?420:ot==="manc"?180:300,.2,"sawtooth",.08,90);}
function throwFlesh(e){
  const dx=px-e.x,dz=pz-e.z,dist=Math.hypot(dx,dz);
  const a=Math.atan2(dx,dz)+rnd(-.05,.05);
  const oy=e.fly?(e.flyH||1.5):e.h*.55+(e.fy||0);
  const m=new THREE.Mesh(gibGeo,gibMatsFlesh[0].clone());
  m.position.set(e.x,oy,e.z);m.scale.setScalar(1.9);
  const spd=10;
  orbs.push({m,vx:Math.sin(a)*spd,vz:Math.cos(a)*spd,
    vy:((pyy-.2)-oy)/(dist/spd)+1.0,dmg:14,life:2.4,flesh:true,spin:rnd(6,12),col:0x8c1e10});
  scene.add(m);
  blood(e.x,oy,e.z,6,1.6);    // it rips the chunk out of its own body
  e.hp-=3;                    // Blood-style self-mutilation
  gurgle(.22,.32);growl(150,.22,.22);}
function priestTeleport(e,far){
  smoke3d(e.x,1.2,e.z,16);blip(700,.25,"sine",.1,140,true);
  for(let tries=0;tries<24;tries++){
    const a=rnd(0,6.28),d=far?rnd(7,11):rnd(4,7);
    const nx=px+Math.sin(a)*d,nz=pz+Math.cos(a)*d;
    if(!solidAt(nx,nz)&&los(nx,nz,px,pz)){e.x=nx;e.z=nz;break;}}
  smoke3d(e.x,1.2,e.z,16);fireP(e.x,1,e.z,6);
  blip(140,.25,"sine",.12,700,true);}
function enemyTick(dt){
  let anyAware=false;
  for(const e of enemies){
    if(e.gone)continue;
    /* during a boss cinematic, nothing moves or attacks — just hold position */
    if(cine&&!e.dead){
      const cy=e.fly?(e.flyH||1.5):e.h/2;
      e.sp.position.set(e.x,cy,e.z);e.blob.position.set(e.x,.012,e.z);
      e.cool=Math.max(e.cool||0,.4);
      continue;}
    if(e.dead){
      e.deathT+=dt;
      const t=clamp(e.deathT/.45,0,1);
      /* two-stage collapse frames (redesigned enemies) */
      const P=PX[e.key];
      if(P.die1&&e.deathKind!==2&&!e.severKey){
        const want=e.deathT<.22?P.die1:P.die2;
        if(want&&e.sp.material.map!==want){e.sp.material.map=want;e.sp.material.needsUpdate=true;}
        e.sp.material.rotation=e.deathDir*t*Math.PI/6;   // gentler tilt, frames do the work
      }else{
        e.sp.material.rotation=e.deathDir*t*Math.PI/2;}
      e.sp.position.y=e.h/2*(1-t)+e.h*.18*t;
      e.kx*=Math.exp(-4*dt);e.kz*=Math.exp(-4*dt);
      const nx=e.x+e.kx*dt,nz=e.z+e.kz*dt;
      if(!solidAt(nx,e.z))e.x=nx;if(!solidAt(e.x,nz))e.z=nz;
      e.sp.position.x=e.x;e.sp.position.z=e.z;
      e.blob.position.set(e.x,.012,e.z);
      if(e.deathKind===2&&e.deathT<.4&&Math.random()<.5)
        blood(e.x,e.h*.8*(1-t)+.3,e.z,2,2);
      if(!e.dropped&&e.deathT>.5){e.dropped=true;
        if(!e.boss&&Math.random()<.3)dropAmmo(e.x,e.z);}
      continue;}
    if(e.dormant){
      const dx0=px-e.x,dz0=pz-e.z,d0=Math.hypot(dx0,dz0);
      if(d0<(e.priest?13:9)&&los(e.x,e.z,px,pz))wakeBoss(e);
      e.sp.position.set(e.x,e.h/2+(e.fy||0),e.z);e.blob.position.set(e.x,(e.fy||0)+.012,e.z);
      continue;}
    if(e.hurt>0){e.hurt-=dt;
      if(e.hurt<=0)e.sp.material.color.setHex(e.elite?0xd8c878:0xffffff);}
    /* kicked airborne flight */
    if(e.flung>0){
      e.flung-=dt;e.flungT+=dt;
      const nx=e.x+e.kx*dt,nz=e.z+e.kz*dt;
      if(solidAt(nx,nz)){
        e.flung=0;e.stun=1.2;
        damageEnemy(e,40,{wIdx:-2});
        const d=new THREE.Vector3(e.kx,0,e.kz).normalize();
        const n=wallNormal(nx,nz,d);
        addWallDecal(nx-d.x*.2,rnd(.8,1.6),nz-d.z*.2,n.x,n.z,rnd(.5,.8),splatMat);
        blood(e.x,1,e.z,14,2.5);
        bang(.18,.5,600);shake(.2);
        say(Math.random()<.5?"kicksplat":"wallkill",true);
        ach("punt","FIELD GOAL","Kick an enemy into a wall");
        e.kx=0;e.kz=0;
      }else{e.x=nx;e.z=nz;}
      e.sp.position.set(e.x,e.h/2+(e.fy||0)+Math.sin(Math.min(1,e.flungT/.9)*Math.PI)*1.1,e.z);
      e.blob.position.set(e.x,.012,e.z);
      continue;}
    if(Math.abs(e.kx)+Math.abs(e.kz)>.05){
      const nx=e.x+e.kx*dt,nz=e.z+e.kz*dt;
      if(!solidAt(nx,e.z))e.x=nx;if(!solidAt(e.x,nz))e.z=nz;
      e.kx*=Math.exp(-6*dt);e.kz*=Math.exp(-6*dt);}
    const dx=px-e.x,dz=pz-e.z,dist=Math.hypot(dx,dz);
    if(dist>30){e.sp.position.set(e.x,e.h/2+(e.fy||0),e.z);e.blob.position.set(e.x,(e.fy||0)+.012,e.z);continue;}
    if(e.stun>0){e.stun-=dt;
      e.sp.position.set(e.x+rnd(-.03,.03),e.h/2,e.z+rnd(-.03,.03));
      e.blob.position.set(e.x,.012,e.z);continue;}
    const seen=los(e.x,e.z,px,pz)&&dist<22;
    e.cool-=dt;e.dodgeT-=dt;e.lungeT-=dt;e.slamT-=dt;e.screamT-=dt;e.flingCD-=dt;
    const injured=e.hp<e.maxhp*.35;
    let spd=e.speed*e.slow*(injured&&!e.boss?1.45:1);
    let moving=false;
    if(seen){
      anyAware=anyAware||dist<16;
      if(!e.aware){e.aware=true;
        say(e.elite?"see_elite":"see_"+e.key);snarl(e.key);}
      e.alertX=px;e.alertZ=pz;
      /* ===== BOSS BRAINS ===== */
      if(e.priest){priestThink(e,dt,dist,dx,dz);continue;}
      if(e.key==="E"&&e.charge){
        if(e.charging>0){
          e.charging-=dt;
          if(!moveEnemy(e,e.cdx,e.cdz,13,dt)){e.charging=0;e.stun=1;bang(.2,.5,400);shake(.25);}
          if(dist<1.6&&e.cool<=0&&Math.abs((e.fy||0)-(pyy-EYE))<1.3){e.cool=1.2;e.atkAnim=.22;damagePlayer(e.mel);}
          e.sp.position.set(e.x,e.h/2+(e.fy||0),e.z);e.blob.position.set(e.x,(e.fy||0)+.012,e.z);
          continue;}
        e.chT-=dt;
        if(e.chT<=0&&dist>4&&dist<14&&e.hp<e.maxhp*.7){
          e.chT=rnd(5,7);e.charging=.9;
          e.cdx=dx/dist;e.cdz=dz/dist;
          roarFor(e);shake(.15);}}
      /* screamer */
      if(e.scream&&e.screamT<=0&&dist<14){
        e.screamT=9;e.stun=1.1;
        growl(180,.9,.4,true);blip(500,.7,"sawtooth",.1,180,true);
        for(const o of enemies){if(o.dead||o.dormant||o===e)continue;
          if(Math.hypot(o.x-e.x,o.z-e.z)<16){o.alertX=px;o.alertZ=pz;o.slow=1;
            o.frenzy=5;}}
        showMsg("THE SCREAMER CALLS THE DEAD");
        continue;}
      /* ranged */
      if(e.range&&dist<e.range&&e.cool<=0&&dist>3){
        e.cool=e.stone?2.6:e.orb==="manc"?2.8:e.burst?2.6:2.3;
        if(e.stone){fireOrb(e,-.14);fireOrb(e,0);fireOrb(e,.14);}
        else if(e.twin){fireOrb(e,-.1);setTimeout(()=>{if(!e.dead)fireOrb(e,.1);},220);} // mancubus
        else if(e.orb==="centaur"){ // Slaughtaur: two quick blue bolts
          fireOrb(e,-.05);setTimeout(()=>{if(!e.dead)fireOrb(e,.05);},180);}
        else if(e.burst){ // Afrit: spread of fireballs
          fireOrb(e,-.12);fireOrb(e,0);fireOrb(e,.12);}
        else fireOrb(e,rnd(-.04,.04),e.toxic);}
      /* lost soul charge — telegraph then dash */
      if(e.charger&&dist>2.5&&dist<13&&e.lungeT<=0){
        e.lungeT=2.4;e.kx=dx/dist*16;e.kz=dz/dist*16;e.stun=0;
        blip(700,.3,"sawtooth",.12,1400);shake(.08);}
      /* flesh fling — tears a chunk from its own body and throws it */
      if(e.fling&&dist>3&&dist<12&&e.flingCD<=0&&Math.random()<.7){
        e.flingCD=rnd(3.5,6);e.stun=.25;
        throwFlesh(e);}
      /* brute slam */
      if(e.slam&&dist<2.9&&e.slamT<=0){
        e.slamT=4;e.stun=.5;
        setTimeout(()=>{if(e.dead)return;
          shake(.35);bang(.3,.6,300);smoke3d(e.x,.3,e.z,10);
          if(Math.hypot(px-e.x,pz-e.z)<3.1){damagePlayer(24);
            vx+=(px-e.x)*3;vz+=(pz-e.z)*3;}},480);
        blip(80,.4,"sawtooth",.14,40);}
      /* dog lunge */
      if(e.lunge&&dist>2&&dist<4.5&&e.lungeT<=0){
        e.lungeT=2.6;e.kx=dx/dist*9;e.kz=dz/dist*9;
        blip(500,.2,"sawtooth",.1,260);}
      /* dodge */
      if(e.dodge&&!injured&&e.dodgeT<=0&&dist<13&&Math.random()<.5){
        e.dodgeT=rnd(1.1,2.4);e.strafe=.32;e.strafeDir=Math.random()<.5?1:-1;}
      let mx,mz;
      if(e.strafe>0){e.strafe-=dt;
        mx=-dz/dist*e.strafeDir;mz=dx/dist*e.strafeDir;}
      else if(e.range&&dist<4&&!e.boss){mx=-dx/dist;mz=-dz/dist;}
      else{
        const fl=dist>8?e.flank:e.flank*.25;
        const a=Math.atan2(dx,dz)+fl;
        mx=Math.sin(a);mz=Math.cos(a);}
      if(e.frenzy>0){e.frenzy-=dt;spd*=1.3;}
      if(dist>1.15){moving=moveEnemy(e,mx,mz,spd,dt);
        if(!moving){moving=moveEnemy(e,dx/dist,dz/dist,spd*.7,dt);
          if(Math.random()<.05)e.flank*=-1;}}
      if(dist<1.55&&e.cool<=0&&Math.abs((e.fy||0)-(pyy-EYE))<1.3){e.cool=1.0;e.atkAnim=.22;damagePlayer(e.mel);
        blip(140,.12,"sawtooth",.1,60);}
    }else if(e.alertX>=0){
      const ax=e.alertX-e.x,az=e.alertZ-e.z,ad=Math.hypot(ax,az);
      if(ad>1){moving=moveEnemy(e,ax/ad,az/ad,spd*.7,dt);}
      else e.alertX=-1;}
    /* walk animation */
    if(moving&&e.atkAnim<=0){e.animT+=dt;
      if(e.animT>.22){e.animT=0;e.frame=1-e.frame;
        const set=e.deathKind===2?[PX[e.key].hl,PX[e.key].hlb]:[PX[e.key].a,PX[e.key].b];
        e.sp.material.map=set[e.frame];e.sp.material.needsUpdate=true;}}
    /* attack pose: swap to the dedicated attack frame while striking */
    if(e.atkAnim>0&&PX[e.key].atk&&!e.severKey&&e.deathKind!==2){
      if(e.sp.material.map!==PX[e.key].atk){
        e.sp.material.map=PX[e.key].atk;e.sp.material.needsUpdate=true;e.wasAtk=true;}
    }else if(e.wasAtk){ // attack finished -> back to normal stance
      e.wasAtk=false;
      const set=e.deathKind===2?[PX[e.key].hl,PX[e.key].hlb]:[PX[e.key].a,PX[e.key].b];
      e.sp.material.map=set[e.frame];e.sp.material.needsUpdate=true;}
    /* attack lunge: brief grow + lean toward player */
    let lunge=0;
    if(e.atkAnim>0){e.atkAnim-=dt;lunge=Math.sin(clamp(e.atkAnim/.22,0,1)*Math.PI);}
    const sScale=1+lunge*0.22;
    e.sp.scale.set(e.w*sScale,e.h*sScale,1);
    const ldx=dist>0.01?(px-e.x)/dist:0,ldz=dist>0.01?(pz-e.z)/dist:0;
    const lx=e.x+ldx*lunge*0.35, lz=e.z+ldz*lunge*0.35;
    if(e.fly){
      const hov=(e.flyH||1.5)+Math.sin(performance.now()/420+e.x)*.18;
      e.sp.position.set(lx,hov,lz);
      e.blob.position.set(e.x,.012,e.z);e.blob.material.opacity=.3;
    }else{
      e.fy=floorHeightAt(e.x,e.z);
      e.sp.position.set(lx,e.h/2+(e.fy||0)+Math.sin(performance.now()/300+e.x)*.03,lz);
      e.blob.position.set(e.x,(e.fy||0)+.012,e.z);}}
  return anyAware;}
function priestThink(e,dt,dist,dx,dz){
  /* phase transitions */
  if(e.phase===1&&e.hp<e.maxhp*.66){e.phase=2;
    say("boss_"+e.key+"2",true);roarFor(e);shake(.3);hitStop=Math.max(hitStop,.06);
    priestTeleport(e,true);}
  if(e.phase===2&&e.hp<e.maxhp*.33){e.phase=3;
    say("boss_"+e.key+"3",true);roarFor(e);roarFor(e);shake(.5);hitStop=Math.max(hitStop,.1);
    flashHoly(.25);
    e.formKey=e.key+"2";
    e.sp.material.map=PX[e.formKey].a;e.sp.material.needsUpdate=true;
    e.w*=1.35;e.h*=1.15;e.sp.scale.set(e.w,e.h,1);
    e.speed=e.sovereign?3.8:3.5;e.mel=e.sovereign?40:34;organChord();}
  e.tpT-=dt;e.atkT-=dt;e.sumT-=dt;e.ringT-=dt;e.debT-=dt;
  let moving=false;
  if(e.phase===1){
    if(e.tpT<=0&&dist>7){e.tpT=6;priestTeleport(e,false);}
    if(e.atkT<=0){e.atkT=3.4;fireOrb(e,rnd(-.03,.03));}
    if(dist>1.6){moving=moveEnemy(e,dx/dist,dz/dist,e.speed,dt);}
    if(dist<1.8&&e.cool<=0&&Math.abs((e.fy||0)-(pyy-EYE))<1.3){e.cool=1.1;e.atkAnim=.22;damagePlayer(e.mel);}
  }else if(e.phase===2){
    if(dist<5&&e.tpT<=0){e.tpT=2.6;priestTeleport(e,true);}
    if(e.atkT<=0){e.atkT=2.8;
      for(let i=-2;i<=2;i++)fireOrb(e,i*.13);}
    if(e.sumT<=0){e.sumT=8;
      const alive=enemies.filter(o=>o.summoned&&!o.dead).length;
      if(alive<5){
        for(let n=0;n<2;n++){
          for(let tries=0;tries<20;tries++){
            const a=rnd(0,6.28),d=rnd(3,6);
            const nx=px+Math.sin(a)*d,nz=pz+Math.cos(a)*d;
            if(!solidAt(nx,nz)){
              const ne=spawnEnemy(Math.random()<.6?"z":"f",nx,nz,true);
              ne.aware=true;ne.alertX=px;ne.alertZ=pz;
              smoke3d(nx,.6,nz,10);blood(nx,.3,nz,6,1.5);
              break;}}}
        blip(180,.6,"sawtooth",.12,60,true);
        showMsg("THE PRIEST CALLS HIS FLOCK");}}
  }else{
    if(e.ringT<=0){e.ringT=4.5;spawnRing(e.x,e.z);}
    if(e.debT<=0){e.debT=3;spawnStrike();}
    if(e.atkT<=0){e.atkT=3.6;for(let i=-1;i<=1;i++)fireOrb(e,i*.15);}
    if(e.sumT<=0){e.sumT=12;
      const alive=enemies.filter(o=>o.summoned&&!o.dead).length;
      if(alive<3){const a=rnd(0,6.28);
        const nx=px+Math.sin(a)*4,nz=pz+Math.cos(a)*4;
        if(!solidAt(nx,nz)){const ne=spawnEnemy("f",nx,nz,true);
          ne.aware=true;smoke3d(nx,.6,nz,10);}}}
    if(dist>1.7){moving=moveEnemy(e,dx/dist,dz/dist,e.speed,dt);}
    if(dist<2&&e.cool<=0&&Math.abs((e.fy||0)-(pyy-EYE))<1.3){e.cool=.95;e.atkAnim=.22;damagePlayer(e.mel);}}
  if(moving){e.animT+=dt;
    if(e.animT>.25){e.animT=0;e.frame=1-e.frame;
      const bk=e.key,fk=e.formKey||(e.key+"2");
      const set=e.phase===3?[PX[fk].a,PX[fk].b]:[PX[bk].a,PX[bk].b];
      e.sp.material.map=set[e.frame];e.sp.material.needsUpdate=true;}}
  e.sp.position.set(e.x,e.h/2+(e.fy||0)+Math.sin(performance.now()/280)*.05,e.z);
  e.blob.position.set(e.x,.012,e.z);}
/* expanding shockwave ring — jump to dodge */
const ringMatBase=new THREE.MeshBasicMaterial({color:0x9a4ae0,transparent:true,opacity:.6,side:THREE.DoubleSide});
function spawnRing(x,z){
  const m=new THREE.Mesh(new THREE.RingGeometry(.1,.45,28),ringMatBase.clone());
  m.rotation.x=-Math.PI/2;m.position.set(x,.06,z);scene.add(m);
  rings.push({m,x,z,r:.3,hitDone:false});
  bang(.3,.5,250);blip(60,.5,"sawtooth",.16,30,true);shake(.2);}
function ringTick(dt){
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];
    r.r+=6.5*dt;
    r.m.scale.set(r.r/.3,r.r/.3,1);
    r.m.material.opacity=Math.max(0,.6-r.r*.055);
    const pd=Math.hypot(px-r.x,pz-r.z);
    if(!r.hitDone&&Math.abs(pd-r.r)<.5&&pyy<EYE+.18){
      r.hitDone=true;damagePlayer(20);vx+=(px-r.x)/Math.max(pd,.2)*5;vz+=(pz-r.z)/Math.max(pd,.2)*5;}
    for(const p of props){if(p.dead)continue;
      if(Math.abs(Math.hypot(p.x-r.x,p.z-r.z)-r.r)<.5)
        p.explosive?explodeBarrel(p):breakProp(p);}
    if(r.r>9){scene.remove(r.m);rings.splice(i,1);}}}
/* falling debris strikes (priest P3) */
function spawnStrike(){
  for(let tries=0;tries<16;tries++){
    const a=rnd(0,6.28),d=rnd(1,5.5);
    const x=px+Math.sin(a)*d,z=pz+Math.cos(a)*d;
    if(solidAt(x,z))continue;
    const warn=new THREE.Mesh(new THREE.CircleGeometry(1,10),
      new THREE.MeshBasicMaterial({color:0x150a1e,transparent:true,opacity:.7}));
    warn.rotation.x=-Math.PI/2;warn.position.set(x,.025,z);scene.add(warn);
    strikes.push({x,z,t:.85,warn});
    blip(1200,.4,"sine",.05,300);
    return;}}
function strikeTick(dt){
  for(let i=strikes.length-1;i>=0;i--){const s=strikes[i];
    s.t-=dt;
    s.warn.material.opacity=.4+Math.sin(performance.now()*.02)*.3;
    if(s.t<=0){
      scene.remove(s.warn);
      spawnGibs(s.x,WALLH-.4,s.z,5,3,true);
      smoke3d(s.x,1.4,s.z,10);sparks(s.x,1,s.z,6);
      bang(.25,.5,400);shake(.18);
      if(Math.hypot(px-s.x,pz-s.z)<1.3)damagePlayer(18);
      for(const p of props){if(!p.dead&&Math.hypot(p.x-s.x,p.z-s.z)<1.3)
        p.explosive?explodeBarrel(p):breakProp(p);}
      strikes.splice(i,1);}}}
function poisonTick(dt){
  for(let i=poisonZones.length-1;i>=0;i--){const zn=poisonZones[i];
    zn.t-=dt;
    if(Math.random()<.5)toxicP(zn.x+rnd(-zn.r,zn.r)*.7,.2,zn.z+rnd(-zn.r,zn.r)*.7,1);
    if(Math.hypot(px-zn.x,pz-zn.z)<zn.r){damagePlayer(6*dt,true);}
    if(zn.t<=0)poisonZones.splice(i,1);}}

/* ============================================================
   PROJECTILES (player crosses + enemy orbs)
   ============================================================ */
function projTick(dt){
  for(let i=nails.length-1;i>=0;i--){const n=nails[i];
    n.life-=dt;
    if(!n.reap)n.vy-=5*dt;        // reap flies straight; crosses arc
    n.m.position.x+=n.vx*dt;n.m.position.y+=n.vy*dt;n.m.position.z+=n.vz*dt;
    if(n.spin)n.m.rotation.z+=n.spin*dt;
    const mx=n.m.position.x,my=n.m.position.y,mz=n.m.position.z;
    if(n.reap){ // visual tracer only — damage already applied by hitscan
      if(Math.random()<.6)spawnP(mx,my,mz,0,0,0,.5,.9,.35,.2,3);
      if(n.life<=0||my<0.05||my>WALLH||solidAt(mx,mz)){
        smoke3d(mx,Math.max(my,.3),mz,4);scene.remove(n.m);nails.splice(i,1);}
      continue;}
    let boom=n.life<=0||my<0.05||my>WALLH||solidAt(mx,mz);
    if(!boom)for(const p of props){if(p.dead)continue;
      if(Math.hypot(mx-p.x,mz-p.z)<p.r+.1&&my<p.hgt){boom=true;break;}}
    if(!boom)for(const e of enemies){if(e.dead||e.dormant)continue;
      if(Math.hypot(mx-e.x,mz-e.z)<e.w*.5&&my>0&&my<e.h*1.05){
        volleyHit=true;S.hitsLanded++;boom=true;break;}}
    if(boom){crossExplode(mx,Math.max(my,.3),mz);
      scene.remove(n.m);nails.splice(i,1);}}
  for(let i=orbs.length-1;i>=0;i--){const o=orbs[i];
    o.life-=dt;
    if(o.flesh){o.vy-=11*dt;o.m.rotation.x+=o.spin*dt;o.m.rotation.z+=o.spin*.7*dt;}
    o.m.position.x+=o.vx*dt;o.m.position.y+=o.vy*dt;o.m.position.z+=o.vz*dt;
    if(o.flesh){
      if(Math.random()<.7)blood(o.m.position.x,o.m.position.y,o.m.position.z,1,.6);
    }else if(Math.random()<.4){
      const c=o.col||0x9a4ae0,r2=(c>>16&255)/255,g2=(c>>8&255)/255,b2=(c&255)/255;
      spawnP(o.m.position.x,o.m.position.y,o.m.position.z,0,0,0,r2,g2,b2,.25,3);}
    let dead=o.life<=0||solidAt(o.m.position.x,o.m.position.z)||(o.flesh&&o.m.position.y<.1);
    const hit=Math.hypot(o.m.position.x-px,o.m.position.z-pz)<.55&&
       Math.abs(o.m.position.y-(pyy-.3))<1;
    if(!dead&&hit){damagePlayer(o.dmg);
      if(o.flesh){blood(px,pyy-.2,pz,10,1.5);gurgle(.2,.35);}
      dead=true;}
    if(dead){
      if(o.flesh){blood(o.m.position.x,Math.max(.1,o.m.position.y),o.m.position.z,8,1.4);
        addPool(o.m.position.x,o.m.position.z,rnd(.2,.4));gurgle(.16,.25);}
      scene.remove(o.m);orbs.splice(i,1);}}}

/* ============================================================
   PLAYER
   ============================================================ */
function damagePlayer(d,silent){
  if(S.dead||S.won)return;
  if(spawnGuard>0)return;   // can't be hurt during spawn protection
  let dmg=d;
  if(S.armor>0){const ab=Math.min(S.armor,dmg*.6);S.armor-=ab;dmg-=ab;}
  S.hp-=dmg;
  if(!silent){flashDmg(.45);shake(.3);screenBlood();
    bang(.1,.3,700);blip(90,.2,"sawtooth",.12,40);}
  if(S.hp<35&&Math.random()<.3)say("lowhp");
  if(S.hp<=0){S.hp=0;S.dead=true;
    stopBossMusic();
    document.exitPointerLock();
    document.getElementById("deadquip").textContent='ADEM: “'+pick(M.dead)+'”';
    document.getElementById("dead").classList.remove("hidden");}}
function accelerate(wx_,wz_,maxs,acc,dt){
  const cur=vx*wx_+vz*wz_,add=maxs-cur;if(add<=0)return;
  let a=acc*maxs*dt;if(a>add)a=add;vx+=wx_*a;vz+=wz_*a;}
function collides(x,z){
  for(const[ox,oz]of[[R,R],[R,-R],[-R,R],[-R,-R],[R,0],[-R,0],[0,R],[0,-R]])
    if(solidAt(x+ox,z+oz))return true;
  if(wallSegs.length&&segBlocked(x,z,R+.05))return true;
  for(const p of props){if(p.dead)continue;
    if(Math.hypot(x-p.x,z-p.z)<p.r+R)return true;}
  return false;}
function footstep(sprinting){
  if(!AC)return;
  const marble=S.level===1;
  bang(.05,sprinting?.09:.06,marble?2400:700,marble?600:0);
  if(marble)blip(rnd(800,1000),.05,"sine",.02);}
function playerTick(dt){
  if(S.dead||S.won||inputLock)return;
  if(spawnGuard>0)spawnGuard-=dt;
  let f=0,s2=0;
  if(keys.KeyW)f++;if(keys.KeyS)f--;if(keys.KeyD)s2++;if(keys.KeyA)s2--;
  const sin=Math.sin(yaw),cos=Math.cos(yaw);
  let wx_=-sin*f+cos*s2,wz_=-cos*f-sin*s2;
  const l=Math.hypot(wx_,wz_);if(l>0){wx_/=l;wz_/=l;}
  const sprint=keys.ShiftLeft||keys.ShiftRight;
  const fh=floorHeightAt(px,pz);          // ground height under the player
  const standY=EYE+fh;
  if(grounded){
    const fr=Math.exp(-8*dt);vx*=fr;vz*=fr;
    accelerate(wx_,wz_,sprint?10.5:7,9,dt);
    if(keys.Space){vy=7.4;grounded=false;blip(140,.06,"sine",.04,90);}
  }else accelerate(wx_,wz_,1.4,70,dt);
  vy-=20*dt;pyy+=vy*dt;
  if(pyy<=standY){if(!grounded){footstep(true);shake(.04);}pyy=standY;vy=0;grounded=true;}
  let nx=px+vx*dt;
  if(!collides(nx,pz)&&!(grounded&&floorHeightAt(nx,pz)-fh>1.2)){px=nx;}else vx=0;
  let nz=pz+vz*dt;
  if(!collides(px,nz)&&!(grounded&&floorHeightAt(px,nz)-fh>1.2)){pz=nz;}else vz=0;
  // if we walked onto higher ground, snap up; onto lower ground, start falling
  const nfh=floorHeightAt(px,pz),nStand=EYE+nfh;
  if(grounded){
    if(nStand>pyy+0.02){pyy=nStand;}        // step up
    else if(nStand<pyy-0.02){grounded=false;} // walked off a ledge -> fall
  }
  const spd=Math.hypot(vx,vz);
  bobT+=spd*dt*(sprint?1.9:1.6);
  const bobSin=Math.sin(bobT*4);
  if(grounded&&spd>1&&lastBobSin<=0&&bobSin>0)footstep(sprint);
  lastBobSin=bobSin;
  trauma=Math.max(0,trauma-dt*1.6);
  const sh=trauma*trauma,t=performance.now();
  const shx=sh*.06*Math.sin(t*.061),shy=sh*.05*Math.sin(t*.083),shr=sh*.05*Math.sin(t*.047);
  recoilPitch*=Math.exp(-8*dt);
  camera.position.set(px+shx,pyy+(grounded?bobSin*.025*Math.min(1,spd/7):0)+shy,pz);
  camera.rotation.order="YXZ";
  camera.rotation.y=yaw;camera.rotation.x=pitch+recoilPitch;camera.rotation.z=shr;
  lamp.position.set(px,pyy+.4,pz);
  if(lampCore)lampCore.position.set(px,pyy+.2,pz);
  /* exit pad (level 1) */
  if(exitPos&&Math.hypot(px-exitPos.x,pz-exitPos.z)<1.2){
    const bossLeft=enemies.some(e=>e.boss&&!e.dead);
    if(bossLeft)showMsg("SOMETHING STILL BREATHES HERE",1.5);
    else endLevel();}
  /* challenge plate */
  if(challenge&&challenge.state===0&&Math.hypot(px-challenge.x,pz-challenge.z)<1){
    challenge.state=1;say("challenge",true);
    showMsg("THE PLATE HUMS — THEY ARE COMING",3);
    blip(70,1,"sawtooth",.15,40,true);
    challenge.plate.material.color.setHex(0xc83a20);
    challenge.light.color.setHex(0xc83a20);
    for(let n=0;n<5;n++){
      const a=n/5*6.28,d=rnd(3,5);
      const sxp=challenge.x+Math.sin(a)*d,szp=challenge.z+Math.cos(a)*d;
      if(!solidAt(sxp,szp)){
        const ne=spawnEnemy(n<3?"f":"z",sxp,szp,true);
        ne.aware=true;ne.alertX=px;ne.alertZ=pz;
        smoke3d(sxp,.6,szp,8);}}
    alertSound(px,pz,30);}
  if(challenge&&challenge.state===1){
    if(!enemies.some(e=>e.summoned&&!e.dead)){
      challenge.state=2;say("challenge_done",true);
      ach("gauntlet","THE GAUNTLET","Survive the challenge plate");
      challenge.plate.material.color.setHex(0x4ab86a);
      challenge.light.color.setHex(0x4ab86a);
      ["armor","crosses","bullets"].forEach((k,i)=>{
        items.push({kind:k,x:challenge.x+(i-1)*.8,z:challenge.z,
          sp:addSprite(ITEMTEX[k],challenge.x+(i-1)*.8,challenge.z,.55,.55,.5),bob:i});});
      blip(523,.3,"sine",.1,1046,true);}}}

/* ============================================================
   INTERACTION + PICKUPS
   ============================================================ */
const WNAMES={w1:"SAWED-OFF SHOTGUN",w2:"COMBAT RIFLE",w3:"TOMMY GUN",w4:"BMG SNIPER",w5:"HOLY CROSS LAUNCHER",w6:"NAIL CANNON",w7:"SOUL REAPER"};
function interact(){
  if(!started||inputLock)return;
  if(pianoPos&&Math.hypot(px-pianoPos.x,pz-pianoPos.z)<1.9){openPiano();return;}
  const dir=new THREE.Vector3();camera.getWorldDirection(dir);
  for(let t=.4;t<2.6;t+=.2){
    const wx_=px+dir.x*t,wz_=pz+dir.z*t;
    const gx=wx_/CELL|0,gz=wz_/CELL|0,d=doors[gx+","+gz];
    if(d&&!d.open){
      if(d.locked&&!S.key){showMsg("IT WANTS THE RED KEY",2.2);
        say("locked");growl(80,.3,.25,true);return;}
      d.open=true;
      if(d.flesh)wetDoor();else stoneDoor();
      alertSound(wx_,wz_,8);
      if(d.secret){S.secrets++;S.totSecrets++;say("secret",true);
        showMsg("SECRET FOUND — "+S.secrets+"/"+S.secretsTotal,3);
        if(S.totSecrets===2)ach("curious","TRUST ISSUES","Find 2 secret rooms");}
      else if(d.locked)showMsg("THE GATE ACCEPTS THE KEY",2.4);
      return;}
    if(solidAt(wx_,wz_))return;}}
function itemsTick(dt){
  for(const it of items){
    if(it.taken)continue;
    it.bob+=dt*2.4;it.sp.position.y=.5+Math.sin(it.bob)*.07;
    if(Math.hypot(px-it.x,pz-it.z)<.95){
      let ok=true;
      switch(it.kind){
        case "health":if(S.hp>=100){ok=false;break;}S.hp=Math.min(100,S.hp+25);showMsg("+25 HEALTH");break;
        case "armor":S.armor=Math.min(100,S.armor+50);showMsg("+50 ARMOR");break;
        case "bullets":S.ammo.bullets+=18;showMsg("+18 BULLETS");break;
        case "shells":S.ammo.shells+=6;showMsg("+6 SHELLS");break;
        case "slugs":S.ammo.slugs+=4;showMsg("+4 SLUGS");break;
        case "crosses":S.ammo.crosses+=3;showMsg("+3 BLESSED CROSSES");break;
        case "nails":S.ammo.nails+=40;showMsg("+40 NAILS");break;
        case "souls":S.ammo.souls+=3;showMsg("+3 SOULS");break;
        case "key":S.key=true;say("key",true);showMsg("RED KEY — IT IS WARM",3);break;
        default:{
          const wi=+it.kind[1];
          S.weapons[wi]=true;
          const w=WEAPONS[wi];
          const fill=Math.min(w.magSize,4);
          S.mag[wi]=Math.max(S.mag[wi],fill);
          S.ammo[w.ammo]+=w.magSize;
          requestSwitch(wi);
          showMsg(WNAMES[it.kind]+" ACQUIRED",2.6);
          if(it.kind==="w1")say("w2",true);
          if(it.kind==="w4")say("w5",true);
          if(it.kind==="w5")say("w6",true);}}
      if(ok){it.taken=true;scene.remove(it.sp);blip(330,.14,"sine",.1,210,true);gurgle(.12,.12);}}}
  /* free SMG after enough kills if not yet found */
  if(!S.weapons[3]&&S.totKills>=8){S.weapons[3]=true;S.mag[3]=36;
    showMsg("SCRAP SMG ASSEMBLED FROM THE DEAD",3);blip(330,.12,"square",.08);}}
function doorTick(dt){for(const k in doors){const d=doors[k];
  if(d.open&&d.mesh.position.y>-WALLH/2+.1)d.mesh.position.y-=dt*2.6;}}
function propTick(dt){for(const p of props){
  if(p.dead||p.fuse<0)continue;
  p.fuse-=dt;if(p.fuse<=0)explodeBarrel(p);}}
function torchTick(dt,t){
  for(const tc of torches){
    const n=Math.sin(t*.011+tc.seed*7)*Math.sin(t*.017+tc.seed*3);
    tc.L.intensity=1.6+n*.45+Math.random()*.18;
    if(Math.random()<.06){tc.fr=1-tc.fr;
      tc.sp.material.map=ITEMTEX.torch[tc.fr];tc.sp.material.needsUpdate=true;}
    if(Math.random()<.04)emberP(tc.x+rnd(-.1,.1),1.4,tc.z+rnd(-.1,.1));}
  for(const c of candles){
    c.sp.material.opacity=.8+Math.sin(t*.02+c.seed*9)*.2;}}

/* ============================================================
   RANDOM EVENTS
   ============================================================ */
let darkT=0,savedAmb=0;
function eventTick(dt){
  if(darkT>0){darkT-=dt;
    if(darkT<=0){ambLight.intensity=savedAmb;
      for(const tc of torches)tc.L.visible=true;
      showMsg("THE LIGHT RETURNS");}}
  eventT-=dt;if(eventT>0)return;
  eventT=rnd(55,100);
  const r=Math.random();
  if(r<.45){ /* blackout */
    savedAmb=ambLight.intensity;ambLight.intensity=.12;
    for(const tc of torches)tc.L.visible=false;
    darkT=8;say("event_dark",true);
    blip(50,2,"sine",.1,30,true);bang(.4,.1,300);
  }else if(r<.8&&S.level===1){ /* the bells */
    bellToll();say("event_bell",true);
    for(const e of enemies){if(!e.dead&&!e.dormant)e.frenzy=7;}
    showMsg("THE BELLS ARE RINGING",3);
  }else{ /* whispers */
    for(let i=0;i<3;i++)setTimeout(()=>blip(rnd(300,500),.7,"sine",.025,rnd(120,200),true),i*600);}}

/* ============================================================
   PLAYABLE PIANO
   ============================================================ */
const WHITE=[[60,"A"],[62,"S"],[64,"D"],[65,"F"],[67,"G"],[69,"H"],[71,"J"],[72,"K"],[74,"L"],[76,";"]];
const BLACK=[[61,"W",0],[63,"E",1],[66,"T",3],[68,"Y",4],[70,"U",5],[73,"O",7],[75,"P",8]];
const KEYMAP={KeyA:60,KeyS:62,KeyD:64,KeyF:65,KeyG:67,KeyH:69,KeyJ:71,KeyK:72,KeyL:74,Semicolon:76,
  KeyW:61,KeyE:63,KeyT:66,KeyY:68,KeyU:70,KeyO:73,KeyP:75};
let keyEls={},noteHist=[];
function buildPiano(){
  const wrap=document.getElementById("pkeys");
  WHITE.forEach(([midi,label])=>{
    const k=document.createElement("div");k.className="wk";
    k.innerHTML="<span>"+label+"</span>";
    k.addEventListener("mousedown",()=>pressKey(midi));
    wrap.appendChild(k);keyEls[midi]=k;});
  BLACK.forEach(([midi,label,after])=>{
    const k=document.createElement("div");k.className="bk";
    k.style.left=(after*43+43-13)+"px";
    k.innerHTML="<span>"+label+"</span>";
    k.addEventListener("mousedown",ev=>{ev.stopPropagation();pressKey(midi);});
    wrap.appendChild(k);keyEls[midi]=k;});}
function pressKey(midi){
  pianoNote(midi);
  S.pianoNotes++;
  const el=keyEls[midi];
  if(el){el.classList.add("on");setTimeout(()=>el.classList.remove("on"),140);}
  noteHist.push(midi);if(noteHist.length>8)noteHist.shift();
  if(S.pianoNotes===12)ach("pianist","NOCTURNE FOR THE DEAD","Play 12 notes");
  /* E D C D E E E — recital */
  const want=[64,62,60,62,64,64,64];
  if(noteHist.length>=7&&want.every((m,i)=>noteHist[noteHist.length-7+i]===m)){
    noteHist=[];
    ach("recital","RECITAL","Perform a melody for no one");
    say("piano_played",true);organChord();
    if(pianoPos)items.push({kind:"crosses",x:pianoPos.x+1.4,z:pianoPos.z,
      sp:addSprite(ITEMTEX.crosses,pianoPos.x+1.4,pianoPos.z,.55,.55,.5),bob:0});}}
function pianoKeyDown(code){const m=KEYMAP[code];if(m)pressKey(m);}
function openPiano(){
  pianoOpen=true;firing=false;
  document.getElementById("piano").style.display="flex";
  document.exitPointerLock();
  say("piano",true);}
function closePiano(){
  pianoOpen=false;
  document.getElementById("piano").style.display="none";
  renderer.domElement.requestPointerLock();}

/* ============================================================
   LEVEL END + WIN + HUD
   ============================================================ */
function gradeOf(){
  const acc=S.shots>0?S.hitsLanded/S.shots:0;
  const score=(S.killsTotal?S.kills/S.killsTotal:1)*40+
    (S.secretsTotal?S.secrets/S.secretsTotal:1)*25+Math.min(1,acc)*25+
    Math.min(1,S.propsBroken/10)*10;
  if(acc>=.7)ach("deadeye","DEADEYE","Finish a level with 70%+ accuracy");
  return score>=85?"S":score>=70?"A":score>=55?"B":score>=40?"C":"D";}
function statsHtml(){
  const t=((performance.now()-S.levelT0)/1000)|0;
  const acc=S.shots>0?Math.round(100*S.hitsLanded/S.shots):0;
  return `KILLS <b>${S.kills} / ${S.killsTotal}</b> · GIBBED <b>${S.gibs}</b><br>`+
    `SECRETS <b>${S.secrets} / ${S.secretsTotal}</b> · OBJECTS BROKEN <b>${S.propsBroken}</b><br>`+
    `ACCURACY <b>${acc}%</b> · TIME <b>${(t/60|0)}:${String(t%60).padStart(2,"0")}</b>`;}
function endLevel(){
  if(S.won)return;S.won=true;
  maxLevel=Math.max(maxLevel,Math.min(S.level+1,LEVELS.length-1));
  stopBossMusic();document.exitPointerLock();
  document.getElementById("legrade").textContent=gradeOf();
  document.getElementById("lestats").innerHTML=statsHtml();
  const nextName=LEVELS[S.level+1]?LEVELS[S.level+1].name.replace(/^LEVEL \d+ — /,""):"";
  document.getElementById("lebtn").textContent="[ DESCEND TO "+nextName+" ]";
  document.getElementById("levelend").classList.remove("hidden");}
document.getElementById("lebtn").addEventListener("click",()=>{
  document.getElementById("levelend").classList.add("hidden");
  S.won=false;
  loadLevel(S.level+1);
  renderer.domElement.requestPointerLock();});
function showWin(){
  if(S.dead)return;S.won=true;
  stopBossMusic();document.exitPointerLock();
  document.getElementById("wingrade").textContent=gradeOf();
  document.getElementById("winstats").innerHTML=statsHtml()+
    `<br>ACHIEVEMENTS <b>${Object.keys(S.ach).length}</b> · TOTAL KILLS <b>${S.totKills}</b>`;
  document.getElementById("win").classList.remove("hidden");}
function hud(){
  document.querySelector("#hp .num").textContent=Math.max(0,Math.ceil(S.hp));
  document.querySelector("#ar .num").textContent=Math.ceil(S.armor);
  const w=WEAPONS[S.cur];
  document.querySelector("#am .num").innerHTML=
    S.mag[S.cur]+'<span class="sub2"> | '+S.ammo[w.ammo]+"</span>";
  document.getElementById("wname").textContent=
    w.name+(wstate==="reload"?" — RELOADING":"");
  document.getElementById("keys").textContent=S.key?"■ RED KEY":"";
  const kw=document.getElementById("kickwrap");
  document.getElementById("kickfill").style.width=(100*(1-S.kickCd/15))+"%";
  document.getElementById("kicklabel").textContent=
    S.kickCd>0?("KICK "+Math.ceil(S.kickCd)+"s"):"KICK [RMB]";
  kw.classList.toggle("ready",S.kickCd<=0);
  const boss=enemies&&enemies.find(e=>e.boss&&!e.dead&&!e.dormant);
  const bb=document.getElementById("bossbar");
  if(boss&&!cine){bb.style.display="block";
    document.getElementById("bossname").textContent=
      boss.name+(boss.priest?" — PHASE "+boss.phase:"");
    document.getElementById("bossfill").style.width=(100*boss.hp/boss.maxhp)+"%";}
  else bb.style.display="none";}

/* ============================================================
   IDLE QUIPS + SUBTITLE TIMER
   ============================================================ */
function chatterTick(dt,anyAware){
  if(subT>0){subT-=dt;
    if(subT<=0)document.getElementById("subt").innerHTML="";}
  if(anyAware){idleT=rnd(26,40);return;}
  idleT-=dt;
  if(idleT<=0){idleT=rnd(26,40);say("idle");}}

/* ============================================================
   MAIN LOOP + BOOT
   ============================================================ */
let maxLevel=0;
function startGame(idx){
  if(started)return;
  document.getElementById("intro").classList.add("hidden");
  document.getElementById("chapsel").classList.add("hidden");
  document.getElementById("settings").classList.add("hidden");
  started=true;
  audioInit();
  buildTextures();buildSprites();buildItemTex();buildWeaponSprites();buildPiano();
  loadLevel(idx||0);
  S.t0=performance.now();
  renderer.domElement.requestPointerLock();}
/* ---- menu navigation ---- */
function showScreen(id){
  ["intro","chapsel","settings"].forEach(s=>
    document.getElementById(s).classList.toggle("hidden",s!==id));}
document.getElementById("mNew").addEventListener("click",()=>{maxLevel=0;startGame(0);});
document.getElementById("mSettings").addEventListener("click",()=>showScreen("settings"));
document.getElementById("setBack").addEventListener("click",()=>showScreen("intro"));
document.getElementById("chapBack").addEventListener("click",()=>showScreen("intro"));
document.getElementById("mChapter").addEventListener("click",()=>{
  const list=document.getElementById("chaplist");
  list.innerHTML="";
  LEVELS.forEach((lv,i)=>{
    const unlocked=i<=maxLevel;
    const row=document.createElement("div");
    const label=lv.name.replace(/^(LEVEL \d+|PROLOGUE)\s*—\s*/,"");
    const tag=i===0?"PROLOGUE":"CH "+i;
    row.className="mbtn"+(unlocked?"":" locked");
    row.textContent=unlocked?("[ "+tag+" · "+label+" ]"):("[ "+tag+" · LOCKED ]");
    if(unlocked)row.addEventListener("click",()=>startGame(i));
    list.appendChild(row);});
  showScreen("chapsel");});
/* ---- settings: master volume ---- */
(function(){
  const sl=document.getElementById("volSlider"),vv=document.getElementById("volVal");
  sl.value=Math.round(masterVol*100);vv.textContent=sl.value;
  sl.addEventListener("input",()=>{
    masterVol=sl.value/100;vv.textContent=sl.value;
    if(masterG)masterG.gain.value=masterVol;});
})();
let last=performance.now();
function loop(t){
  requestAnimationFrame(loop);
  let dt=Math.min(.05,(t-last)/1000);last=t;
  if(!started){return;}
  if(hitStop>0){hitStop-=dt;dt*=.08;}
  const paused=pianoOpen||overlayOpen()&&!pianoOpen;
  let anyAware=false;
  if(!paused&&!S.dead&&!S.won){
    cineTick(dt);
    playerTick(dt);weaponTick(dt);
    anyAware=enemyTick(dt)||false;
    projTick(dt);ringTick(dt);strikeTick(dt);poisonTick(dt);
    itemsTick(dt);doorTick(dt);propTick(dt);
    eventTick(dt);ambience(dt);vitalsAudio(dt);
    chatterTick(dt,anyAware);
    if(msgT>0){msgT-=dt;if(msgT<=0)msgEl.textContent="";}}
  if(scene){
    partTick(dt);gibTick(dt);poolTick(dt);headTick(dt);torchTick(dt,t);
    fxTick(dt,t);hud();
    renderer.render(scene,camera);}}
requestAnimationFrame(loop);
