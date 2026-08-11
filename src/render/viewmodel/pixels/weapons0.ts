/**
 * Weapon pixel-art rows, slots 0-3: FLARE PISTOL, SAWED-OFF DOUBLE BARREL,
 * COMBAT RIFLE, TOMMY GUN. Each row is a string of palette-key characters
 * (see src/render/viewmodel/sprites.ts's GP); a space is transparent.
 * Frames: idle (1), fire (2-3), reload (3-4) - see WeaponFrameSet.
 *
 * Copied verbatim from reference/sonsurum.html lines 2315-2417 (see
 * tests/support/reference.ts's REF.viewmodelSprites) via a mechanical
 * extraction (run buildWeaponSprites() with pxCanvas faked to the identity
 * function, so reg()'s frames arrive unbaked) rather than hand transcription
 * - verified byte-identical to a matching extraction from the reference
 * before this file was written. Every character is art; change none of
 * them. Split from src/render/viewmodel/pixels/weapons1.ts (slots 4-7)
 * purely for size, mirroring src/enemies/pixels/{grunts,demons,bosses}.ts's
 * existing split of PXDEF for the same reason - both halves are exported as
 * plain arrays (no import from sprites.ts) so WeaponFrameSet is checked
 * structurally at the point sprites.ts assembles WEAPON_PIXELS, with no risk
 * of an import cycle back into sprites.ts.
 */
