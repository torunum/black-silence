// @vitest-environment jsdom
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { FALL_SECS, STAGGER_SECS, fallT, swayAt } from "../../src/enemies/Corpse";
import { CORPSE_MAX, corpseCount, resetCorpses, trackCorpse } from "../../src/enemies/Corpses";
import { setScene } from "../../src/render/SceneRef";

/**
 * HOW A BODY FALLS, WHAT IT LOOKS LIKE MISSING A PART, AND HOW MANY STAY
 * (impact plan, Task 3).
 */

describe("a body falls", () => {
  it("a plain kill goes down in .45 s, as it always did", () => {
    expect(fallT(1, 0)).toBe(0);
    expect(fallT(1, 0.225)).toBeCloseTo(0.5, 9);
    expect(fallT(1, 0.45)).toBe(1);
    expect(fallT(1, 5)).toBe(1);
    expect(swayAt(1, 0.1)).toBe(0);
  });

  it("a headless body (deathKind 2) stays on its feet for STAGGER_SECS, then falls over FALL_SECS", () => {
    expect(STAGGER_SECS).toBeGreaterThan(0.2);
    expect(fallT(2, 0)).toBe(0);
    expect(fallT(2, STAGGER_SECS)).toBe(0);
    expect(fallT(2, STAGGER_SECS + FALL_SECS / 2)).toBeCloseTo(0.5, 9);
    expect(fallT(2, STAGGER_SECS + FALL_SECS)).toBeCloseTo(1, 9);
    // monotone
    let prev = 0;
    for (let t = 0; t < 1.2; t += 0.01) { const f = fallT(2, t); expect(f).toBeGreaterThanOrEqual(prev); prev = f; }
  });

  it("and sways on its feet while it staggers: a few swings of a tenth of a radian, dying away as it goes down", () => {
    let peak = 0, swings = 0, last = 0;
    for (let t = 0; t < STAGGER_SECS + FALL_SECS; t += 0.005) {
      const s = swayAt(2, t);
      peak = Math.max(peak, Math.abs(s));
      if (Math.sign(s) !== 0 && Math.sign(s) !== Math.sign(last) && last !== 0) swings++;
      last = s || last;
    }
    expect(peak).toBeGreaterThan(0.08); expect(peak).toBeLessThan(0.12);
    expect(swings).toBeGreaterThanOrEqual(1);
    expect(swayAt(2, STAGGER_SECS + FALL_SECS)).toBeCloseTo(0, 9);
    expect(swayAt(2, 3)).toBe(0);
    expect(Math.abs(swayAt(2, STAGGER_SECS + FALL_SECS - 0.01))).toBeLessThan(0.01);
  });
});

describe("a monster missing a part keeps missing it as it walks", () => {
  let walkSet: typeof import("../../src/enemies/Sever").walkSet;
  let PX: Record<string, Record<string, unknown>>;
  beforeAll(async () => {
    installDomStubs();
    const sb = await import("../../src/enemies/SpriteBaker");
    sb.buildSprites();
    PX = sb.PX as never;
    ({ walkSet } = await import("../../src/enemies/Sever"));
  });

  it("whole: the two walk frames; headless: the headless two; and each limb's own two (noLegs, noLArm, noRArm, gibbed)", () => {
    const P = PX.z;
    expect(walkSet({ key: "z", deathKind: 0 })).toEqual([P.a, P.b]);
    expect(walkSet({ key: "z", deathKind: 2 })).toEqual([P.hl, P.hlb]);
    expect(walkSet({ key: "z", deathKind: 0, severKey: "noLegs" })).toEqual([P.noLegs, P.noLegsB]);
    expect(walkSet({ key: "z", deathKind: 0, severKey: "noLArm" })).toEqual([P.noLArm, P.noLArmB]);
    expect(walkSet({ key: "z", deathKind: 0, severKey: "noRArm" })).toEqual([P.noRArm, P.noRArmB]);
    expect(walkSet({ key: "z", deathKind: 0, severKey: "gibbed" })).toEqual([P.gibbed, P.gibbedB]);
    // the two frames differ: it still walks
    for (const k of ["noLegs", "noLArm", "noRArm", "gibbed"] as const) { const [a, b] = walkSet({ key: "z", deathKind: 0, severKey: k }); expect(a).not.toBe(b); }
  });

  it("a monster with no legs is shorter by the rows the legs took (28% of its sprite), and crawls on a sprite of its own", async () => {
    const { crawlFactor } = await import("../../src/enemies/Sever");
    const { crawlArt, legRows } = await import("../../src/fx/GoreTex");
    const H = (PX.z.regions as { H: number }).H;
    expect(legRows(H)).toBe(Math.ceil(H * 0.28));
    expect(crawlFactor("z")).toBeCloseTo((H - legRows(H)) / H, 12);
    expect(crawlFactor("z")).toBeGreaterThan(0.6); expect(crawlFactor("z")).toBeLessThan(0.8);
    const c = crawlArt("z", false, false, false)!;
    expect(c.keep).toBe(H - legRows(H));
    expect(c.H).toBe(H);
    expect(c.tex).not.toBe(c.texB);
    // one sprite for each state: arms and the head each make another
    const ids = new Set([c, crawlArt("z", true, false, false), crawlArt("z", false, true, false), crawlArt("z", true, true, false), crawlArt("z", false, false, true)].map((x) => x!.tex));
    expect(ids.size).toBe(5);
    expect(crawlArt("z", true, false, false)).toBe(crawlArt("z", true, false, false));   // made once
    // a legless monster walks on the crawler's frames, and keeps missing what it is missing
    expect(walkSet({ key: "z", deathKind: 0, sever: { legs: true } })).toEqual([c.tex, c.texB]);
    expect(walkSet({ key: "z", deathKind: 0, sever: { legs: true, lArm: true } })[0]).toBe(crawlArt("z", true, false, false)!.tex);
    expect(walkSet({ key: "z", deathKind: 2, sever: { legs: true } })[0], "and headless, legless").toBe(crawlArt("z", false, false, true)!.tex);
  });
});

describe("the corpse budget", () => {
  it(`keeps the last ${CORPSE_MAX}: the oldest is taken out of the scene and marked gone, still dead`, () => {
    const scene = new THREE.Scene();
    setScene(scene);
    resetCorpses();
    const mk = () => { const sp = new THREE.Sprite(), blob = new THREE.Mesh(); scene.add(sp, blob); return { gone: false, dead: true, sp, blob }; };
    const all = Array.from({ length: CORPSE_MAX + 10 }, mk);
    expect(scene.children).toHaveLength(2 * (CORPSE_MAX + 10));
    for (const c of all) trackCorpse(c);
    expect(corpseCount()).toBe(CORPSE_MAX);
    expect(all.slice(0, 10).every((c) => c.gone)).toBe(true);
    expect(all.slice(10).every((c) => !c.gone)).toBe(true);
    expect(scene.children).toHaveLength(2 * CORPSE_MAX);
    for (const c of all.slice(0, 10)) { expect(scene.children.includes(c.sp)).toBe(false); expect(scene.children.includes(c.blob)).toBe(false); expect(c.dead, "still dead: the kills count").toBe(true); }
  });

  it("starts over with a level", () => {
    resetCorpses();
    expect(corpseCount()).toBe(0);
  });
});
