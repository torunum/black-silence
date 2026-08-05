import type { Grid } from "../LevelBuilder";

/**
 * Hand-built open map with a real rising staircase (height map).
 * Layout (21 wide x 27 tall): hell cavern at the bottom (south),
 * a staircase climbing north, a raised tomb chamber at the top with the exit.
 * Copied verbatim from reference/sonsurum.html lines 275-313.
 */
export function buildPrologue(): { g: Grid; W: number; H: number; hmap: number[][] } {
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
