// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type AudioEvent } from "../support/recordingAudio";
import { recordModuleSound } from "../support/soundOracle";
import { reseedSoundRandom } from "../../src/audio/SoundRandom";
import { envEnd, length, type Layer } from "../../src/audio/Layers";
import { SOUND_LEVELS, TARGETS, type SoundLevel } from "../../src/audio/Levels";
import { SURFACES, WALL_MATERIALS, surfaceFor } from "../../src/audio/Surface";
import { roomFor } from "../../src/audio/Room";
import { explosionDesign } from "../../src/audio/Blast";
import { landingDesign, landingForce, resetStride, stepDesign, stride, type Stride } from "../../src/audio/sounds/steps";
import { bulletWallDesign, kickImpactDesign } from "../../src/audio/sounds/impacts";
import { doorDesign, grind } from "../../src/audio/sounds/doors";
import { PICKUPS, pickupDesign, pickupFamily } from "../../src/audio/sounds/pickups";
import { bossBeatDesign } from "../../src/audio/sounds/music";
import * as WO from "../../src/audio/sounds/world";
import * as W from "../../src/audio/sounds/weapons";
import * as UI from "../../src/audio/sounds/ui";
import * as X from "../../src/audio/sounds/explosions";
import { startBossMusic, stopBossMusic } from "../../src/audio/Ambient";
import { DOOR_SINK_SECONDS } from "../../src/world/Grid";
import { LEVELS } from "../../src/world/levels/index";

/**
 * THE WORLD, REBUILT — player feedback round 2 Task 5
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). A call
 * log cannot say how anything sounds — the offline measurements in
 * `docs/sound-levels.md` and the spectrograms in the task report are that
 * evidence — but it can pin what each design promised:
 *
 * 1. **Footsteps**: a heel, a weight, a toe and what is underfoot; one
 *    design per floor, the floor by the level's theme; no two steps alike,
 *    from sound's own dice; the run heavier than the walk; every floor at
 *    one level (Task 2 had stone and marble 9 dB apart under one trim).
 * 2. **The landing** grows with the fall.
 * 3. **The kick**: flesh and stone are different impacts; the air has none.
 * 4. **Bullets**: stone, metal and flesh walls differ; a burst of wall hits
 *    is capped; eight pellets on one monster are one thwack.
 * 5. **Doors**: the grind lasts exactly as long as the door sinks, and the
 *    door settles at the end of it; a secret door is heavier.
 * 6. **Pickups**: each family its own sound, in the UI category.
 * 7. **The explosion**: crack, body, sub, debris, a long tail.
 * 8. **The UI is the quietest category**, measured.
 * 9. **The music**: the boss pulse keeps its 300 ms beat and its pattern,
 *    now with a level; the organ is no longer square waves.
 */

afterEach(() => reseedSoundRandom());

const DOC = readFileSync(join(__dirname, "..", "..", "docs", "sound-levels.md"), "utf8");
/** "LK after" of a row of "Every sound, before and after", by the row's name. */
function lkOf(rowName: string): number {
  const esc = rowName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`^\\| ${esc} \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| [^|]+ \\| ([-+]?[\\d.]+) \\|`, "m").exec(DOC);
  if (!m) throw new Error(`no row "${rowName}" in docs/sound-levels.md`);
  return Number(m[1]);
}
/** Each entry of "Targets and trims": its category and measured LK. */
const ENTRIES = [...DOC.matchAll(/^\| `([\w.]+)` \| (\w+) \| [-+]?[\d.]+ \| [-+]?\d+ \| ([-+]?[\d.]+)( \(burst\))? \|/gm)]
  .map((m) => ({ name: m[1], category: m[2], lk: Number(m[3]) }));

