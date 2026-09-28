// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { clearAllTimers } from "../../src/core/Timers";
import { clearScheduled } from "../../src/core/Time";
import { S } from "../../src/core/State";
import { input } from "../../src/player/Input";
import { weaponRuntime } from "../../src/weapons/WeaponRuntime";
import { WEAPON_STATS } from "../../src/weapons/definitions";

/**
 * THE MECHANISMS ARE HEARD WHEN THEY ARE SEEN — player feedback round 2
 * Task 3 (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`):
 * "time foley to the reload animation's phases … without changing any
 * reload timing", and "a cancelled reload cancels pending foley".
 *
 * This boots the real game (main.ts under jsdom, NEW GAME, the way
 * `tests/integration/animCues.test.ts` does) and drives the real
 * `weaponTick`, with every sound in `src/audio/sounds/foley.ts` replaced by a
 * recorder. What has to be true:
 *
 * 1. Each reload plays its mechanism sounds, once each, at the moments the
 *    viewmodel shows them. `EXPECTED` below is written from the art, not
 *    from `src/weapons/Foley.ts`'s table: "the flare's barrel is fully open
 *    at 18%" is `hump(r, 0.08, 0.88, 0.1)` reaching 1 at .08+.1. And the art
 *    must still draw with the shared constants (`phases.ts`), or the two
 *    could drift apart.
 * 2. The reload takes exactly as long as it did, and ends the way it did.
 * 3. A reload cut short — by a switch, or by firing with rounds left —
 *    plays none of its remaining cues, ever.
 * 4. The mechanisms after a shot (the sniper's bolt, the flare's hammer)
 *    and the end of a raise are heard too; the nail cannon's motor is driven
 *    while it fires and let go after.
 */

const heard: Array<{ name: string; tick: number; args: unknown[] }> = [];
let tick = 0;

vi.mock("../../src/audio/sounds/foley", async (importOriginal) => {
  const real = await importOriginal<Record<string, unknown>>();
  const out: Record<string, unknown> = {};
  for (const [name, v] of Object.entries(real)) {
    out[name] = typeof v === "function" ? (...args: unknown[]) => { heard.push({ name, tick, args }); } : v;
  }
  return out;
});

type WS = typeof import("../../src/weapons/WeaponState");
let WS: WS;
const rafQueue: FrameRequestCallback[] = [];

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => { rafQueue.push(cb); return rafQueue.length; };
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};
  await import("../../src/main");
  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();
  // The prologue opens in its grave, input locked (src/world/Opening.ts): skip it, as any key would.
  (await import("../../src/world/Opening")).skipOpening();
  WS = await import("../../src/weapons/WeaponState");
});

afterAll(() => {
  clearAllTimers();
  clearScheduled();
});

const DT = 1 / 120;

/** Holds `slot` idle, magazine empty, plenty in reserve. */
function hold(slot: number, mag = 0): void {
  S.weapons[slot] = true;
  S.cur = slot;
  S.mag[slot] = mag;
  (S.ammo as Record<string, number>)[WEAPON_STATS[slot].ammo] = 500;
  S.dead = false;
  input.firing = false;
  weaponRuntime.wstate = "idle"; weaponRuntime.wtime = 0; weaponRuntime.wCool = 0; weaponRuntime.pending = -1;
}
/** Ticks the weapon; with fake timers on, wall-clock time passes too, so anything scheduled on a timer would come due. */
function run(ticks: number, each?: (n: number) => void): void {
  for (let i = 0; i < ticks; i++) {
    tick++; each?.(i); WS.weaponTick(DT);
    if (vi.isFakeTimers()) vi.advanceTimersByTime(DT * 1000);
  }
}
const mechanism = (h: { name: string }): boolean => h.name !== "nailCannonSpin";

beforeEach(() => { heard.length = 0; tick = 0; });

/** Where the art puts each movement, as a fraction of the reload — read off each weapon's draw function. */
const EXPECTED: Array<Array<[string, number]>> = [
  [["flareOpen", 0.18], ["flareShellIn", 0.6], ["flareShut", 0.88]],
  [["shotgunHullsOut", 0.14], ["shotgunOpen", 0.18], ["shotgunShellsIn", 0.6], ["shotgunShut", 0.86]],
  [["rifleMagOut", 0.1], ["rifleMagIn", 0.6], ["rifleChargeBack", 0.83], ["rifleChargeForward", 0.96]],
  [["tommyDrumOut", 0.08], ["tommyDrumIn", 0.6], ["tommyKnobBack", 0.84], ["tommyKnobForward", 0.97]],
  [["sniperBoltLift", 0.14], ["sniperBoltBack", 0.2], ["sniperMagOut", 0.26], ["sniperMagIn", 0.64], ["sniperBoltForward", 0.9], ["sniperBoltLock", 0.95]],
  [["crossLidOpen", 0.1], ["crossLaidIn", 0.62], ["crossLidShut", 0.86]],
  [["nailHopperOff", 0.12], ["nailHopperOn", 0.66]],
  [["reaperGutter", 0.02], ["reaperPluck", 0.16], ["reaperCharge", 0.4], ["reaperClawsClose", 0.72]],
];

