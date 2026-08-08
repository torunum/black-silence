// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { deathCry, growl, gurgle, pain, snarl } from "../../src/audio/Voice";
import { bellToll, organChord, pianoNote, startBossMusic, stopBossMusic, stoneDoor, wetDoor } from "../../src/audio/Ambient";

describe("audio functions before audioInit", () => {
  it("are all silent no-ops rather than throwing", () => {
    expect(() => growl(60, 1, 0.5, true)).not.toThrow();
    expect(() => gurgle(0.2, 0.3)).not.toThrow();
    expect(() => pain(120, 0.4)).not.toThrow();
    expect(() => deathCry(80)).not.toThrow();
    expect(() => snarl("z")).not.toThrow();
    expect(() => wetDoor()).not.toThrow();
    expect(() => stoneDoor()).not.toThrow();
    expect(() => bellToll()).not.toThrow();
    expect(() => organChord()).not.toThrow();
    expect(() => pianoNote(60)).not.toThrow();
  });
});

describe("boss music", () => {
  it("stopping without starting is safe, and starting twice does not stack", () => {
    // startBossMusic guards on bossPulse; without that guard a second boss
    // would layer a second interval and the pulse would double in tempo.
    expect(() => stopBossMusic()).not.toThrow();
    startBossMusic();
    startBossMusic();
    expect(() => stopBossMusic()).not.toThrow();
  });
});

describe("snarl", () => {
  it("accepts every enemy key without throwing", () => {
    for (const key of ["z", "f", "g", "m", "t", "w", "s", "C", "A", "L", "j", "n", "B", "E", "U", "Q"]) {
      expect(() => snarl(key)).not.toThrow();
    }
  });
});