const FIXED: Stride = { p: 1, q: 1, gap: 0.03, g: 1 };
/** How much a design weighs: every layer's level times its length. */
const weight = (layers: Layer[]): number => layers.reduce((s, l) => s + (l.level ?? 1) * envEnd(l.env), 0);
const tones = (layers: Layer[]): Layer[] => layers.filter((l) => "tone" in l);
const created = (log: AudioEvent[], type: string): number => log.filter((e) => e.kind === "create" && e.detail.type === type).length;
const values = (log: AudioEvent[]): number[] => log.filter((e) => e.kind === "param" && typeof e.detail.value === "number").map((e) => e.detail.value as number);

describe("footsteps", () => {
  it("every floor is its own design: a heel, the body's weight (a falling sine), and more", () => {
    const shapes = new Set<string>();
    for (const s of SURFACES) {
      const d = stepDesign(s, false, FIXED);
      expect(d.length, s).toBeGreaterThanOrEqual(4);
      expect(tones(d).some((l) => "to" in l && (l.to as number) < (Array.isArray((l as { f: unknown }).f) ? 1e9 : (l as { f: number }).f)), `${s}: a weight that falls`).toBe(true);
      // from silence, back to silence: no layer starts with a step or holds forever
      for (const l of d) { expect(l.env.a, s).toBeGreaterThan(0); expect(envEnd(l.env), s).toBeLessThan(0.25); }
      shapes.add(JSON.stringify(d));
    }
    expect(shapes.size).toBe(SURFACES.length);
  });

  it("the floor follows the level's theme: ash in hell, marble on level 1, stone in the church and the necropolis, dirt, water, metal, flesh", () => {
    expect(LEVELS.map((l) => surfaceFor(l))).toEqual(["ash", "marble", "stone", "stone", "dirt", "water", "metal", "flesh"]);
    // …and it is read through the room the level loader already sets (tests/integration/worldSoundWiring.test.ts drives that)
    for (const l of LEVELS) expect(roomFor(l)).toBeTruthy();
  });

  it("two consecutive steps on the same floor differ, from sound's own dice; the same seed gives the same two", () => {
    // (which foot is down is the one piece of state a step keeps — the left 2% under the right — so it starts over with the dice)
    const two = (): AudioEvent[][] => [
      recordModuleSound(() => { resetStride(); WO.footstep(false, false, "stone"); }, 5),
      recordModuleSound(() => { resetStride(); WO.footstep(false, false, "stone"); WO.footstep(false, false, "stone"); }, 5),
    ];
    const [one, both] = two();
    const first = values(one), second = values(both).slice(first.length);
    expect(second.length).toBe(first.length);
    expect(second).not.toEqual(first);
    const again = two();
    expect(values(again[1])).toEqual(values(both));
    // the stride itself: pitch, filters, heel-to-toe gap and grit all move
    reseedSoundRandom(9);
    const a = stride(), b = stride();
    for (const k of ["p", "q", "gap", "g"] as const) expect(a[k], k).not.toBe(b[k]);
  });

  it("running is heavier than walking on every floor — a lower, stronger thud — without being a different sound", () => {
    for (const s of SURFACES) {
      const walk = stepDesign(s, false, FIXED), run = stepDesign(s, true, FIXED);
      expect(run.length, s).toBe(walk.length);
      expect(weight(run) / weight(walk), s).toBeGreaterThan(1.25);
      const f = (d: Layer[]): number => Math.min(...tones(d).map((l) => (Array.isArray((l as { f: unknown }).f) ? 1e9 : (l as { f: number }).f)));
      expect(f(run), s).toBeLessThan(f(walk));
    }
  });

  it("measured: every floor steps at one level, and the run is 1-6 dB above the walk on each", () => {
    const names: Record<string, string> = { stone: "stone", marble: "marble", ash: "ash", flesh: "flesh", metal: "metal grating", water: "water", dirt: "dirt and grass" };
    const walks = SURFACES.map((s) => lkOf(`Footstep (${names[s]})`));
    for (const s of SURFACES) {
      const d = lkOf(`Footstep (${names[s]}, running)`) - lkOf(`Footstep (${names[s]})`);
      expect(d, s).toBeGreaterThan(1);
      expect(d, s).toBeLessThan(6);
    }
    // Task 2 left stone and marble 9 dB apart under one trim; now every floor has its own entry at the footstep target
    expect(Math.max(...walks) - Math.min(...walks)).toBeLessThan(4);
    for (const s of SURFACES) expect(ENTRIES.find((e) => e.name === `footstep${s[0].toUpperCase()}${s.slice(1)}`)?.lk, s).toBeCloseTo(TARGETS.footstep, 0);
  });
});