describe("each reload is heard as it is drawn", () => {
  it.each(EXPECTED.map((cues, slot) => ({ slot, name: WEAPON_STATS[slot].name, cues })))("$name", ({ slot, cues }) => {
    hold(slot);
    WS.startReload();
    const reload = WEAPON_STATS[slot].reload;
    let doneAt = -1;
    run(Math.ceil((reload + 0.5) / DT), () => { if (doneAt < 0 && weaponRuntime.wstate === "idle") doneAt = tick - 1; });
    const got = heard.filter(mechanism);
    expect(got.map((h) => h.name)).toEqual(cues.map(([n]) => n));
    got.forEach((h, i) => {
      // played on the first tick whose phase reaches the art's moment
      const at = cues[i][1];
      const phase = (h.tick * DT) / reload;
      // (wtime is a running float sum, so "the tick that reaches it" is allowed a hair's rounding either way)
      expect(phase, h.name).toBeGreaterThanOrEqual(at - 1e-6);
      expect(phase - DT / reload, h.name).toBeLessThan(at + 1e-6);
    });
    // the reload itself is untouched: it ends on the tick its time runs out, magazine full
    expect(Math.abs(doneAt - reload / DT)).toBeLessThanOrEqual(1);
    expect(S.mag[slot]).toBe(WEAPON_STATS[slot].magSize);
  });

  it("the art draws those movements from the constants the cues are built from (src/render/viewmodel/phases.ts)", () => {
    const dir = join(__dirname, "..", "..", "src", "render", "viewmodel", "weapons");
    const uses: Array<[string, string[]]> = [
      ["flare.ts", ["hump(r, ...FLARE.open)", "ramp(r, ...FLARE.push)", "ramp(p, ...FLARE.cock)"]],
      ["shotgun.ts", ["hump(r, ...SAWED_OFF.open)", "ramp(r, ...SAWED_OFF.load)", "SAWED_OFF.hulls[0]", "hump(p, ...SAWED_OFF.pump)"]],
      ["rifle.ts", ["ramp(r, ...RIFLE.drop)", "ramp(r, ...RIFLE.seat)", "hump(r, ...RIFLE.charge)"]],
      ["tommy.ts", ["ramp(r, ...TOMMY.out)", "ramp(r, ...TOMMY.seat)", "hump(r, ...TOMMY.knob)"]],
      ["sniper.ts", ["hump(a, ...SNIPER.lift)", "hump(a, ...SNIPER.back)", "hump(r, ...SNIPER.reloadLift)", "hump(r, ...SNIPER.reloadBack)", "hump(r, ...SNIPER.mag)"]],
      ["cross.ts", ["hump(r, ...CROSS.lid)", "ramp(r, ...CROSS.loaded)", "ramp(a, ...CROSS.rise)"]],
      ["nailgun.ts", ["hump(r, ...NAIL.lift)"]],
      ["reaper.ts", ["ramp(r, ...REAPER.dying)", "ramp(r, ...REAPER.pluck)", "ramp(r, ...REAPER.press)", "hump(r, ...REAPER.claws)", "hump(a, ...REAPER.spent)"]],
    ];
    for (const [file, needles] of uses) {
      const src = readFileSync(join(dir, file), "utf8");
      for (const n of needles) expect(src, `${file} draws with ${n}`).toContain(n);
    }
  });
});

