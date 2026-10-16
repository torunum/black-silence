import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const played = vi.hoisted(() => ({ log: [] as string[] }));
vi.mock("../../src/audio/sounds/hits", () => ({
  hitFlesh: () => { played.log.push("flesh"); },
  hitHead: () => { played.log.push("head"); },
  hitArmour: () => { played.log.push("armour"); },
  hitKill: () => { played.log.push("kill"); },
}));

import { screenShake } from "../../src/fx/ShakeState";
import { punch, resetPunch } from "../../src/fx/ViewPunch";
import { feelTick, lastFelt, registerHit, resetHitFeel, type HitEvent } from "../../src/fx/HitFeel";

/**
 * NO HIT MARKER (owner, 2026-10-17: "the X mark that appears when hitting
 * someone is very bad ... we are not playing Modern Warfare"). The four
 * corner ticks that used to flick around the crosshair are gone, with their
 * module, their state and their wiring. This file pins both halves of that:
 *
 * - **nothing marks a hit**: the module is gone from disk, nothing in `src/`
 *   names it or its API, and a blow of every kind leaves the 2D overlay
 *   exactly as an idle frame (tests/behavior/noHitMarkerOverlay.test.ts);
 * - **the rest of the hit feel still fires**: the same blows still freeze
 *   the game (hit-stop), punch the view and play their sound.
 */

const FRAME = 1 / 60;
beforeEach(() => { resetHitFeel(); resetPunch(); screenShake.hitStop = 0; played.log.length = 0; });

function sources(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(ts|html)$/.test(n)) out.push(p);
  }
  return out;
}

describe("the marker is gone", () => {
  it("its module is not on disk", () => {
    expect(existsSync(join(__dirname, "../../src/fx/HitMarker.ts"))).toBe(false);
  });

  it("nothing in src/ names it, its state or its drawing", () => {
    const offenders = sources(join(__dirname, "../../src")).filter((f) =>
      /HitMarker|drawHitMarker|showMarker|resetMarker|MarkerKind/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});

describe("the rest of the hit feel still fires", () => {
  const blows: Array<[string, HitEvent, string]> = [
    ["a plain hit", { wIdx: 0, side: 0 }, "flesh"],
    ["a headshot", { wIdx: 0, head: true, side: 0 }, "head"],
    ["a kill", { wIdx: 0, kill: true, side: 0 }, "kill"],
    ["a head-kill", { wIdx: 0, kill: true, head: true, side: 0 }, "kill"],
    ["a gib", { wIdx: 0, kill: true, gib: true, side: 0 }, "kill"],
    ["a shot into armour", { wIdx: 0, plate: true, side: 0 }, "armour"],
  ];

  it.each(blows)("%s: speaks, and punches the view; a hit-stop unless it is armour", (_n, ev, sound) => {
    registerHit(ev);
    feelTick(FRAME);
    expect(played.log).toEqual([sound]);
    expect(Math.abs(punch.lunge)).toBeGreaterThan(0);
    if (ev.plate) expect(screenShake.hitStop).toBe(0); else expect(screenShake.hitStop).toBeGreaterThan(0);
  });

  it("the strongest blow of the frame still picks the sound", () => {
    registerHit({ wIdx: 0, side: 0 }); registerHit({ wIdx: 0, head: true, side: 0 }); registerHit({ wIdx: 0, kill: true, gib: true, side: 0 });
    feelTick(FRAME);
    expect(lastFelt.kind).toBe("gib");
    expect(played.log).toEqual(["kill"]);
  });
});
