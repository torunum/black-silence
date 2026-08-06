import type { PixelDef } from "./types";

/**
 * Demons — CACODEMON, MANCUBUS, LOST SOUL, CULTIST, ETTIN.
 * Copied verbatim from reference/sonsurum.html lines 1297-1382.
 */
export const DEMONS: Record<string, PixelDef> = {
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
};
