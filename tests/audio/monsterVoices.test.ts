// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import { recordModuleSound } from "../support/soundOracle";
import { at, audioInit } from "../../src/audio/AudioEngine";
import { newMix, type Route } from "../../src/audio/Mix";
import { mulberry32 } from "../../src/audio/SoundRandom";
import { EVENTS, FAMILIES, VOICES, voiceOf, voicePlan, type VocalEvent } from "../../src/audio/VoiceTable";
import * as M from "../../src/audio/sounds/monsters";
import { ENEMY_DEFS } from "../../src/enemies/EnemyDefs";

/**
 * THE MONSTERS HAVE VOICES — player feedback round 2 Task 4
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). Every
 * enemy's vocal events are its own voice (`src/audio/VoiceTable.ts`, built
 * by `src/audio/Speak.ts`). A call log cannot say how a voice sounds — the
 * offline measurements in `docs/sound-levels.md` and the spectrograms in the
 * task report are that evidence — but it can pin what the design promised:
 *
 * 1. Every enemy has a voice, and the character follows the creature: a
 *    family by type, a fundamental that falls with size.
 * 2. A voice is a voice: cords through formant filters, a growl at 30-80 Hz,
 *    breath, grit — no vocal event is a bare swept oscillator any more.
 * 3. Bosses are heavier: a second voice an octave down, more room.
 * 4. Every emission varies, from sound's own dice, reproducibly.
 * 5. Every voice is positional: one panner for the whole of it.
 * 6. It is cheap enough to hear ten at once.
 */

const KINDS = Object.keys(ENEMY_DEFS);
const BOSSES = KINDS.filter((k) => ENEMY_DEFS[k].boss);
const size = (k: string): number => ENEMY_DEFS[k].w * ENEMY_DEFS[k].h;

/** Every vocal catalogue sound, with the kinds that make it and how to play it for one kind. */
const VOCAL: Array<{ name: string; kinds: string[]; play: (k: string, place?: (emit: () => void) => void) => void }> = [
  { name: "monsterAlert", kinds: KINDS, play: (k) => M.monsterAlert(k) },
  { name: "monsterPain", kinds: KINDS, play: (k) => M.monsterPain(k) },
  { name: "monsterDeath", kinds: KINDS.filter((k) => !ENEMY_DEFS[k].boss), play: (k) => M.monsterDeath(k) },
  { name: "monsterClaw", kinds: KINDS.filter((k) => !ENEMY_DEFS[k].priest), play: (k) => M.monsterClaw(k) },
  { name: "fleshThrow", kinds: KINDS.filter((k) => ENEMY_DEFS[k].fling), play: (k) => M.fleshThrow(k) },
  { name: "slamWindup", kinds: KINDS.filter((k) => ENEMY_DEFS[k].slam), play: (k) => M.slamWindup(k) },
  { name: "houndLunge", kinds: ["g"], play: () => M.houndLunge() },
  { name: "lostSoulCharge", kinds: ["L"], play: () => M.lostSoulCharge() },
  { name: "screamerCall", kinds: ["s"], play: () => M.screamerCall() },
  { name: "bossWakes", kinds: BOSSES, play: (k) => M.bossWakes(k) },
  { name: "bossRoar", kinds: BOSSES, play: (k, place) => M.bossRoar(k, place) },
  { name: "bossDies", kinds: BOSSES, play: (k) => M.bossDies(k) },
  { name: "priestSummons", kinds: KINDS.filter((k) => ENEMY_DEFS[k].priest), play: (k) => M.priestSummons(k) },
  { name: "orbLaunch", kinds: ["C", "A", "t", "Q"], play: (k) => M.orbLaunch("normal", k) },
];
const CASES = VOCAL.flatMap((v) => v.kinds.map((k) => ({ sound: v.name, kind: k, play: () => v.play(k), placed: (x: number, y: number, z: number) => v.play(k, (emit) => at(x, y, z, emit)) })));

const created = (log: AudioEvent[], type: string): string[] =>
  log.filter((e) => e.kind === "create" && e.detail.type === type).map((e) => e.detail.node as string);
const typeOf = (log: AudioEvent[], node: string): unknown =>
  log.filter((e) => e.kind === "param" && e.detail.node === node && e.detail.prop === "type").at(-1)?.detail.value;
const firstFrequency = (log: AudioEvent[], node: string): number =>
  log.find((e) => e.kind === "param" && e.detail.node === node && e.detail.prop === "frequency")!.detail.value as number;

/** Where each node's output goes (audio connections only, not into an AudioParam). */
function edges(log: AudioEvent[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const e of log) {
    if (e.kind !== "connect") continue;
    const to = e.detail.to as string;
    if (to.includes(".")) continue; // into a param: modulation, not signal
    out.set(e.detail.from as string, [...(out.get(e.detail.from as string) ?? []), to]);
  }
  return out;
}