describe("the landing", () => {
  it("grows with the fall: louder, lower and longer from a kerb to a jump to a gallery", () => {
    expect(landingForce(2)).toBe(0);
    expect(landingForce(12)).toBe(1);
    expect(landingForce(Number.NaN)).toBe(0);
    const [soft, jump, fall] = [4, 7.4, 12].map((v) => landingDesign("stone", v, FIXED));
    expect(weight(jump)).toBeGreaterThan(weight(soft) * 1.3);
    expect(weight(fall)).toBeGreaterThan(weight(jump) * 1.3);
    expect(length(fall)).toBeGreaterThan(length(soft));
    const body = (d: Layer[]): Layer => d[d.length - 2];
    expect((body(fall) as { f: number }).f).toBeLessThan((body(soft) as { f: number }).f);
    // measured, too: the three board rows rise
    const lk = ["stepping off a ledge", "from a jump", "from a gallery (12 m/s)"].map((h) => lkOf(`Landing, ${h}`));
    expect(lk[1]).toBeGreaterThan(lk[0]);
    expect(lk[2]).toBeGreaterThan(lk[1]);
  });
});

describe("the kick", () => {
  it("a monster and a wall are two different impacts; the air is none", () => {
    const flesh = kickImpactDesign("flesh"), stone = kickImpactDesign("stone");
    expect(JSON.stringify(flesh)).not.toBe(JSON.stringify(stone));
    expect(kickImpactDesign("air")).toEqual([]);
    expect(recordModuleSound(() => W.kickImpact("air"), 3).filter((e) => e.kind === "create")).toEqual([]);
    // flesh is wet (a modulated body) and meaty (a harder-driven thud); stone has grit
    expect(flesh.some((l) => l.am && !(l.am.type === "square"))).toBe(true);
    expect(stone.some((l) => l.am?.type === "square")).toBe(true);
    for (const t of ["flesh", "stone"] as const) expect(created(recordModuleSound(() => W.kickImpact(t), 3), "OscillatorNode"), t).toBeGreaterThan(0);
  });
});

describe("bullets", () => {
  it("stone, metal and flesh walls are three different impacts", () => {
    const d = WALL_MATERIALS.map((m) => JSON.stringify(bulletWallDesign(m, 1, 1)));
    expect(new Set(d).size).toBe(3);
    // metal rings (partials that last), stone cracks and chips (several short ticks)
    expect(bulletWallDesign("metal", 1, 1).some((l) => "tone" in l && Array.isArray(l.f) && envEnd(l.env) > 0.15)).toBe(true);
    expect(bulletWallDesign("stone", 1, 1).filter((l) => "noise" in l && envEnd(l.env) < 0.03).length).toBeGreaterThanOrEqual(3);
  });

  it("a burst of wall hits in one instant is capped at three; eight pellets on one monster are one thwack, two monsters two", () => {
    const panners = (run: () => void): number => created(recordModuleSound(run, 4), "WaveShaperNode");
    const one = panners(() => WO.bulletHitsWall("stone"));
    expect(one).toBeGreaterThan(0);
    expect(panners(() => { for (let i = 0; i < 8; i++) WO.bulletHitsWall("stone"); })).toBe(one * 3);
    const zombie = {}, ghoul = {};
    const thwack = panners(() => WO.bulletHitsFlesh(zombie));
    expect(panners(() => { for (let i = 0; i < 8; i++) WO.bulletHitsFlesh(zombie); })).toBe(thwack);
    expect(panners(() => { for (let i = 0; i < 8; i++) { WO.bulletHitsFlesh(zombie); WO.bulletHitsFlesh(ghoul); } })).toBe(thwack * 2);
  });

  it("a ricochet is a whine that varies, from sound's own dice", () => {
    const a = values(recordModuleSound(() => WO.bulletRicochet(), 11)), b = values(recordModuleSound(() => WO.bulletRicochet(), 12));
    expect(a).not.toEqual(b);
    expect(values(recordModuleSound(() => WO.bulletRicochet(), 11))).toEqual(a);
  });
});