export const WEAPONS_0_3 = [
  { // 0: FLARE PISTOL
    idle: [[
      "         .ddhd.          ","        .dcbbhd.         ","        .dcabhd.         ","        .dcabhd.         ",
      "        .dcabhd.         ","        .dcabhd.         ","       .mpooonm.         ","       .mpooonm.         ",
      "      .bmpooonmd.        ","     .abcgghddee.        ","    .abcdggfddee.        ","    .abc..dggfee.        ",
      "   .Gabc...dggfee.J.     ","   GJKbc....dggeeKJG     ","  GJKKJbc..dggeeJKKJG    ","  GJKKKKbcdggeKKKKJG     ",
      "  .JKKKKKKKKKKKKKJ.      ","   .GJKKKKKKKKKJG.       ","    .GJKKKKKKKJG.        ","     .GGJJJJJGG.         ",
      "      .GGGGGGG.          ",
    ]],
    fire: [[
      "         .ddhd.          ","        .dcbbhd.         ","        .dcabhd.         ","        .dcabhd.         ",
      "        .dcabhd.         ","        .dcabhd.         ","       .mpooonm.         ","       .mpooonm.         ",
      "      .bmpooonmd.        ","     .abcgghddee.        ","    .abcdggfddee.        ","    .abc..dggfee.        ",
      "   .Gabc...dggfee.J.     ","   GJKbc....dggeeKJG     ","  GJKKJbc..dggeeJKKJG    ","  GJKKKKbcdggeKKKKJG     ",
      "  .JKKKKKKKKKKKKKJ.      ","   .GJKKKKKKKKKJG.       ","    .GJKKKKKKKJG.        ","     .GGJJJJJGG.         ",
      "      .GGGGGGG.          ",
    ], [
      "         .ddhd.          ","        .dcbbhd.         ","        .dcabhd.         ","        .dcabhd.         ",
      "        .dcabhd.         ","        .dcabhd.         ","       .mpooonm.         ","       .mpooonm.         ",
      "      .bmpooonmd.        ","     .abcgghddee.        ","    .abcdggfddee.        ","    .abc..dggfee.        ",
      "   .Gabc...dggfee.J.     ","   GJKbc....dggeeKJG     ","  GJKKJbc..dggeeJKKJG    ","  GJKKKKbcdggeKKKKJG     ",
      "  .JKKKKKKKKKKKKKJ.      ","   .GJKKKKKKKKKJG.       ","    .GJKKKKKKKJG.        ","     .GGJJJJJGG.         ",
      "      .GGGGGGG.          ",
    ]],
    reload: [[
      "         .ddhd.          ","        .dcbbhd.         ","        .dcabhd.         ","        .dcabhd.         ",
      "        .dcabhd.         ","        .dcabhd.         ","       .mpooonm.         ","       .mpooonm.         ",
      "      .bmpooonmd.        ","     .abcgghddee.        ","    .abcdggfddee.        ","    .abc..dggfee.        ",
      "   .Gabc...dggfee.J.     ","   GJKbc....dggeeKJG     ","  GJKKJbc..dggeeJKKJG    ","  GJKKKKbcdggeKKKKJG     ",
      "  .JKKKKKKKKKKKKKJ.      ","   .GJKKKKKKKKKJG.       ","    .GJKKKKKKKJG.        ","     .GGJJJJJGG.         ",
      "      .GGGGGGG.          ",
    ], [
      "         .ddhd.          ","        .dcbbhd.         ","        .dcabhd.         ","        .dcabhd.         ",
      "        .dcabhd.         ","        .dcabhd.         ","       .mpooonm.         ","       .mpooonm.         ",
      "      .bmpooonmd.        ","     .abcgghddee.        ","    .abcdggfddee.        ","    .abc..dggfee.        ",
      "   .Gabc...dggfee.       ","   GJKbc....dggee.       ","  ..JKbc..dggee...       ","  .SS.bcdgg.SS..         ",
      "  .ooS......oS..         ","   .So......So.          ","    .S......S.           ","     ........            ",
      "                         ",
    ], [
      "         .ddhd.          ","        .dcbbhd.         ","        .dcabhd.         ","        .dcabhd.         ",
      "        .dcabhd.         ","        .dcabhd.         ","       .mpooonm.         ","       .mpooonm.         ",
      "      .bmpooonmd.        ","     .abcgghddee.        ","    .abcdggfddee.        ","    .abc..dggfee.        ",
      "   .Gabc...dggfee.J.     ","   GJKbc....dggeeKJG     ","  GJKKJbc..dggeeJKKJG    ","  GJKKKKbcdggeKKKKJG     ",
      "  .JKKKKKKKKKKKKKJ.      ","   .GJKKKKKKKKKJG.       ","    .GJKKKKKKKJG.        ","     .GGJJJJJGG.         ",
      "      .GGGGGGG.          ",
    ]],
  },
  { // 1: SAWED-OFF DOUBLE BARREL
    idle: [[
      "  .aab.      .baa.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ",
      "  .abddb.  .bddba.   ","  .acddb.  .bddca.   ","  .acdec.  .cedca.   ","  .acdec.  .cedca.   ",
      "  .acdec.. .cedca.   ","   .bbcccdddeeb.     ","   .bccSdSddeeb.     ","   .bcSSSSSSeeb.     ",
      "  .GbccSdSSdee.J.    ","  GJKbccddddeeKJG    "," GJKKwxyzZZyxwKKJG   "," GJKKwxyZppZyxwKJG   ",
      " .JKwxyzZZZyxw.J.    ","   .wxyyzZZyxw.      ","   .wxxyyzzxw.       ","    .wwxxyyzw.       ",
      "     .wwxxyw.        ",
    ]],
    fire: [[
      "  .aab.      .baa.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ",
      "  .abddb.  .bddba.   ","  .acddb.  .bddca.   ","  .acdec.  .cedca.   ","  .acdec.  .cedca.   ",
      "  .acdec.. .cedca.   ","   .bbcccdddeeb.     ","   .bccSdSddeeb.     ","   .bcSSSSSSeeb.     ",
      "  .GbccSdSSdee.J.    ","  GJKbccddddeeKJG    "," GJKKwxyzZZyxwKKJG   "," GJKKwxyZppZyxwKJG   ",
      " .JKwxyzZZZyxw.J.    ","   .wxyyzZZyxw.      ","   .wxxyyzzxw.       ","    .wwxxyyzw.       ",
      "     .wwxxyw.        ",
    ], [
      "  .aab.      .baa.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ",
      "  .abddb.  .bddba.   ","  .acddb.  .bddca.   ","  .acdec.  .cedca.   ","  .acdec.  .cedca.   ",
      "  .acdec.. .cedca.   ","   .bbcccdddeeb.     ","   .bccSdSddeeb.     ","   .bcSSSSSSeeb.     ",
      "  .GbccSdSSdee.J.    ","  GJKbccddddeeKJG    "," GJKKwxyzZZyxwKKJG   "," GJKKwxyZppZyxwKJG   ",
      " .JKwxyzZZZyxw.J.    ","   .wxyyzZZyxw.      ","   .wxxyyzzxw.       ","    .wwxxyyzw.       ",
      "     .wwxxyw.        ",
    ]],
    reload: [[
      "  .aab.      .baa.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ",
      "  .abddb.  .bddba.   ","  .acddb.  .bddca.   ","  .acdec.  .cedca.   ","  .acdec.  .cedca.   ",
      "  .acdec.. .cedca.   ","   .bbcccdddeeb.     ","   .bccSdSddeeb.     ","   .bcSSSSSSeeb.     ",
      "  .GbccSdSSdee.J.    ","  GJKbccddddeeKJG    "," GJKKwxyzZZyxwKKJG   "," GJKKwxyZppZyxwKJG   ",
      " .JKwxyzZZZyxw.J.    ","   .wxyyzZZyxw.      ","   .wxxyyzzxw.       ","    .wwxxyyzw.       ",
      "     .wwxxyw.        ",
    ], [
      "   ...........      ","  .aabbaaaabba.     ","  .abccbabccba.     ","  .acddcacddca.     ",
      "  ..S......S....    ","  .SSS....SSS...    ","  .ooo....ooo...    ","   .bbcccdddeeb.    ",
      "   .bcccddddeeb.    ","  .GbccddddeeKJG.   ","  GJKbcccddeeKKG    "," GJKKwxyzZZyxwKKJG  ",
      " .JKwxyzZppZyxwKJ.  ","   .wxyyzZZyxw.     ","   .wxxyyzzxw.      ","    .wwxxyyzw.      ",
      "     .wwxxyw.       ","                    ","                    ","                    ",
      "                    ",
    ], [
      "   ...........      ","  .aabbaaaabba.     ","  .abccbabccba.     ","  .acddcacddca.     ",
      "  ..So.....So...    ","  .SSo....SSo...    ","  .ooo....ooo...    ","   .bbcccdddeeb.    ",
      "   .bcccddddeeb.    ","  .GbccddddeeKJG.   ","  GJKbcccddeeKKG    "," GJKKwxyzZZyxwKKJG  ",
      " .JKwxyzZppZyxwKJ.  ","   .wxyyzZZyxw.     ","   .wxxyyzzxw.      ","    .wwxxyyzw.      ",
      "    SS.....SS       ","   .So.   .oS.      ","   .SH.   .HS.      ","    HH     HH       ",
      "                    ",
    ], [
      "  .aab.      .baa.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ","  .abccb.  .bccba.   ",
      "  .abddb.  .bddba.   ","  .acddb.  .bddca.   ","  .acdec.  .cedca.   ","  .acdec.  .cedca.   ",
      "  .acdec.. .cedca.   ","   .bbcccdddeeb.     ","   .bccSdSddeeb.     ","   .bcSSSSSSeeb.     ",
      "  .GbccSdSSdee.J.    ","  GJKbccddddeeKJG    "," GJKKwxyzZZyxwKKJG   "," GJKKwxyZppZyxwKJG   ",
      " .JKwxyzZZZyxw.J.    ","   .wxyyzZZyxw.      ","   .wxxyyzzxw.       ","    .wwxxyyzw.       ",
      "     .wwxxyw.        ",
    ]],
  },
  { // 2: COMBAT RIFLE
    idle: [[
      "      .aac.          ","      .Lbc.          ","      .Lbc.          ","     .LNbc.          ",
      "     .LNbc.          ","    .LLNbcd.         ","   .LLNbccddee.      ","  .LNNbccdddeeg.     ",
      "  .LNbc.PPP.eeg.     ","  .LNbc.PPP.eeg.     ","  .GLNbcccdddeeJ.    ","  GJKLNbccddeegKJG   ",
      "  .JKLNbcdee.gKJ.    ","    .LNbcdee.g.      ","    .LNPbdee.        ","    .LNPbdee.        ",
      "    .LLPPee.         ","     .LPPe.          ","     .LLPe.          ","     .LLe.           ",
      "      .Le.           ",
    ]],
    fire: [[
      "      .aac.          ","      .Lbc.          ","      .Lbc.          ","     .LNbc.          ",
      "     .LNbc.          ","    .LLNbcd.         ","   .LLNbccddee.      ","  .LNNbccdddeeg.     ",
      "  .LNbc.PPP.eeg.     ","  .LNbc.PPP.eeg.     ","  .GLNbcccdddeeJ.    ","  GJKLNbccddeegKJG   ",
      "  .JKLNbcdee.gKJ.    ","    .LNbcdee.g.      ","    .LNPbdee.        ","    .LNPbdee.        ",
      "    .LLPPee.         ","     .LPPe.          ","     .LLPe.          ","     .LLe.           ",
      "      .Le.           ",
    ], [
      "      .aac.          ","      .Lbc.          ","      .Lbc.          ","     .LNbc.          ",
      "     .LNbc.          ","    .LLNbcd.         ","   .LLNbccddee.      ","  .LNNbccdddeeg.     ",
      "  .LNbc.PPP.eeg.     ","  .LNbc.PPP.eeg.     ","  .GLNbcccdddeeJ.    ","  GJKLNbccddeegKJG   ",
      "  .JKLNbcdee.gKJ.    ","    .LNbcdee.g.      ","    .LNPbdee.        ","    .LNPbdee.        ",
      "    .LLPPee.         ","     .LPPe.          ","     .LLPe.          ","     .LLe.           ",
      "      .Le.           ",
    ], [
      "      .aac.          ","      .Lbc.          ","      .Lbc.          ","     .LNbc.          ",
      "     .LNbc.          ","    .LLNbcd.         ","   .LLNbccddee.      ","  .LNNbccdddeeg.     ",
      "  .LNbc.PPP.eeg.     ","  .LNbc.PPP.eeg.     ","  .GLNbcccdddeeJ.    ","  GJKLNbccddeegKJG   ",
      "  .JKLNbcdee.gKJ.    ","    .LNbcdee.g.      ","    .LNPbdee.        ","    .LNPbdee.        ",
      "    .LLPPee.         ","     .LPPe.          ","     .LLPe.          ","     .LLe.           ",
      "      .Le.           ",
    ]],
    reload: [[
      "      .aac.          ","      .Lbc.          ","      .Lbc.          ","     .LNbc.          ",
      "     .LNbc.          ","    .LLNbcd.         ","   .LLNbccddee.      ","  .LNNbccdddeeg.     ",
      "  .LNbc.PPP.eeg.     ","  .LNbc.PPP.eeg.     ","  .GLNbcccdddeeJ.    ","  GJKLNbccddeegKJG   ",
      "  .JKLNbcdee.gKJ.    ","    .LNbcdee.g.      ","    .LNPbdee.        ","    .LNPbdee.        ",
      "    .LLPPee.         ","     .LPPe.          ","     .LLPe.          ","     .LLe.           ",
      "      .Le.           ",
    ], [
      "      .aac.          ","      .Lbc.          ","     .LNbc.          ","    .LLNbcd.         ",
      "   .LLNbccddee.      ","  .LNNbccdddeeg.     ","  .GLNbcccdddeeJ.    ","  GJKLNbccddeegKJG   ",
      "   .JKLNbcdeegKJ.    ","    .LNbcdee.g.      ","    .LNbcdee.        ","    ...PPee...       ",
      "    .ePPnPPe.        ","    .ePPnPPe.        ","   G.ePPnPPe.G       ","   GK.ePPPPe.KG      ",
      "    K.ePPPe.K        ","     .PPPP.          ","      .KK.           ","                     ",
      "                     ",
    ], [
      "      .aac.          ","      .Lbc.          ","      .Lbc.          ","     .LNbc.          ",
      "     .LNbc.          ","    .LLNbcd.         ","   .LLNbccddee.      ","  .LNNbccdddeeg.     ",
      "  .LNbc.PPP.eeg.     ","  .LNbc.PPP.eeg.     ","  .GLNbcccdddeeJ.    ","  GJKLNbccddeegKJG   ",
      "  .JKLNbcdee.gKJ.    ","    .LNbcdee.g.      ","    .LNPbdee.        ","    .LNPbdee.        ",
      "    .LLPPee.         ","     .LPPe.          ","     .LLPe.          ","     .LLe.           ",
      "      .Le.           ",
    ]],
  },
  { // 3: TOMMY GUN
    idle: [[
      "      .ccd.          ","      .dce.     .e.  ","      .dce.    .eeg. ","     .ddce.   .eebg. ",
      "    .dddccccccdeeb.  ","    .ddcccccccceeb.  ","    .ddc......ceeb.  ","    .bbccccccddee.   ",
      "   .Gbcc.nno.deeKJ.  ","  GJKwxynoonyyxKKJG  ","  .JKwxynppponyxKJ.  ","  .wxynoppppony.x.   ",
      "  .wxynno..onnyx.    ","  .wxyno.bb.onyx.    ","  .Gwxynnoonnyxz.J.  ","  GJKwxyyzzZZyxzKKJG ",
      "  .JKwxxyyzZyxz.J.   ","    .wxxyyzzyxz.     ","    .wwxxyyzzxz.     ","     .wwxxyyzw.      ",
      "      .wwxxw.        ",
    ]],
    fire: [[
      "      .ccd.          ","      .dce.     .e.  ","      .dce.    .eeg. ","     .ddce.   .eebg. ",
      "    .dddccccccdeeb.  ","    .ddcccccccceeb.  ","    .ddc......ceeb.  ","    .bbccccccddee.   ",
      "   .Gbcc.nno.deeKJ.  ","  GJKwxynoonyyxKKJG  ","  .JKwxynppponyxKJ.  ","  .wxynoppppony.x.   ",
      "  .wxynno..onnyx.    ","  .wxyno.bb.onyx.    ","  .Gwxynnoonnyxz.J.  ","  GJKwxyyzzZZyxzKKJG ",
      "  .JKwxxyyzZyxz.J.   ","    .wxxyyzzyxz.     ","    .wwxxyyzzxz.     ","     .wwxxyyzw.      ",
      "      .wwxxw.        ",
    ], [
      "      .ccd.          ","      .dce.     .e.  ","      .dce.    .eeg. ","     .ddce.   .eebg. ",
      "    .dddccccccdeeb.  ","    .ddcccccccceeb.  ","    .ddc......ceeb.  ","    .bbccccccddee.   ",
      "   .Gbcc.nno.deeKJ.  ","  GJKwxynoonyyxKKJG  ","  .JKwxynppponyxKJ.  ","  .wxynoppppony.x.   ",
      "  .wxynno..onnyx.    ","  .wxyno.bb.onyx.    ","  .Gwxynnoonnyxz.J.  ","  GJKwxyyzzZZyxzKKJG ",
      "  .JKwxxyyzZyxz.J.   ","    .wxxyyzzyxz.     ","    .wwxxyyzzxz.     ","     .wwxxyyzw.      ",
      "      .wwxxw.        ",
    ], [
      "      .ccd.          ","      .dce.     .e.  ","      .dce.    .eeg. ","     .ddce.   .eebg. ",
      "    .dddccccccdeeb.  ","    .ddcccccccceeb.  ","    .ddc......ceeb.  ","    .bbccccccddee.   ",
      "   .Gbcc.nno.deeKJ.  ","  GJKwxynoonyyxKKJG  ","  .JKwxynppponyxKJ.  ","  .wxynoppppony.x.   ",
      "  .wxynno..onnyx.    ","  .wxyno.bb.onyx.    ","  .Gwxynnoonnyxz.J.  ","  GJKwxyyzzZZyxzKKJG ",
      "  .JKwxxyyzZyxz.J.   ","    .wxxyyzzyxz.     ","    .wwxxyyzzxz.     ","     .wwxxyyzw.      ",
      "      .wwxxw.        ",
    ]],
    reload: [[
      "      .ccd.          ","      .dce.     .e.  ","      .dce.    .eeg. ","     .ddce.   .eebg. ",
      "    .dddccccccdeeb.  ","    .ddcccccccceeb.  ","    .ddc......ceeb.  ","    .bbccccccddee.   ",
      "   .Gbcc.nno.deeKJ.  ","  GJKwxynoonyyxKKJG  ","  .JKwxynppponyxKJ.  ","  .wxynoppppony.x.   ",
      "  .wxynno..onnyx.    ","  .wxyno.bb.onyx.    ","  .Gwxynnoonnyxz.J.  ","  GJKwxyyzzZZyxzKKJG ",
      "  .JKwxxyyzZyxz.J.   ","    .wxxyyzzyxz.     ","    .wwxxyyzzxz.     ","     .wwxxyyzw.      ",
      "      .wwxxw.        ",
    ], [
      "      .ccd.          ","      .dce.          ","      .dce.          ","     .ddce.          ",
      "    .dddcccccc.      ","    .ddccccccccb.    ","    .ddc.......b.    ","    .bbcccccccee.    ",
      "   .Gbccccccdeeb.    ","  GJKwxyyzzZZyxzKKJG ","  .JKwxxyyzzyxzKJ.   ","    .wxyyzzyxz.      ",
      "   ..nnoonn..        ","   .nopppponn.       ","   .noppppponn.      ","   .nnooooonn.       ",
      "   GK.nnoonn.KG      ","    K.nnonn.K        ","     .nnnn.          ","      .KK.           ",
      "                     ",
    ], [
      "      .ccd.          ","      .dce.     .e.  ","      .dce.    .eeg. ","     .ddce.   .eebg. ",
      "    .dddccccccdeeb.  ","    .ddcccccccceeb.  ","    .ddc......ceeb.  ","    .bbccccccddee.   ",
      "   .Gbcc.nno.deeKJ.  ","  GJKwxynoonyyxKKJG  ","  .JKwxynppponyxKJ.  ","  .wxynoppppony.x.   ",
      "  .wxynno..onnyx.    ","  .wxyno.bb.onyx.    ","  .Gwxynnoonnyxz.J.  ","  GJKwxyyzzZZyxzKKJG ",
      "  .JKwxxyyzZyxz.J.   ","    .wxxyyzzyxz.     ","    .wwxxyyzzxz.     ","     .wwxxyyzw.      ",
      "      .wwxxw.        ",
    ]],
  },
];
