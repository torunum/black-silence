// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import { recordModuleSound } from "../support/soundOracle";
import { audioInit } from "../../src/audio/AudioEngine";
import * as AudioEngine from "../../src/audio/AudioEngine";
import { reseedSoundRandom } from "../../src/audio/SoundRandom";
import { envEnd, type Layer } from "../../src/audio/Layers";
import { HOLD, spin } from "../../src/audio/Spin";
import * as W from "../../src/audio/sounds/weapons";
import { SPIN } from "../../src/render/viewmodel/phases";
import { WEAPON_STATS } from "../../src/weapons/definitions";

/**
 * THE WEAPONS, REBUILT — player feedback round 2 Task 3
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). Every
 * report is a layered design (`src/audio/Layers.ts`,
 * `src/audio/sounds/weapons.ts`). A call-log test cannot say how any of it
 * sounds — the offline measurements in `docs/sound-levels.md` and the
 * spectrograms in the task report are that evidence — but it can pin what
 * the design promised:
 *
 * 1. Each report is layered: a saturated transient, several sources, the
 *    whole of it saturated together, one bus call.
 * 2. No two weapons share a design.
 * 3. The automatic weapons vary every shot, from sound's own dice: shot two
 *    is not shot one, and the same seed gives the same shots.
 * 4. Their shots end inside one period of their fire rate, so a burst is
 *    shots and not a wash.
 * 5. The weapons are the loudest category, measured, not just planned.
 * 6. The nail cannon's motor follows the animation's spin law and stops by
 *    itself.
 */

const SLOTS = WEAPON_STATS.map((w, i) => ({ i, name: w.name }));

/** A design with the per-shot jitter left out: what the layers are, not where this shot's pitch landed. */
function shape(layers: Layer[]): string {
  return JSON.stringify(layers.map((l) => ({
    kind: "noise" in l ? `noise:${l.noise}` : `tone:${l.tone}:${Array.isArray(l.f) ? l.f.length : 1}`,
    at: l.at ?? 0, env: l.env, level: l.level, drive: l.drive,
    filters: (l.filters ?? []).map((f) => `${f.type}${f.to !== undefined ? "~" : ""}`),
    formants: (l.formants ?? []).length, am: !!l.am, fm: "fm" in l && !!l.fm,
  })));
}

const created = (log: AudioEvent[], type: string): string[] =>
  log.filter((e) => e.kind === "create" && e.detail.type === type).map((e) => e.detail.node as string);

describe("each report is a layered design", () => {
  it.each(SLOTS)("$name (slot $i): a saturated transient, a body, several sources, saturated as a whole, one bus call", ({ i }) => {
    const layers = W.REPORT_DESIGNS[i]();
    expect(layers.length).toBeGreaterThanOrEqual(3);
    // the first layer starts at once and is squashed by saturation: the transient
    expect(layers[0].at ?? 0).toBe(0);
    expect(layers[0].drive).toBeGreaterThan(0);
    // every layer fades in from silence and out to it: no step at either end
    for (const l of layers) {
      expect(l.env.a).toBeGreaterThan(0);
      expect(l.env.d).toBeGreaterThan(0);
    }
    const log = recordModuleSound(W.WEAPON_FIRE_SOUNDS[i], 11);
    expect(created(log, "WaveShaperNode").length).toBeGreaterThanOrEqual(2);
    expect(created(log, "AudioBufferSourceNode").length + created(log, "OscillatorNode").length).toBeGreaterThanOrEqual(3);
    // under at(), one panner for the whole report: it reaches the bus once
    const positioned = recordModuleSound(() => AudioEngine.at(1, 2, 3, W.WEAPON_FIRE_SOUNDS[i]), 11);
    expect(created(positioned, "PannerNode")).toHaveLength(1);
  });

  it("no two weapons share a design", () => {
    const shapes = SLOTS.map(({ i }) => shape(W.REPORT_DESIGNS[i]()));
    for (let a = 0; a < shapes.length; a++) {
      for (let b = a + 1; b < shapes.length; b++) expect(shapes[a], `slot ${a} vs slot ${b}`).not.toBe(shapes[b]);
    }
  });

  it("every envelope in a played report starts from silence", () => {
    for (const { i } of SLOTS) {
      const log = recordModuleSound(W.WEAPON_FIRE_SOUNDS[i], 5);
      const gains = new Map<string, Array<Record<string, unknown>>>();
      for (const e of log) {
        if (e.kind === "param" && e.detail.prop === "gain" && (e.detail.node as string).startsWith("GainNode")) {
          gains.set(e.detail.node as string, [...(gains.get(e.detail.node as string) ?? []), e.detail]);
        }
      }
      const envelopes = [...gains.values()].filter((ev) => ev.some((d) => d.method === "exponentialRampToValueAtTime"));
      expect(envelopes.length, `slot ${i}`).toBeGreaterThanOrEqual(3);
      for (const ev of envelopes) expect(ev[0], `slot ${i}`).toMatchObject({ method: "setValueAtTime", value: 0 });
    }
  });
});

