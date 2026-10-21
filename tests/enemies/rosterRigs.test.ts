// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { rigSuite } from "./rigSuite";

/**
 * THE ROSTER, REDRAWN (owner, 2026-10-21: "Bazı düşmanlar çok kötü kalitesiz görünüyor. bosslar da öyle"): every monster and
 * boss that was still its legacy pixel block (owner, 18:08: "yeniden çiz hepsini sen. zombiler vs kalsın ama"), each given a rig, held to what the common grunts are (`./rigSuite.ts`). The legacy
 * art of these filled its whole box — a figure of blocks — so a body that is drawn as a body is held to less of its fill and its
 * width than the grunts were, and to all of its brightness and its colour.
 */
const { standing, map, px, tick } = rigSuite(["j", "y", "C", "L", "R", "k", "n", "U", "E", "Q", "Q2"], {
  head: { j: true, y: false, C: false, L: false, R: false, k: true, n: true, U: true, E: true, Q: true, Q2: true },
  fill: { j: 0.6, y: 0.54, C: 0.55, L: 0.55, R: 0.5, k: 0.6, n: 0.6, U: 0.6, E: 0.6, Q: 0.6, Q2: 0.6 },
  // the gargoyle's wings beat (at the top of the stroke it is narrower than its block was); the cacodemon is a ball where its art was a square
  width: { j: 0.8, y: 0.75, C: 0.75, L: 0.8, R: 0.8, k: 0.8, n: 0.8, U: 0.8, E: 0.8, Q: 0.8, Q2: 0.8 },
  boss: { U: true, E: true, Q: true },
  form: { Q2: "Q" },
});

describe("a priest boss in its last phase wears its second form's rig", () => {
  it("walking, it steps through the second form's frames; dying, it falls in them", () => {
    const e = standing("Q");
    e.formKey = "Q2"; e.phase = 3;
    e.alertX = 5; e.alertZ = 25; e.speed = 1.5; e.atkAnim = 0;   // investigating, unseen: the general path, no combat
    const set = px().Q2.rig as { tex(role: string, i: number, mask?: number, mirror?: boolean): unknown };
    const walk = [0, 1, 2, 3, 4, 5].map((i) => set.tex("walk", i));
    const seen = new Set<unknown>();
    for (let i = 0; i < 30; i++) { tick(0.14); seen.add(map(e)); }
    expect([...seen].every((m) => walk.includes(m)), "only the second form's walk frames").toBe(true);
    expect(seen.size).toBeGreaterThanOrEqual(4);
    e.dead = true; e.deathKind = 1; e.deathT = 0.6; e.deathDir = 1;
    tick(0.01);
    expect(map(e), "and it lies down as the second form").toBe(set.tex("die", 4, 0, false));
  });
});
