import { beforeEach, describe, expect, it, vi } from "vitest";
import { bedTick, bedState, ROAR_EVERY, type BedSounds } from "../../src/world/ZoneBed";
import { ZONES } from "../../src/world/levels/prologue";

/**
 * A ZONE'S ROOM TONE (`src/world/ZoneBed.ts`, the prologue plan's Task 3):
 * hell roars, screams and crackles; the churchyard has its wind; nowhere
 * else has a bed, and there the level's stingers play as they always did.
 */

let played: string[];
const rec: BedSounds = {
  hellRoar: () => played.push("roar"), hellScream: () => played.push("scream"),
  fireCrackle: () => played.push("crackle"), churchyardWind: () => played.push("wind"),
};
const run = (bed: "hell" | "yard" | null, seconds: number): boolean => {
  let playing = false;
  for (let t = 0; t < seconds; t += 1 / 60) playing = bedTick(1 / 60, bed, rec);
  return playing;
};
const count = (k: string) => played.filter((p) => p === k).length;

beforeEach(() => { played = []; bedTick(0, null, rec); });

describe("hell", () => {
  it("roars without a gap — a swell on entering and every 3.6 s — and screams and crackles now and then", () => {
    expect(run("hell", 60)).toBe(true);
    expect(played[0]).toBe("roar");
    expect(count("roar")).toBe(Math.floor(60 / ROAR_EVERY) + 1);
    expect(ROAR_EVERY).toBeLessThan(5.6);   // a swell lasts 5.6 s (hellRoarDesign): they overlap
    expect(count("scream")).toBeGreaterThanOrEqual(4);
    expect(count("scream")).toBeLessThanOrEqual(10);
    expect(count("crackle")).toBeGreaterThanOrEqual(25);
    expect(count("wind")).toBe(0);
  });

  it("stops on the frame the player walks out, and starts from the roar on walking back in", () => {
    run("hell", 10);
    played = [];
    expect(run(null, 20)).toBe(false);
    expect(played).toEqual([]);
    run("hell", 1 / 60);
    expect(played[0]).toBe("roar");
  });
});

describe("the churchyard", () => {
  it("has its wind, a gust every 4.5-8 s, and nothing of hell's", () => {
    run("yard", 60);
    expect(count("wind")).toBeGreaterThanOrEqual(7);
    expect(count("wind")).toBeLessThanOrEqual(14);
    expect(count("roar") + count("scream") + count("crackle")).toBe(0);
  });
});

describe("the beds are hell's and the churchyard's alone", () => {
  it("only those two zones name one", () => {
    expect(Object.fromEntries(ZONES.map((z) => [z.id, z.bed ?? null]))).toEqual({ churchyard: "yard", crypt: null, hell: "hell", climb: null });
  });

  it("draws nothing from Math.random", () => {
    const spy = vi.spyOn(Math, "random");
    try { run("hell", 30); run("yard", 30); expect(spy).not.toHaveBeenCalled(); } finally { spy.mockRestore(); }
    expect(bedState.bed).toBe("yard");
  });
});