describe("the automatic weapons vary every shot, from sound's own dice", () => {
  const AUTO = SLOTS.filter(({ i }) => WEAPON_STATS[i].rate < 0.2);

  it("covers the three automatic weapons", () => {
    expect(AUTO.map(({ name }) => name)).toEqual(["COMBAT RIFLE", "TOMMY GUN", "NAIL CANNON"]);
  });

  it.each(AUTO)("$name: shot two is not shot one, and the same seed plays the same two shots", ({ i }) => {
    const frequencies = (log: AudioEvent[]): number[] =>
      log.filter((e) => e.kind === "param" && e.detail.prop === "frequency" && e.detail.method === "setValueAtTime").map((e) => e.detail.value as number);
    // two shots in a row, then the same two again (recordModuleSound reseeds sound's dice each time)
    const shots = (): number[][] => {
      const log = recordModuleSound(() => { W.WEAPON_FIRE_SOUNDS[i](); W.WEAPON_FIRE_SOUNDS[i](); }, 21);
      const f = frequencies(log);
      return [f.slice(0, f.length / 2), f.slice(f.length / 2)];
    };
    const [a1, a2] = shots();
    const [b1, b2] = shots();
    expect(a1.length).toBeGreaterThan(3);
    expect(a1).not.toEqual(a2);
    expect(b1).toEqual(a1);
    expect(b2).toEqual(a2);
    // and the difference is a jitter, not a different gun: every corner within 12%
    a1.forEach((f, n) => expect(Math.abs(a2[n] / f - 1)).toBeLessThan(0.12));
    // the dice are sound's own: a different sound seed gives different shots
    reseedSoundRandom(99);
    expect(W.REPORT_DESIGNS[i]()).not.toEqual((reseedSoundRandom(98), W.REPORT_DESIGNS[i]()));
  });

  it.each(AUTO)("$name: every layer of a shot has died away (-80 dB) before the next shot, so a burst does not smear", ({ i }) => {
    for (let n = 0; n < 20; n++) {
      for (const l of W.REPORT_DESIGNS[i]()) expect((l.at ?? 0) + envEnd(l.env)).toBeLessThan(WEAPON_STATS[i].rate);
    }
  });
});

describe("the weapons are the loudest sounds in the game, measured", () => {
  it("every weapon's measured level (docs/sound-levels.md, LK after) is above every other sound's, and at its -14 target", () => {
    const doc = readFileSync(join(__dirname, "..", "..", "docs", "sound-levels.md"), "utf8");
    const rows = [...doc.matchAll(/^\| `([\w.]+)` \| (\w+) \| [-+]?[\d.]+ \| [-+]?\d+ \| ([-+]?[\d.]+)( \(burst\))? \|/gm)]
      .map((m) => ({ name: m[1], category: m[2], lk: Number(m[3]) }));
    const weapons = rows.filter((r) => r.category === "weapon");
    const rest = rows.filter((r) => r.category !== "weapon");
    expect(weapons).toHaveLength(8);
    expect(rest.length).toBeGreaterThan(80);
    const quietestWeapon = Math.min(...weapons.map((r) => r.lk));
    const loudestElse = Math.max(...rest.map((r) => r.lk));
    expect(quietestWeapon, `quietest weapon vs ${rest.find((r) => r.lk === loudestElse)?.name}`).toBeGreaterThan(loudestElse);
    for (const w of weapons) expect(Math.abs(w.lk + 14), w.name).toBeLessThanOrEqual(0.5);
  });
});

describe("the nail cannon's motor", () => {
  function session(): { events: AudioEvent[]; ctx: Record<string, unknown> } {
    const { ctx, events } = recordingAudioContext();
    (globalThis as { AudioContext?: unknown }).AudioContext = function () { return ctx; };
    audioInit({ drones: false });
    return { events, ctx: ctx as unknown as Record<string, unknown> };
  }
  const targets = (events: AudioEvent[]) => events.filter((e) => e.kind === "param" && e.detail.method === "setTargetAtTime").map((e) => e.detail);

  it("spins up with the animation's time constant, and is told to wind down HOLD seconds on unless driven again", () => {
    const { events } = session();
    spin(true, SPIN.up, SPIN.down);
    const t = targets(events);
    expect(t.length).toBeGreaterThanOrEqual(8);
    expect(t.filter((d) => d.time === 0).every((d) => d.timeConstant === 1 / SPIN.up)).toBe(true);
    expect(t.filter((d) => d.time === HOLD).every((d) => d.timeConstant === 1 / SPIN.down)).toBe(true);
    expect(t.filter((d) => d.time === HOLD)).toHaveLength(4);
    spin(false, SPIN.up, SPIN.down, true);
  });

  it("released, it winds down at the animation's rate; left alone, it stops its oscillators", () => {
    const { events, ctx } = session();
    spin(true, SPIN.up, SPIN.down);
    ctx.currentTime = 1;
    const before = events.length;
    spin(false, SPIN.up, SPIN.down);
    const down = targets(events.slice(before));
    expect(down).toHaveLength(4);
    expect(down.every((d) => d.timeConstant === 1 / SPIN.down && d.time === 1)).toBe(true);
    ctx.currentTime = 5;
    spin(false, SPIN.up, SPIN.down);
    expect(events.filter((e) => e.kind === "stop")).toHaveLength(3);
  });

  it("put away, it stops even though the game says `gone` every frame (branch review: it used to whine silently forever)", () => {
    const { events, ctx } = session();
    spin(true, SPIN.up, SPIN.down);
    // another weapon is out: the game calls spin(false, …, true) once per frame
    for (let f = 1; f <= 600; f++) {
      ctx.currentTime = f / 60;
      spin(false, SPIN.up, SPIN.down, true);
    }
    expect(events.filter((e) => e.kind === "stop")).toHaveLength(3);
    // and the fast wind-down was scheduled once, not re-scheduled every frame
    expect(targets(events).filter((d) => d.timeConstant === 0.04)).toHaveLength(4);
  });
});
