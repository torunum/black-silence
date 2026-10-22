import { describe, expect, it } from "vitest";
import { bankOf, hasSample, playSample, sampleBanks } from "../../src/audio/Samples";
import { banksFor, sampleRate, sampleVoice } from "../../src/audio/SampleVoice";
import { FAMILIES, VOICES, type Family } from "../../src/audio/VoiceTable";

describe("recorded sounds (owner 2026-10-20: realistic, scary sounds)", () => {
  it("names banks from file names", () => {
    expect(bankOf("../../assets/sfx/moan.alert.2.mp3")).toBe("moan.alert");
    expect(bankOf("../../assets/sfx/gun.rifle.mp3")).toBe("gun.rifle");
  });

  it("ships a clip for every gun and the core events of every family", () => {
    const b = sampleBanks();
    for (const g of ["pistol", "shotgun", "rifle", "smg", "sniper", "nail"]) expect(b[`gun.${g}`]).toBe(1);
    for (const fam of Object.keys(FAMILIES) as Family[]) {
      const core = fam === "titan" ? ["roar", "pain", "death"] : ["alert", "pain", "attack", "death"];
      for (const ev of core) expect(banksFor(fam, ev as never).some((k) => (b[k] ?? 0) > 0), `${fam}.${ev}`).toBe(true);
    }
    expect(b["amb.bed"]).toBe(1);
  });

  it("falls back to synthesis when nothing is decoded (the tests' case)", () => {
    expect(hasSample("gun.rifle")).toBe(false);
    expect(playSample("gun.rifle")).toBe(false);
    expect(sampleVoice("z", "alert")).toBe(false);
  });

  it("pitches each kind within a fifth of its family's recordings, smaller creatures higher", () => {
    for (const k of Object.keys(VOICES)) {
      const r = sampleRate(k);
      expect(r).toBeGreaterThanOrEqual(0.76);
      expect(r).toBeLessThanOrEqual(1.32);
    }
    expect(sampleRate("g")).toBeLessThan(sampleRate("L"));   // the dog under the burning skull
    expect(sampleRate("G")).toBeLessThan(sampleRate("N"));   // the Living Heart under the Gravedigger
  });
});
