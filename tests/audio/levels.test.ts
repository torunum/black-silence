// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import { audioInit, unscopedConnections } from "../../src/audio/AudioEngine";
import { startBossMusic, stopBossMusic } from "../../src/audio/Ambient";
import { SOUND_LEVELS, TARGETS, type SoundLevel, type SoundName } from "../../src/audio/Levels";
import * as W from "../../src/audio/sounds/weapons";
import * as M from "../../src/audio/sounds/monsters";
import * as WO from "../../src/audio/sounds/world";
import * as UI from "../../src/audio/sounds/ui";
import * as X from "../../src/audio/sounds/explosions";

/**
 * THE LOUDNESS TABLE — player feedback round 2, Task 2. `src/audio/Levels.ts`
 * gives every sound a category and a trim; the catalogue plays each sound
 * inside its entry. What has to be true:
 *
 * 1. Every catalogue sound plays **at its own entry** — all of it, including
 *   the parts it schedules for later (a death cry's gurgle, a roar's second
 *   growl) — and nothing plays outside a level but the boss pulse.
 * 2. The categories are ordered the way the owner asked: weapons loudest,
 *   then explosions, monsters, impacts, footsteps, UI quietest.
 * 3. The trims in the code are the trims in `docs/sound-levels.md`, the
 *   measured table `scripts/sound-levels.mjs` writes.
 */

function constructorReturning(target: unknown): new () => unknown {
  function Ctor(): unknown { return target; }
  return Ctor as unknown as new () => unknown;
}

/** Every catalogue sound with the table entries it may play at, and how to play it. */
const PLAYS: Array<{ name: string; entries: SoundName[]; play: () => void }> = [];
const NOT_SOUNDS = new Set(["painPitch", "deathPitch", "ricochetRoll", "ambientStinger"]);
for (const mod of [W, M, WO, UI, X] as Array<Record<string, unknown>>) {
  for (const [name, fn] of Object.entries(mod)) {
    if (typeof fn !== "function" || NOT_SOUNDS.has(name)) continue;
    const f = fn as (...a: unknown[]) => void;
    if (name === "monsterAlert") {
      for (const k of ["C", "A", "L", "j", "n", "k", "q", "R", "y", "s"]) PLAYS.push({ name: `monsterAlert(${k})`, entries: [`monsterAlert.${k}` as SoundName], play: () => f(k) });
      PLAYS.push({ name: "monsterAlert(z)", entries: ["monsterAlert.other"], play: () => f("z") });
    } else if (name === "doorOpens") {
      PLAYS.push({ name: "doorOpens(true)", entries: ["doorFlesh"], play: () => f(true) });
      PLAYS.push({ name: "doorOpens(false)", entries: ["doorStone"], play: () => f(false) });
    } else if (name === "orbLaunch") PLAYS.push({ name, entries: ["orbLaunch"], play: () => f("heavy") });
    else if (name === "footstep") PLAYS.push({ name, entries: ["footstep"], play: () => f(true, true) });
    else if (name === "pianoKey") PLAYS.push({ name, entries: ["pianoKey"], play: () => f(60) });
    else if (f.length > 0) PLAYS.push({ name, entries: [name as SoundName], play: () => f(200) });
    else PLAYS.push({ name, entries: [name as SoundName], play: () => f() });
  }
}

/**
 * Plays `play` on the new mix with every table entry at a unique, odd trim,
 * and returns the linear gains of every strip a sound connected into.
 */
function stripGainsOf(play: () => void): { gains: number[]; unscoped: number } {
  const { ctx, events } = recordingAudioContext();
  (globalThis as { AudioContext?: unknown }).AudioContext = constructorReturning(ctx);
  vi.useFakeTimers();
  audioInit({ drones: false });
  const baseline = events.length;
  const before = unscopedConnections();
  play();
  vi.runAllTimers();
  vi.useRealTimers();
  const log = events.slice(baseline);
  // A strip is a gain created by the mix whose first connection is to the mix's sum, created in audioInit.
  const glue = events.find((e) => e.kind === "create" && e.detail.type === "DynamicsCompressorNode")!.detail.node;
  const sum = events.find((e) => e.kind === "connect" && e.detail.to === glue)!.detail.from;
  const strips = log
    .filter((e): e is AudioEvent => e.kind === "connect" && e.detail.to === sum && (e.detail.from as string).startsWith("GainNode"))
    .map((e) => e.detail.from as string);
  const gains = [...new Set(strips)].map((id) => log.filter((e) => e.kind === "param" && e.detail.node === id && e.detail.prop === "gain").at(-1)!.detail.value as number);
  return { gains, unscoped: unscopedConnections() - before };
}

const saved = new Map<string, number>();
function uniqueTrims(): Map<number, SoundName> {
  const byGain = new Map<number, SoundName>();
  Object.entries(SOUND_LEVELS as Record<string, SoundLevel>).forEach(([name, l], i) => {
    saved.set(name, l.trim);
    l.trim = -1 - i * 0.137; // no two entries alike
    byGain.set(Math.pow(10, l.trim / 20), name as SoundName);
  });
  return byGain;
}
afterEach(() => {
  for (const [name, t] of saved) (SOUND_LEVELS as Record<string, SoundLevel>)[name].trim = t;
});

describe("every catalogue sound plays at its own entry of the table", () => {
  it("covers the whole catalogue", () => {
    expect(PLAYS.length).toBeGreaterThanOrEqual(90);
  });

  it.each(PLAYS)("$name", ({ entries, play }) => {
    installDomStubs();
    const byGain = uniqueTrims();
    const { gains, unscoped } = stripGainsOf(play);
    expect(gains.length, "it made a sound through the mix").toBeGreaterThan(0);
    expect(unscoped, "every part of it, delayed parts included, played inside a level").toBe(0);
    const used = gains.map((g) => byGain.get(g) ?? `unknown gain ${g}`);
    expect([...new Set(used)]).toEqual(entries);
  });

  it("every entry in the table is used by some catalogue sound", () => {
    const used = new Set(PLAYS.flatMap((p) => p.entries));
    expect(Object.keys(SOUND_LEVELS).filter((n) => !used.has(n as SoundName))).toEqual([]);
  });

  it("the boss pulse is the one sound that plays outside any level (its beats come from a frozen setInterval)", () => {
    installDomStubs();
    const { unscoped } = stripGainsOf(() => { startBossMusic(); vi.advanceTimersByTime(1300); stopBossMusic(); });
    expect(unscoped).toBeGreaterThan(0);
  });
});

describe("the targets follow the owner's order", () => {
  it("weapons > explosions > monsters > impacts > footsteps > UI, with the added categories in between", () => {
    const order = ["weapon", "explosion", "monster", "event", "impact", "foley", "footstep", "ambience", "ui"] as const;
    for (let i = 1; i < order.length; i++) expect(TARGETS[order[i]], order[i]).toBeLessThan(TARGETS[order[i - 1]]);
    expect(Object.keys(TARGETS).sort()).toEqual([...order].sort());
  });
});