describe("doors", () => {
  it.each(["stone", "secret", "gate"] as const)("a %s door grinds for exactly as long as it sinks, and settles when it stops", (kind) => {
    const d = doorDesign(kind);
    const g = grind(DOOR_SINK_SECONDS, 1, 1).length;
    const grindLayers = d.filter((l) => (l.at ?? 0) === 0 && envEnd(l.env) > 0.5);
    expect(grindLayers.length).toBe(g);
    for (const l of grindLayers) expect(envEnd(l.env)).toBeCloseTo(DOOR_SINK_SECONDS, 6);
    const settle = d.filter((l) => Math.abs((l.at ?? 0) - DOOR_SINK_SECONDS) < 1e-9);
    expect(settle.length).toBeGreaterThanOrEqual(2);
    expect(settle.some((l) => "tone" in l && l.drive !== undefined)).toBe(true);
  });

  it("a secret door is a heavier piece of stone: it breaks free, grinds lower and lands harder", () => {
    const stone = doorDesign("stone"), secret = doorDesign("secret");
    expect(weight(secret)).toBeGreaterThan(weight(stone) * 1.2);
    const sub = (d: Layer[]): number => Math.min(...tones(d).filter((l) => envEnd(l.env) > 0.5).map((l) => (l as { f: number }).f));
    expect(sub(secret)).toBeLessThan(sub(stone));
    expect((secret[0].at ?? 0) === 0 && secret[0].drive! >= 3).toBe(true);
  });
});

describe("pickups", () => {
  it("every family is its own sound, short, and each ammunition its own", () => {
    const designs = PICKUPS.map(([k]) => JSON.stringify(pickupDesign(k)));
    expect(new Set(designs).size).toBe(PICKUPS.length);
    for (const [k] of PICKUPS) expect(length(pickupDesign(k)), k).toBeLessThan(0.6);
    expect(PICKUPS.map(([k]) => pickupFamily(k))).toEqual(["health", "armour", "ammo", "ammo", "ammo", "ammo", "ammo", "ammo", "key", "weapon"]);
    for (const w of ["w1", "w4", "w7"]) expect(pickupFamily(w)).toBe("weapon");
  });
});

describe("the explosion", () => {
  it("is a crack, a body, a sub, debris and a long tail — bigger for a barrel than for the relic", () => {
    reseedSoundRandom(1);
    const barrel = explosionDesign(1.1), relic = explosionDesign(0.7);
    expect(barrel[0].drive).toBeGreaterThanOrEqual(4); // the crack
    expect(barrel.some((l) => "tone" in l && l.fm)).toBe(true); // the sub
    expect(barrel.some((l) => "noise" in l && l.noise === "brown" && envEnd(l.env) + (l.at ?? 0) > 2)).toBe(true); // the tail
    expect(barrel.filter((l) => (l.at ?? 0) > 0.1).length).toBeGreaterThanOrEqual(5); // the debris, landing after
    expect(length(barrel)).toBeGreaterThan(length(relic));
    for (const f of [X.barrelExplosion, X.holyCrossExplosion, X.afritDeathExplosion]) expect(created(recordModuleSound(f, 2), "WaveShaperNode")).toBeGreaterThan(3);
  });

  it("stays under the limiter in the worst case measured: an explosion, three monsters, a shotgun and footsteps", () => {
    const m = /^\| barrel explosion \+ three monsters \+ shotgun \+ running footsteps[^|]*\| [^|]+ \| \d+ \| ([-+]?[\d.]+) dBFS \| (\d+) \|/m.exec(DOC);
    expect(m, "the worst case is in docs/sound-levels.md").not.toBeNull();
    expect(Number(m![1])).toBeLessThan(0);
    expect(Number(m![2])).toBe(0);
  });
});

