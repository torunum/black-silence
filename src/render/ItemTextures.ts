import * as THREE from "three";
import { texFromPx } from "../enemies/SpriteBaker";

/**
 * PICKUP TEXTURES — health, every ammo type, armor, the red key, weapon
 * pickups, and the torch/candle light props. Copied verbatim from
 * reference/sonsurum.html lines 1517-1531. ITEMTEX.torch is the one entry
 * baked as a two-frame array (the flicker animation); every other entry is
 * a single texture.
 */
function pickupTex(rows: string[], pal: Record<string, string>): THREE.CanvasTexture {return texFromPx(rows,pal);}
export const ITEMTEX: Record<string, THREE.CanvasTexture | THREE.CanvasTexture[]> = {};
export function buildItemTex(): void {
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