/** Does signal from `from` reach the bus — a panner, or a node the mix made before this sound (its strip)? An LFO's signal ends in a param. */
function reachesBus(log: AudioEvent[], from: string): boolean {
  const g = edges(log);
  const own = new Set(log.filter((e) => e.kind === "create").map((e) => e.detail.node as string));
  const seen = new Set<string>();
  const queue = [from];
  while (queue.length) {
    const n = queue.shift()!;
    if (!own.has(n) || n.startsWith("PannerNode")) return true;
    for (const m of g.get(n) ?? []) if (!seen.has(m)) { seen.add(m); queue.push(m); }
  }
  return false;
}

/** The cords: square or sawtooth oscillators whose signal is heard — as opposed to LFOs, whose outputs end in a param. */
function cords(log: AudioEvent[]): string[] {
  return created(log, "OscillatorNode").filter((o) => ["sawtooth", "square"].includes(typeOf(log, o) as string) && reachesBus(log, o));
}

/** Does signal from `from` reach a bandpass filter on its way out? */
function throughBandpass(log: AudioEvent[], from: string): boolean {
  const g = edges(log);
  const bandpass = new Set(created(log, "BiquadFilterNode").filter((b) => typeOf(log, b) === "bandpass"));
  const seen = new Set<string>();
  const queue = [from];
  while (queue.length) {
    const n = queue.shift()!;
    if (bandpass.has(n)) return true;
    for (const m of g.get(n) ?? []) if (!seen.has(m)) { seen.add(m); queue.push(m); }
  }
  return false;
}

describe("every enemy has a voice, and the voice follows the creature", () => {
  it("every enemy in EnemyDefs has a row in the voice table, and the table names no enemy that does not exist", () => {
    expect(Object.keys(VOICES).sort()).toEqual([...KINDS].sort());
    expect(KINDS).toHaveLength(25);
  });

  it("bigger enemies have a lower fundamental: any enemy 10% bigger than another is lower", () => {
    const wrong: string[] = [];
    for (const a of KINDS) for (const b of KINDS) {
      if (size(a) >= 1.1 * size(b) && !(VOICES[a].f0 < VOICES[b].f0)) wrong.push(`${a} (${size(a).toFixed(2)}, ${VOICES[a].f0} Hz) vs ${b} (${size(b).toFixed(2)}, ${VOICES[b].f0} Hz)`);
    }
    expect(wrong).toEqual([]);
    // and the range is a creature's, not a synth's: a lost soul's shriek to a heart the size of a room
    expect(Math.max(...KINDS.map((k) => VOICES[k].f0)) / Math.min(...KINDS.map((k) => VOICES[k].f0))).toBeGreaterThan(8);
  });

  it("the family follows the type: small fast things skitter, the dead moan, big demons bellow, fliers hiss, bosses are titans", () => {
    const fam = (k: string) => VOICES[k].family;
    for (const k of ["L", "w", "g"]) expect(fam(k), k).toBe("skitter");
    for (const k of ["z", "f", "m", "t", "j", "s"]) expect(fam(k), k).toBe("moan");
    for (const k of ["A", "n", "B", "k"]) expect(fam(k), k).toBe("bellow");
    for (const k of KINDS.filter((k) => ENEMY_DEFS[k].fly && k !== "L")) expect(fam(k), k).toBe("hiss");
    for (const k of KINDS) expect(fam(k) === "titan", k).toBe(!!ENEMY_DEFS[k].boss);
  });

  it("every growl is at 30-80 Hz, and every voice has breath and grit, on every emission", () => {
    const rnd = mulberry32(5);
    for (const k of KINDS) for (const ev of Object.keys(EVENTS) as VocalEvent[]) for (let n = 0; n < 8; n++) {
      const p = voicePlan(k, ev, rnd);
      expect(p.growl.rate, `${k} ${ev}`).toBeGreaterThanOrEqual(30);
      expect(p.growl.rate, `${k} ${ev}`).toBeLessThanOrEqual(80);
      expect(p.growl.depth).toBeGreaterThan(0);
      expect(p.breath).toBeGreaterThan(0);
      expect(p.grit).toBeGreaterThan(0);
      expect(p.formants).toHaveLength(3);
    }
  });
});