describe("a reload cut short plays none of what is left of it", () => {
  // Wall-clock time runs with the ticks here, so foley scheduled on a timer
  // at the reload's start — the obvious way to build this, and the one that
  // would need cancelling — would be heard, and fail these.
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("switching weapons mid-reload: the rest of the reload is never heard; the switch is", () => {
    hold(0, 3);
    hold(1);
    WS.startReload();
    const reload = WEAPON_STATS[1].reload;
    run(Math.ceil((0.3 * reload) / DT));
    expect(heard.filter(mechanism).map((h) => h.name)).toEqual(["shotgunHullsOut", "shotgunOpen"]);
    WS.requestSwitch(0);
    run(Math.ceil((reload + 1) / DT));
    const after = heard.filter(mechanism).slice(2).map((h) => h.name);
    expect(after).toEqual(["weaponLower", "weaponRaise", "weaponReady"]);
    expect(S.cur).toBe(0);
    expect(S.mag[1]).toBe(0); // and the cancelled reload loaded nothing, as before
  });

  it("firing mid-reload with rounds left: the reload stops, and so does its sound", () => {
    hold(2, 5);
    WS.startReload();
    const reload = WEAPON_STATS[2].reload;
    run(Math.ceil((0.3 * reload) / DT));
    expect(heard.filter(mechanism).map((h) => h.name)).toEqual(["rifleMagOut"]);
    run(1, () => { input.firing = true; });
    input.firing = false;
    expect(weaponRuntime.wstate).toBe("fire");
    run(Math.ceil((reload + 1) / DT));
    expect(heard.filter(mechanism).map((h) => h.name)).toEqual(["rifleMagOut"]);
    expect(S.mag[2]).toBe(4); // five, less the shot that cut the reload short
  });

  it("the cue on the very tick firing cuts the reload is not played either", () => {
    hold(2, 5);
    WS.startReload();
    const reload = WEAPON_STATS[2].reload;
    // stop one tick short of the magazine going in, and fire on the tick that would have crossed it
    run(Math.ceil((0.6 * reload) / DT) - 1);
    expect(heard.filter(mechanism).map((h) => h.name)).toEqual(["rifleMagOut"]);
    run(1, () => { input.firing = true; });
    input.firing = false;
    expect(heard.filter(mechanism).map((h) => h.name)).toEqual(["rifleMagOut"]);
  });

  it("a reload started again starts its sounds from the top", () => {
    hold(3, 5);
    WS.startReload();
    run(Math.ceil((0.3 * WEAPON_STATS[3].reload) / DT));
    run(1, () => { input.firing = true; });
    input.firing = false;
    run(Math.ceil(0.5 / DT));
    WS.startReload();
    run(Math.ceil((WEAPON_STATS[3].reload + 0.2) / DT));
    expect(heard.filter(mechanism).map((h) => h.name)).toEqual(["tommyDrumOut", "tommyDrumOut", "tommyDrumIn", "tommyKnobBack", "tommyKnobForward"]);
  });
});

describe("the mechanisms after a shot, and the raise", () => {
  it("the sniper's bolt runs through its four motions after every shot, at the moments the art moves it", () => {
    hold(4, 4);
    run(1, () => { input.firing = true; });
    input.firing = false;
    const window = Math.min(0.35, WEAPON_STATS[4].rate);
    run(Math.ceil(0.5 / DT));
    const got = heard.filter(mechanism);
    expect(got.map((h) => h.name)).toEqual(["sniperBoltLift", "sniperBoltBack", "sniperBoltForward", "sniperBoltLock"]);
    // lift .25+.12, back .37+.2, forward home at .83, lift home at .95 — of the fire window, from the shot (tick 1)
    const at = [0.37, 0.57, 0.83, 0.95];
    got.forEach((h, i) => {
      const phase = ((h.tick - 1) * DT) / window;
      expect(phase, h.name).toBeGreaterThanOrEqual(at[i] - 1e-6);
      expect(phase - DT / window, h.name).toBeLessThan(at[i] + 1e-6);
    });
  });

  it("the flare's hammer is thumbed back after the shot, and the cross launcher's next cross rises", () => {
    hold(0, 6);
    run(1, () => { input.firing = true; });
    input.firing = false;
    run(Math.ceil(0.5 / DT));
    hold(5, 3);
    run(1, () => { input.firing = true; });
    input.firing = false;
    run(Math.ceil(0.5 / DT));
    expect(heard.filter(mechanism).map((h) => h.name)).toEqual(["flareHammerCock", "crossRises"]);
  });

  it("a switch is heard going down, and the next weapon arriving at the end of the raise", () => {
    hold(1, 5);
    hold(0, 6);
    WS.requestSwitch(1);
    run(Math.ceil((WS.UNEQUIP_T + WS.EQUIP_T + 0.2) / DT));
    const got = heard.filter(mechanism);
    expect(got.map((h) => h.name)).toEqual(["weaponLower", "weaponRaise", "weaponReady"]);
    expect((got[2].tick - got[1].tick) * DT).toBeGreaterThanOrEqual(WS.EQUIP_T - 1e-9);
    expect((got[2].tick - got[1].tick - 1) * DT).toBeLessThan(WS.EQUIP_T);
  });

  it("the dry click is the one sound an empty weapon with no reserve makes", () => {
    hold(2, 0);
    (S.ammo as Record<string, number>).bullets = 0;
    run(1, () => { input.firing = true; });
    input.firing = false;
    expect(heard.filter(mechanism).map((h) => h.name)).toEqual(["dryFire"]);
  });

  it("the nail cannon's motor is driven every tick it fires, let go when it stops, and put away when another weapon is out", () => {
    hold(6, 50);
    run(20, () => { input.firing = true; });
    input.firing = false;
    const firing = heard.filter((h) => h.name === "nailCannonSpin").map((h) => h.args.join());
    expect(firing.every((a) => a === "true,false")).toBe(true);
    expect(firing).toHaveLength(20);
    heard.length = 0;
    run(10);
    expect(heard.filter((h) => h.name === "nailCannonSpin").map((h) => h.args.join())).toContain("false,false");
    heard.length = 0;
    hold(2, 5);
    run(1);
    expect(heard.filter((h) => h.name === "nailCannonSpin").map((h) => h.args.join())).toEqual(["false,true"]);
  });
});
