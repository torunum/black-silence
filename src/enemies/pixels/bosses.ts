import type { PixelDef } from "./types";

/**
 * Bosses and their alternate forms — FACTORY FOREMAN (V/V2), THE LIVING
 * HEART (G/G2), SLAUGHTAUR (k), AFRIT (q), REIVER (R), STONE GARGOYLE (y),
 * heavy brute (B), MUTANT EXECUTIONER (E), CATHEDRAL GUARDIAN (U),
 * CORRUPTED PRIEST (Q/Q2), THE BONE SOVEREIGN (Z/Z2), THE GRAVEDIGGER
 * (N/N2), THE HOLLOW LEVIATHAN (H/H2).
 * Copied verbatim from reference/sonsurum.html lines 1383-1485.
 */
export const BOSSES: Record<string, PixelDef> = {
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