describe("the UI is the quietest category", () => {
  it("every pickup, the menu sounds and the UI cues are in the UI category, the lowest target, and measured there", () => {
    const ui = ["uiHover", "uiSelect", "achievementChime", "kickReady", "scrapSmgAssembled", "pickupHealth", "pickupArmour", "pickupAmmo", "pickupKey", "pickupWeapon"];
    for (const n of ui) expect((SOUND_LEVELS as Record<string, SoundLevel>)[n]?.category, n).toBe("ui");
    expect(Math.min(...Object.values(TARGETS))).toBe(TARGETS.ui);
    for (const e of ENTRIES.filter((x) => x.category === "ui")) expect(e.lk, e.name).toBeLessThanOrEqual(TARGETS.ui + 0.5);
    // …and every UI entry measures below every footstep, foley, impact, event, monster, explosion and weapon entry
    const louder = ENTRIES.filter((x) => !["ui", "ambience"].includes(x.category));
    expect(Math.max(...ENTRIES.filter((x) => x.category === "ui").map((x) => x.lk))).toBeLessThan(Math.min(...louder.map((x) => x.lk)));
  });

  it("the menu and UI sounds are no longer bare oscillators: no audible square wave, and noise or a shaped body in each", () => {
    for (const f of [UI.uiHover, UI.uiSelect, UI.achievementChime, UI.kickReady, UI.scrapSmgAssembled]) {
      const log = recordModuleSound(f, 1);
      // (a square LFO chopping noise — a rattle at 40 Hz — is a texture, not a tone; the old SMG cue was a 330 Hz square)
      const squares = log.filter((e) => e.kind === "param" && e.detail.prop === "type" && e.detail.value === "square").map((e) => e.detail.node);
      const pitch = (node: unknown): number => Math.max(...log.filter((e) => e.kind === "param" && e.detail.node === node && e.detail.prop === "frequency").map((e) => e.detail.value as number));
      expect(squares.filter((n) => pitch(n) > 100), f.name).toEqual([]);
      expect(created(log, "GainNode"), f.name).toBeGreaterThan(2);
    }
  });
});

describe("the music", () => {
  it("the boss pulse keeps its 300 ms beat and its bar — a kick every beat, a knock every second, the bass every fourth — at its level", () => {
    const beats = [0, 1, 2, 3].map(bossBeatDesign);
    expect(beats.map((b) => b.length)).toEqual([3, 5, 3, 7]);
    expect(beats[3].some((l) => "tone" in l && l.tone === "sawtooth" && (l.filters ?? []).some((f) => f.type === "lowpass"))).toBe(true);
    // the interval: one kick oscillator per 300 ms, from the first call until the stop
    const log = recordModuleSound(() => { startBossMusic(); vi.advanceTimersByTime(1250); stopBossMusic(); }, 1);
    const kicks = log.filter((e) => e.kind === "param" && e.detail.prop === "frequency" && e.detail.method === "setValueAtTime" && e.detail.value === 130);
    expect(kicks).toHaveLength(4);
  });

  it("the organ is pipes, not square waves: filtered, detuned, slow to speak", () => {
    const log = recordModuleSound(WO.organSting, 1);
    const types = log.filter((e) => e.kind === "param" && e.detail.prop === "type").map((e) => e.detail.value);
    expect(types).not.toContain("square");
    expect(types).toContain("sawtooth");
    expect(types).toContain("lowpass");
    expect(created(log, "OscillatorNode")).toBeGreaterThanOrEqual(12);
  });
});
