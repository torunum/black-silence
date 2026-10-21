// @vitest-environment jsdom
import { rigSuite } from "./rigSuite";

/**
 * THE ROSTER, REDRAWN (owner, 2026-10-21: "Bazı düşmanlar çok kötü kalitesiz görünüyor. bosslar da öyle"): every monster and
 * boss that was still its legacy pixel block (owner, 18:08: "yeniden çiz hepsini sen. zombiler vs kalsın ama"), each given a rig, held to what the common grunts are (`./rigSuite.ts`). The legacy
 * art of these filled its whole box — a figure of blocks — so a body that is drawn as a body is held to less of its fill and its
 * width than the grunts were, and to all of its brightness and its colour.
 */
rigSuite(["j", "y", "C", "L", "R", "k", "n", "U", "E"], {
  head: { j: true, y: false, C: false, L: false, R: false, k: true, n: true, U: true, E: true },
  fill: { j: 0.6, y: 0.54, C: 0.55, L: 0.55, R: 0.5, k: 0.6, n: 0.6, U: 0.6, E: 0.6 },
  // the gargoyle's wings beat (at the top of the stroke it is narrower than its block was); the cacodemon is a ball where its art was a square
  width: { j: 0.8, y: 0.75, C: 0.75, L: 0.8, R: 0.8, k: 0.8, n: 0.8, U: 0.8, E: 0.8 },
  boss: { U: true, E: true },
});
