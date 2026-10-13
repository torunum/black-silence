import { beforeEach, describe, expect, it, vi } from "vitest";

const played = vi.hoisted(() => ({ log: [] as string[] }));
vi.mock("../../src/audio/sounds/hits", () => ({
  hitFlesh: () => { played.log.push("flesh"); },
  hitHead: () => { played.log.push("head"); },
  hitArmour: () => { played.log.push("armour"); },
  hitKill: () => { played.log.push("kill"); },
}));

import { screenShake } from "../../src/fx/ShakeState";
import { marker } from "../../src/fx/HitMarker";
import { punch } from "../../src/fx/ViewPunch";
import {
  EXPLOSIVE, FEEL, SOUND_GAP, STOP_GAP, STOP_MAX, feelRow, feelTick, registerHit, resetHitFeel, sideOf,
} from "../../src/fx/HitFeel";
import { resetMarker } from "../../src/fx/HitMarker";
import { resetPunch } from "../../src/fx/ViewPunch";

/**
 * THE HIT FEEL (docs/superpowers/plans/2026-10-08-impact.md, Task 1): what a
 * blow that lands gives back — a hit-stop scaled by the weapon and by kill
 * against hit, folded into one thump per volley; a marker; a punch; a
 * confirming sound, spaced so a stream is a stream.
 */

const FRAME = 1 / 60;
beforeEach(() => { resetHitFeel(); resetMarker(); resetPunch(); screenShake.hitStop = 0; played.log.length = 0; });

/** One blow of `ev` kind, felt at the end of the frame, and the hit-stop it asked for. */
function felt(ev: Parameters<typeof registerHit>[0]): number {
  screenShake.hitStop = 0;
  registerHit(ev);
  feelTick(FRAME);
  return screenShake.hitStop;
}

describe("hit-stop is scaled by the weapon, and by a kill against a hit", () => {
  it("a shotgun hit freezes the game longer than a pistol hit, a sniper hit longer than both, and a rifle, a tommy gun and a nail cannon hit not at all", () => {
    const stop = (wIdx: number): number => { resetHitFeel(); return felt({ wIdx, side: 0 }); };
    expect(stop(2)).toBe(0);
    expect(stop(3)).toBe(0);
    expect(stop(6)).toBe(0);
    expect(stop(0)).toBeGreaterThan(0);
    expect(stop(1)).toBeGreaterThan(stop(0));
    expect(stop(4)).toBeGreaterThan(stop(1));
  });

  it("a kill freezes it longer than a hit from the same weapon, for every weapon — the streams included", () => {
    for (const w of [0, 1, 2, 3, 4, 6, 7, -1, -2, EXPLOSIVE]) {
      expect(FEEL[w].kill, `weapon ${w}`).toBeGreaterThan(FEEL[w].hit);
      resetHitFeel();
      const hit = felt({ wIdx: w === EXPLOSIVE ? undefined : w, explosive: w === EXPLOSIVE, side: 0 });
      resetHitFeel();
      const kill = felt({ wIdx: w === EXPLOSIVE ? undefined : w, explosive: w === EXPLOSIVE, kill: true, side: 0 });
      expect(kill, `weapon ${w}`).toBeGreaterThan(hit);
    }
  });

  it("a gib freezes it longer than a plain kill", () => {
    const kill = felt({ wIdx: 1, kill: true, side: 0 });
    resetHitFeel();
    const gib = felt({ wIdx: 1, kill: true, gib: true, side: 0 });
    expect(gib).toBeGreaterThan(kill);
  });

  it("no stop is ever longer than STOP_MAX, however many hits a frame brings", () => {
    for (let i = 0; i < 40; i++) registerHit({ wIdx: 4, kill: true, gib: true, side: 0 });
    screenShake.hitStop = 0;
    feelTick(FRAME);
    expect(screenShake.hitStop).toBeLessThanOrEqual(STOP_MAX);
    expect(screenShake.hitStop).toBeGreaterThan(0);
  });

  it("eight pellets in one volley are one thump, not eight stops: longer than one hit, never past half again", () => {
    const one = felt({ wIdx: 1, side: 0 });
    resetHitFeel();
    for (let i = 0; i < 8; i++) registerHit({ wIdx: 1, side: 0 });
    screenShake.hitStop = 0;
    feelTick(FRAME);
    expect(screenShake.hitStop).toBeGreaterThan(one);
    expect(screenShake.hitStop).toBeLessThanOrEqual(one * 1.5 + 1e-9);
  });

  it("never shortens a stop already running", () => {
    screenShake.hitStop = 0.12;
    registerHit({ wIdx: 0, side: 0 });
    feelTick(FRAME);
    expect(screenShake.hitStop).toBe(0.12);
  });

  it("a hit that does not kill cannot freeze the game again inside STOP_GAP, but a kill always can", () => {
    expect(felt({ wIdx: 0, side: 0 })).toBeGreaterThan(0);
    feelTick(STOP_GAP / 2);
    expect(felt({ wIdx: 0, side: 0 }), "a second hit, too soon").toBe(0);
    expect(felt({ wIdx: 0, kill: true, side: 0 }), "a kill, as soon").toBeGreaterThan(0);
    feelTick(STOP_GAP + 0.01);
    expect(felt({ wIdx: 0, side: 0 }), "a hit, after the gap").toBeGreaterThan(0);
  });

  it("armour is never a stop", () => {
    expect(felt({ wIdx: 1, plate: true, side: 0 })).toBe(0);
  });

  it("a frame with no blow touches nothing", () => {
    screenShake.hitStop = 0;
    feelTick(FRAME);
    expect(screenShake.hitStop).toBe(0);
    expect(marker.left).toBe(0);
    expect(punch).toEqual({ lunge: 0, pitch: 0, roll: 0 });
    expect(played.log).toEqual([]);
  });
});