describe("a voice is a voice: no vocal event is a bare swept oscillator any more", () => {
  it.each(CASES)("$sound($kind): its cords go through formant filters, and it growls", ({ play }) => {
    const log = recordModuleSound(play, 3);
    const c = cords(log);
    expect(c.length, "it has cords").toBeGreaterThan(0);
    for (const o of c) expect(throughBandpass(log, o), `${o} reaches the bus without a formant`).toBe(true);
    expect(created(log, "BiquadFilterNode").filter((b) => typeOf(log, b) === "bandpass").length).toBeGreaterThanOrEqual(3);
    expect(created(log, "WaveShaperNode").length, "grit").toBeGreaterThanOrEqual(1);
    // the growl: an oscillator at 30-80 Hz driving a gain's level
    const lfos = created(log, "OscillatorNode").filter((o) => !c.includes(o));
    expect(lfos.some((o) => { const f = firstFrequency(log, o); return f >= 30 && f <= 80; }), "a 30-80 Hz growl").toBe(true);
  });

  it("the vocal catalogue sounds call none of the old voices (blip, bang, growl, pain, deathCry, snarl)", () => {
    const src = readFileSync(join(__dirname, "..", "..", "src", "audio", "sounds", "monsters.ts"), "utf8");
    for (const v of VOCAL) {
      const m = new RegExp(`export function ${v.name}\\([^)]*\\)[^{]*\\{([^\\n]*(?:\\n(?!export)[^\\n]*)*)`).exec(src);
      expect(m, v.name).not.toBeNull();
      expect(m![1], v.name).not.toMatch(/(?<![.\w$])(blip|bang|growl|pain|deathCry|snarl)\(/);
    }
  });

  it("every voice starts from silence and falls 80 dB before its cords stop", () => {
    const log = recordModuleSound(() => M.monsterAlert("A"), 4);
    const envelope = log.filter((e) => e.kind === "param" && e.detail.prop === "gain" && e.detail.method)
      .map((e) => e.detail).filter((d, _i, all) => all.some((x) => x.node === d.node && x.method === "exponentialRampToValueAtTime" && (x.value as number) <= 1e-4));
    expect(envelope.length).toBeGreaterThan(0);
    const node = envelope[0].node;
    const mine = envelope.filter((d) => d.node === node);
    expect(mine[0]).toMatchObject({ method: "setValueAtTime", value: 0 });
    const fallsAt = mine.at(-1)!.time as number;
    for (const o of cords(log)) {
      const stop = log.find((e) => e.kind === "stop" && e.detail.node === o)!.detail.args as number[];
      expect(stop[0]).toBeGreaterThanOrEqual(fallsAt);
    }
  });
});

describe("bosses are heavier", () => {
  it.each(BOSSES)("%s: a second voice an octave under the first, through the same throat", (k) => {
    const log = recordModuleSound(() => M.monsterAlert(k), 6);
    const c = cords(log);
    expect(c).toHaveLength(2);
    const [a, b] = c.map((o) => firstFrequency(log, o));
    expect(a / b).toBeCloseTo(2, 6);
    for (const o of c) expect(throughBandpass(log, o)).toBe(true);
  });

  it("no one else has one", () => {
    for (const k of KINDS.filter((k) => !ENEMY_DEFS[k].boss)) expect(cords(recordModuleSound(() => M.monsterAlert(k), 6)), k).toHaveLength(1);
  });

  it("a boss's voice sends more to the room than a monster's", () => {
    const sends = (k: string): number[] => {
      const { ctx } = recordingAudioContext();
      (globalThis as { AudioContext?: unknown }).AudioContext = function () { return ctx; };
      const routes: Route[] = [];
      audioInit({ drones: false, mix: (ac, v, r) => { const m = newMix(ac, v, r); return { ...m, route: (q) => { routes.push(q); return m.route(q); } }; } });
      M.monsterAlert(k);
      return routes.map((q) => q.send);
    };
    const boss = sends("E"), monster = sends("z");
    expect(boss).toHaveLength(1);
    expect(monster).toHaveLength(1);
    expect(boss[0]).toBeGreaterThan(2 * monster[0]);
  });
});

describe("every emission varies, from sound's own dice", () => {
  const pitches = (log: AudioEvent[]): number[][] =>
    cords(log).map((o) => log.filter((e) => e.kind === "param" && e.detail.node === o && e.detail.prop === "frequency").map((e) => e.detail.value as number));

  it("two alerts from the same zombie differ; the same seed gives the same two; and they are the same zombie", () => {
    const two = () => pitches(recordModuleSound(() => { M.monsterAlert("z"); M.monsterAlert("z"); }, 17));
    const [a, b] = two();
    const [a2, b2] = two();
    expect(a.length).toBeGreaterThan(10);
    expect(a).not.toEqual(b);
    expect(a2).toEqual(a);
    expect(b2).toEqual(b);
    // a different emission, not a different creature: the mean pitch within 15%
    const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
    expect(Math.abs(mean(b) / mean(a) - 1)).toBeLessThan(0.15);
    // and a different seed plays a different pair
    expect(pitches(recordModuleSound(() => { M.monsterAlert("z"); M.monsterAlert("z"); }, 18))[0]).not.toEqual(a);
  });

  it("the plan draws only from the generator it is given (so from sound's own, in the game)", () => {
    expect(voicePlan("C", "alert", mulberry32(9))).toEqual(voicePlan("C", "alert", mulberry32(9)));
    expect(voicePlan("C", "alert", mulberry32(9))).not.toEqual(voicePlan("C", "alert", mulberry32(10)));
  });
});

describe("every voice is positional", () => {
  it.each(CASES)("$sound($kind): under at(), the whole voice goes through panners at that place", ({ sound, play, placed }) => {
    // as the call sites do: inside at(), or — the roar, whose second half comes 200 ms later — placing each half
    const log = recordModuleSound(() => (sound === "bossRoar" ? placed(3, 1.5, -7) : at(3, 1.5, -7, play)), 8);
    const panners = created(log, "PannerNode");
    // one for the voice (and its layers); the orb's whoosh has its own; the roar's second half is placed again
    expect(panners).toHaveLength(sound === "orbLaunch" || sound === "bossRoar" ? 2 : 1);
    for (const p of panners) {
      const v = (prop: string) => log.filter((e) => e.kind === "param" && e.detail.node === p && e.detail.prop === prop).at(-1)?.detail.value;
      expect([v("positionX"), v("positionY"), v("positionZ")]).toEqual([3, 1.5, -7]);
    }
  });
});

describe("cheap enough to hear a room of them", () => {
  it("a voice is a modest graph: at most 22 nodes, 24 for a boss, before its panner", () => {
    const nodes = (k: string) => recordModuleSound(() => M.monsterAlert(k), 2).filter((e) => e.kind === "create" && e.detail.type !== "AudioBuffer").length;
    for (const k of KINDS) expect(nodes(k), k).toBeLessThanOrEqual(ENEMY_DEFS[k].boss ? 24 : 22);
  });

  it("the sawed-off's eight pellets hitting one monster make one pain cry, not eight; the next hit cries again", () => {
    const { ctx, events } = recordingAudioContext();
    (globalThis as { AudioContext?: unknown }).AudioContext = function () { return ctx; };
    audioInit({ drones: false });
    const base = events.length;
    for (let i = 0; i < 8; i++) M.monsterPain("z");
    expect(cords(events.slice(base))).toHaveLength(1);
    (ctx as { currentTime: number }).currentTime = 0.3;
    const next = events.length;
    M.monsterPain("z");
    M.monsterPain("f"); // another kind in the same instant is its own throat
    expect(cords(events.slice(next))).toHaveLength(2);
  });

  it("…but a blast that hurts three zombies at once makes three yelps: the game names the throat (the enemy)", () => {
    const { ctx, events } = recordingAudioContext();
    (globalThis as { AudioContext?: unknown }).AudioContext = function () { return ctx; };
    audioInit({ drones: false });
    const [a, b, c] = [{}, {}, {}];
    const base = events.length;
    for (const who of [a, b, c, a, b, c, a]) M.monsterPain("z", who); // pellets of one blast: each zombie hit more than once
    expect(cords(events.slice(base))).toHaveLength(3);
    // and the damage call site passes the enemy itself
    const damage = readFileSync(join(__dirname, "..", "..", "src", "enemies", "Damage.ts"), "utf8");
    expect(damage).toMatch(/monsterPain\(e\.key,e\)/);
  });

  it("two Mancubi firing in the same instant both bark; one Mancubus's twin orbs bark once", () => {
    const [a, b] = [{}, {}];
    const two = recordModuleSound(() => { M.orbLaunch("heavy", "A", a); M.orbLaunch("heavy", "A", b); }, 1);
    expect(cords(two)).toHaveLength(2);
    const twin = recordModuleSound(() => { M.orbLaunch("heavy", "A", a); M.orbLaunch("heavy", "A", a); }, 1);
    expect(cords(twin)).toHaveLength(1);
    const attacks = readFileSync(join(__dirname, "..", "..", "src", "enemies", "ai", "Attacks.ts"), "utf8");
    expect(attacks).toMatch(/orbLaunch\([^;]*,e\.key,e\)\)/);
  });

  it("a priest's five-orb volley whooshes five times and barks once", () => {
    const log = recordModuleSound(() => { for (let i = 0; i < 5; i++) M.orbLaunch("normal", "Q"); }, 1);
    expect(created(log, "AudioBufferSourceNode").length).toBeGreaterThanOrEqual(5);
    expect(cords(log)).toHaveLength(2); // one boss voice: its cords and its sub-octave
  });
});

describe("the table is data", () => {
  it("every family and event is used, and every voice resolves", () => {
    const used = new Set(Object.values(VOICES).map((v) => v.family));
    expect([...used].sort()).toEqual(Object.keys(FAMILIES).sort());
    for (const k of KINDS) expect(voiceOf(k).f0).toBe(VOICES[k].f0);
    expect(voiceOf("no such kind").f0).toBe(VOICES.z.f0);
  });
});
