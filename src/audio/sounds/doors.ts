import { lv } from "../Levels";
import { jit, play, type Layer } from "../Layers";
import { clack, thud } from "../Material";
import { soundRandom } from "../SoundRandom";
import { wetDoor } from "../Ambient";
import { DOOR_SINK_SECONDS } from "../../world/Grid";

/**
 * THE SOUND CATALOGUE — DOORS AND THE EXIT. Player feedback round 2 Task 5
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`): "doors
 * (stone grinding as a door sinks)".
 *
 * A door in this game does not swing: it sinks into the floor, taking
 * `DOOR_SINK_SECONDS` (`src/world/Grid.ts`, about 1.27 s) to go. The old
 * stone door was a 0.9 s grind that ended before the door did. Now the
 * grind lasts exactly as long as the door moves — a deep **rumble** and a
 * **scrape** stuttering as stone sticks and slips on stone, **grit**
 * trickling, a **sub** under it — and the door **settles** with a thud and
 * a breath of dust on the frame it comes to rest.
 *
 * - A **secret** door is a piece of the wall: it breaks free with a crack,
 *   grinds lower and heavier, and lands harder.
 * - The **red-key gate** unbolts with an iron clank, then sinks like stone.
 * - A **locked** door the player has no key for rattles in its frame, and a
 *   low muted tone says no.
 * - The **flesh** doors of the womb keep their wet tearing (`wetDoor`,
 *   `../Ambient.ts`), which was never the problem.
 * - **The exit** opening is a longer, deeper grind with a low chord
 *   swelling up under it: the way out.
 */

export type DoorKind = "stone" | "secret" | "gate" | "flesh";

/** The grind of stone sinking on stone for `dur` s; `heavy` 1 for a door, more for a piece of the wall. */
export function grind(dur: number, heavy: number, p: number): Layer[] {
  const h = (d: number): number => Math.max(0, dur - d);
  return [
    // the rumble: the weight of it moving
    { noise: "brown", filters: [{ type: "lowpass", f: 240 * p / heavy, q: 0.8 }], env: { a: 0.08, h: h(0.2), d: 0.12 }, am: { rate: 9 * p, depth: 0.3, to: 5.5, over: dur }, drive: 1.3, level: 0.9 * heavy },
    // the scrape: stone sticking and slipping on stone, the pitch sinking with the door
    { noise: "pink", filters: [{ type: "bandpass", f: 430 * p / heavy, q: 1.6, to: 250 * p / heavy, over: dur }], env: { a: 0.06, h: h(0.18), d: 0.12 }, am: { rate: 13 * p, depth: 0.4, to: 7.5, over: dur }, level: 0.55 },
    // grit trickling out of the joint
    { noise: "white", filters: [{ type: "highpass", f: 2500 }, { type: "bandpass", f: 3600 * p, q: 0.8 }], env: { a: 0.1, h: h(0.25), d: 0.15 }, am: { rate: 23, depth: 0.5, type: "square" }, level: 0.08 },
    // and the ground feeling it
    { tone: "sine", f: 42 / heavy, to: 33 / heavy, over: dur, env: { a: 0.1, h: h(0.22), d: 0.12 }, drive: 1.2, level: 0.35 * heavy },
  ];
}

/** The door coming to rest at `at` s: a heavy thud, a knock of stone, dust settling. */
export function settle(at: number, heavy: number, p: number): Layer[] {
  return [
    { at, tone: "sine", f: 75 * p / heavy, to: 36 / heavy, over: 0.12, env: { a: 0.002, h: 0.02, d: 0.3 * heavy }, drive: 2, level: 1 * heavy },
    { at, noise: "white", filters: [{ type: "lowpass", f: 700 * p }], env: { a: 0.001, h: 0.01, d: 0.1 }, drive: 1.8, level: 0.5 },
    { at: at + 0.02, noise: "pink", filters: [{ type: "lowpass", f: 1000 }], env: { a: 0.03, h: 0.05, d: 0.35 }, level: 0.2 },
  ];
}

/** A sinking door's whole sound, by kind — exported so tests can read it without playing it. */
export function doorDesign(kind: Exclude<DoorKind, "flesh">, p = 1): Layer[] {
  const dur = DOOR_SINK_SECONDS;
  if (kind === "secret") {
    return [
      // breaking free of the wall
      { noise: "white", filters: [{ type: "bandpass", f: 600 * p, q: 1 }], env: { a: 0.001, h: 0.01, d: 0.08 }, drive: 3, level: 0.8 },
      { tone: "sine", f: 62 * p, to: 30, over: 0.12, env: { a: 0.002, h: 0.02, d: 0.22 }, drive: 1.6, level: 0.7 },
      ...grind(dur, 1.4, p),
      ...settle(dur, 1.4, p),
    ];
  }
  const bolt: Layer[] = kind === "gate" ? [...clack(0, [900 * p, 1420 * p, 2300 * p], 0.25, 0.6), thud(0, 160 * p, 0.08, 0.5)] : [];
  return [...bolt, ...grind(dur, 1, p), ...settle(dur, 1, p)];
}

/** A door opens (`interact`): a stone door, a secret piece of wall, the red-key gate, or flesh. */
export function doorOpens(kind: DoorKind): void {
  if (kind === "flesh") { lv("doorFlesh", () => { wetDoor(); }); return; }
  const k = kind === "secret" || kind === "gate" ? kind : "stone";
  const p = jit(0.05);
  lv(k === "secret" ? "doorSecret" : k === "gate" ? "doorGate" : "doorStone", () => { play(doorDesign(k, p)); });
}

/** A locked door the player has no key for (`interact`): shaken in its frame — three iron knocks — and a low muted tone that says no. */
export function lockedDoor(): void {
  const p = jit(0.05);
  const knocks = [0, 0.07 + soundRandom() * 0.02, 0.16 + soundRandom() * 0.02];
  lv("lockedDoor", () => {
    play([
      ...knocks.flatMap((t, i): Layer[] => [...clack(t, [700 * p, 1150 * p, 1900 * p], 0.09, 0.5 - i * 0.1), thud(t, 140 * p, 0.04, 0.3)]),
      // the "no": two low tones a semitone apart, beating, muffled
      { at: 0.22, tone: "triangle", f: [110, 116.5], filters: [{ type: "lowpass", f: 600 }], env: { a: 0.02, h: 0.08, d: 0.35 }, level: 0.35 },
    ]);
  });
}

/** The level's exit opens once its boss is dead (`openExit`): a long deep grind, and a low chord swelling under it. */
export function exitOpens(): void {
  const p = jit(0.03);
  lv("exitOpens", () => {
    play([
      ...grind(1.6, 1.3, p),
      ...settle(1.6, 1.2, p),
      { at: 0.2, tone: "sine", f: [65.4, 98, 130.8], filters: [{ type: "lowpass", f: 900 }], env: { a: 0.6, h: 0.4, d: 1.3 }, level: 0.3 },
    ]);
  });
}