describe("the marker, the punch and the sound follow the strongest blow of the frame", () => {
  it("a kill beats a headshot beats a hit beats armour", () => {
    registerHit({ wIdx: 0, plate: true, side: 0 }); feelTick(FRAME);
    expect(marker.kind).toBe("armour");
    resetMarker(); registerHit({ wIdx: 0, plate: true, side: 0 }); registerHit({ wIdx: 0, side: 0 }); feelTick(FRAME);
    expect(marker.kind).toBe("flesh");
    resetMarker(); registerHit({ wIdx: 0, side: 0 }); registerHit({ wIdx: 0, head: true, side: 0 }); feelTick(FRAME);
    expect(marker.kind).toBe("head");
    resetMarker(); registerHit({ wIdx: 0, head: true, side: 0 }); registerHit({ wIdx: 0, kill: true, side: 0 }); feelTick(FRAME);
    expect(marker.kind).toBe("kill");
    resetMarker(); registerHit({ wIdx: 0, kill: true, head: true, side: 0 }); feelTick(FRAME);
    expect(marker.kind).toBe("headkill");
    resetMarker(); registerHit({ wIdx: 0, kill: true, gib: true, side: 0 }); feelTick(FRAME);
    expect(marker.kind).toBe("gib");
  });

  it("a hit lights the marker and punches the view; a stream's hit punches far less than a shotgun's", () => {
    felt({ wIdx: 1, side: 1 });
    expect(marker.left).toBeGreaterThan(0);
    const shotgun = Math.abs(punch.lunge);
    expect(shotgun).toBeGreaterThan(0);
    resetPunch(); resetHitFeel();
    felt({ wIdx: 6, side: 1 });
    expect(Math.abs(punch.lunge)).toBeLessThan(shotgun / 4);
  });

  it("the sound is the kind of blow: flesh, head, armour or kill", () => {
    for (const [ev, want] of [
      [{ wIdx: 0, side: 0 }, "flesh"], [{ wIdx: 0, head: true, side: 0 }, "head"], [{ wIdx: 0, plate: true, side: 0 }, "armour"],
      [{ wIdx: 0, kill: true, side: 0 }, "kill"], [{ wIdx: 1, kill: true, gib: true, side: 0 }, "kill"], [{ wIdx: 0, kill: true, head: true, side: 0 }, "kill"],
    ] as const) {
      resetHitFeel(); played.log.length = 0;
      registerHit(ev); feelTick(FRAME);
      expect(played.log, JSON.stringify(ev)).toEqual([want]);
    }
  });

  it("a volley is one sound, and a stream's ticks are spaced SOUND_GAP apart", () => {
    for (let i = 0; i < 8; i++) registerHit({ wIdx: 1, side: 0 });
    feelTick(FRAME);
    expect(played.log).toEqual(["flesh"]);
    played.log.length = 0;
    // a nail cannon: a hit every 50 ms for a second
    for (let i = 0; i < 20; i++) { registerHit({ wIdx: 6, side: 0 }); feelTick(0.05); }
    expect(played.log.length).toBeGreaterThan(5);
    expect(played.log.length).toBeLessThan(15);
    expect(SOUND_GAP).toBeGreaterThanOrEqual(0.05);
  });
});

describe("the table", () => {
  it("every weapon, the kick, a body into a wall and a blast has a row, and the blast row is the one `explosive` selects", () => {
    for (const w of [0, 1, 2, 3, 4, 6, 7, -1, -2, EXPLOSIVE]) expect(FEEL[w], `row ${w}`).toBeDefined();
    expect(feelRow(0, true)).toBe(FEEL[EXPLOSIVE]);
    expect(feelRow(1)).toBe(FEEL[1]);
    expect(feelRow(undefined)).toBe(FEEL[0]);
    expect(feelRow(5)).toBe(FEEL[0]);   // the cross launcher's own blow is a blast, reported as one; an unknown slot is the pistol's
  });

  it("the shotgun and the BMG are the heaviest, the nail cannon a stream", () => {
    expect(FEEL[1].punch).toBeGreaterThan(FEEL[0].punch);
    expect(FEEL[4].hit).toBeGreaterThan(FEEL[0].hit);
    expect(FEEL[6].hit).toBe(0);
    expect(FEEL[6].punch).toBeLessThan(0.1);
    expect(FEEL[4].flash).toBeGreaterThan(FEEL[6].flash * 3);
  });

  it("sideOf says which side of the view a place is on", () => {
    // facing +x: yaw = -pi/2 puts the camera's right on +z (Hitscan.ts's right vector (cos yaw, -sin yaw) = (0, 1))
    expect(sideOf(0, 0, 5, 3, -Math.PI / 2)).toBeGreaterThan(0.4);
    expect(sideOf(0, 0, 5, -3, -Math.PI / 2)).toBeLessThan(-0.4);
    expect(sideOf(0, 0, 5, 0, -Math.PI / 2)).toBeCloseTo(0, 6);
    expect(sideOf(1, 1, 1, 1, 0)).toBe(0);
  });
});
