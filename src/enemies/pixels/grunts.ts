import type { PixelDef } from "./types";

/**
 * Grunts — the low-tier melee horde: ROTTING GHOUL, FLAYED SPRINTER, HOUND,
 * PLATED HORROR, PLAGUE BLOAT, DRAGGER, WAILER.
 * Copied verbatim from reference/sonsurum.html lines 1127-1295.
 */
export const GRUNTS: Record<string, PixelDef> = {
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
};
