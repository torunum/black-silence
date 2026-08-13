// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { evalReference, REF, refSource } from "../support/reference";
import { loadGameHtml } from "../support/domStubs";
import { seedRandom } from "../support/seededRandom";
import { MONOLOGUE } from "../../src/content/monologue";
import { ACHIEVEMENTS, type Achievement } from "../../src/content/achievements";
import type * as SubtitlesModule from "../../src/ui/Subtitles";
import type * as ToastsModule from "../../src/ui/Toasts";
import type * as HudMessagesModule from "../../src/ui/HudMessages";

/**
 * The UI half of the behavioral oracle — src/ui/{Subtitles,Toasts,HudMessages}.ts
 * (Plan 0C Task 4), compared against reference/sonsurum.html's originals.
 *
 * These three modules draw nothing on a canvas, so the recorder in
 * tests/support/recordingCanvas.ts has nothing to record. What they *do*
 * touch is the DOM, one shared set of elements (`#subt`, `#toasts`, `#msg`,
 * `#dmg`, `#holy`) that the reference names by exactly the same ids — so
 * the oracle here is the DOM itself: run the same script of calls against
 * both sides, snapshot those five elements after every step, and compare
 * the two lists of snapshots. Comparing after EVERY step, not just at the
 * end, is what makes the timing rules (the 3-second subtitle throttle, the
 * 4.3-second subtitle life, the 4200/500ms toast fade) observable instead
 * of averaged away.
 *
 * Three things the harness has to control, or the comparison is not real:
 *
 * - **The clock.** say() throttles on `performance.now()`, so both sides
 *   run against one injected fake clock rather than wall time. It also lets
 *   a case sit exactly at the 3-second boundary.
 * - **The scheduler.** setTimeout/requestAnimationFrame are replaced on
 *   both sides by the same recording queue, so the toast's opacity ramp and
 *   its two nested timers are stepped deliberately and their delays
 *   compared as values.
 * - **Module state that outlives a test.** Subtitles.ts's `onceSaid` and
 *   `lastSayT` are module-private and persist for the whole file, while the
 *   reference side gets a fresh sandbox per case. Every case therefore
 *   advances the fake clock past the throttle first, and any case that
 *   needs a once-only id uses one no other case has spent.
 */

/** Toasts.ts calls blip() through a static import; replacing the module is the only way to see its arguments. */
const { blipCalls } = vi.hoisted(() => ({ blipCalls: [] as unknown[][] }));
vi.mock("../../src/audio/Sfx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/audio/Sfx")>();
  return { ...actual, blip: (...args: unknown[]) => { blipCalls.push(args); } };
});

let Subtitles: typeof SubtitlesModule;
let Toasts: typeof ToastsModule;
let HudMessages: typeof HudMessagesModule;

/** The fake clock, in milliseconds — say() divides it by 1000. */
let clockMs = 0;

interface Timer { fn: () => void; delay: number; }

beforeAll(async () => {
  loadGameHtml(); // #subt/#toasts/#msg/#dmg/#holy must exist before HudMessages.ts captures #msg at its module top level
  Object.defineProperty(globalThis, "performance", {
    value: { now: () => clockMs }, configurable: true, writable: true,
  });
  Subtitles = await import("../../src/ui/Subtitles");
  Toasts = await import("../../src/ui/Toasts");
  HudMessages = await import("../../src/ui/HudMessages");
});

/**
 * The five elements both sides write. Everything these modules do is
 * visible here — there is no other output.
 */
interface DomSnapshot {
  subt: string; toasts: string; msg: string; dmg: string; holy: string;
}
function snapshot(): DomSnapshot {
  const el = (id: string) => document.getElementById(id) as HTMLElement;
  return {
    subt: el("subt").innerHTML,
    toasts: el("toasts").innerHTML,
    msg: el("msg").textContent ?? "",
    dmg: el("dmg").style.opacity,
    holy: el("holy").style.opacity,
  };
}
/**
 * Clears the five elements in place. Deliberately NOT a re-run of
 * loadGameHtml(): that would replace the nodes, and HudMessages.ts (like
 * the reference) holds `#msg` by reference from module-eval time, so it
 * would keep writing to a detached element while every assertion read the
 * new one — a test that passes while the game shows nothing.
 */
function resetDom(): void {
  const el = (id: string) => document.getElementById(id) as HTMLElement;
  el("subt").innerHTML = ""; el("toasts").innerHTML = ""; el("msg").textContent = "";
  el("dmg").style.opacity = ""; el("holy").style.opacity = "";
}

/** What one scripted step can do — implemented once by the module side and once by the reference's own functions. */
interface UiApi {
  say: (id: string, force?: boolean) => void;
  tickSubtitles: (dt: number) => void;
  ach: (a: Achievement) => void;
  showMsg: (t: string, sec?: number) => void;
  tickMessage: (dt: number) => void;
  flashDmg: (a: number) => void;
  flashHoly: (a: number) => void;
  /** Advances the shared fake clock. */
  advance: (ms: number) => void;
  /** Runs every queued timer whose turn has come, in schedule order, including ones scheduled by those timers. */
  flushTimers: () => void;
  /** Runs queued animation-frame callbacks. */
  flushFrames: () => void;
}

/**
 * Everything one side of a comparison produced. Both runners return the
 * same shape, and expectParity compares all four fields.
 *
 * Deliberately *returned* rather than captured by a step in the script: a
 * step closure runs on both sides in turn, so anything it writes to a
 * variable in the test body is overwritten by whichever side ran last —
 * which silently turns `expect(fromModule).toEqual(fromReference)` into a
 * comparison of the reference with itself. Two sabotages (the toast's
 * 4200/500ms fade) survived a first version of this file for exactly that
 * reason.
 */
interface RunResult {
  snapshots: DomSnapshot[];
  /** Delays of every timer scheduled, in schedule order — the only place the fade timings are observable, since flushTimers runs the queue regardless of delay. */
  delays: number[];
  /** The unlocked-achievement record this side wrote into: `S.ach` on the reference side. */
  unlocked: Record<string, { title: string; desc: string }>;
  /** Arguments of every blip() this side made. */
  blips: unknown[][];
}

/** One step of a script: does something, and the harness snapshots the DOM afterwards. */
type Step = [label: string, run: (api: UiApi) => void];

const REF_CHUNKS = [
  refSource(REF.mathHelpers),
  refSource(REF.subtitles),
  refSource(REF.achievementToast),
  refSource(REF.hudMessages),
  // The two timer fragments live inside functions Plan 0F still owns
  // (chatterTick and the main loop), so they are wrapped into functions of
  // their own to be callable — the statements themselves are untouched.
  `function refTickSubtitles(dt){\n${refSource(REF.subtitleTimer)}\n}`,
  `function refTickMessage(dt){\n${messageTimerBody()}\n}`,
];

/**
 * REF.messageTimer's single line ends with the brace that closes the main
 * loop's `if(started&&!S.dead){` block, one brace more than the statement
 * itself needs. Dropping exactly that one trailing brace — and asserting
 * that is what is being dropped — is what makes the line standalone.
 */
function messageTimerBody(): string {
  const line = refSource(REF.messageTimer);
  if (!line.endsWith(';}}')) {
    throw new Error(`REF.messageTimer no longer ends with the main loop's closing brace: ${line}`);
  }
  return line.slice(0, -1);
}

const REF_EXPR =
  "({say,ach,showMsg,flashDmg,flashHoly,tickSubtitles:refTickSubtitles,tickMessage:refTickMessage," +
  "state:()=>({subT,lastSayT,msgT})})";

interface RefUi {
  say: (id: string, force?: boolean) => void;
  ach: (id: string, title: string, desc: string) => void;
  showMsg: (t: string, sec?: number) => void;
  flashDmg: (a: number) => void;
  flashHoly: (a: number) => void;
  tickSubtitles: (dt: number) => void;
  tickMessage: (dt: number) => void;
  state: () => { subT: number; lastSayT: number; msgT: number };
}

/** Builds the shared fake scheduler both sides run on. */
function makeScheduler() {
  const timers: Timer[] = [];
  const frames: Array<() => void> = [];
  const delays: number[] = [];
  return {
    timers, frames,
    setTimeout: (fn: () => void, delay: number) => { timers.push({ fn, delay }); delays.push(delay); return timers.length; },
    requestAnimationFrame: (fn: () => void) => { frames.push(fn); return frames.length; },
    flushTimers: () => { for (let i = 0; i < timers.length; i++) timers[i].fn(); },
    flushFrames: () => { const pending = frames.splice(0); for (const f of pending) f(); },
    delays: () => delays.slice(),
  };
}

/** Runs `steps` against the ported modules, snapshotting the DOM after each one. */
function moduleRun(seed: number, steps: readonly Step[]): RunResult {
  resetDom();
  blipCalls.length = 0;
  const sched = makeScheduler();
  const unlocked: Record<string, { title: string; desc: string }> = {};
  const realSetTimeout = globalThis.setTimeout;
  const realRaf = globalThis.requestAnimationFrame;
  (globalThis as Record<string, unknown>).setTimeout = sched.setTimeout;
  (globalThis as Record<string, unknown>).requestAnimationFrame = sched.requestAnimationFrame;
  const restoreRandom = seedRandom(seed);
  const api: UiApi = {
    say: (id, force) => Subtitles.say(id, force),
    tickSubtitles: (dt) => Subtitles.tickSubtitles(dt),
    ach: (a) => Toasts.ach(a, unlocked),
    showMsg: (t, sec) => HudMessages.showMsg(t, sec),
    tickMessage: (dt) => HudMessages.tickMessage(dt),
    flashDmg: (a) => HudMessages.flashDmg(a),
    flashHoly: (a) => HudMessages.flashHoly(a),
    advance: (ms) => { clockMs += ms; },
    flushTimers: sched.flushTimers,
    flushFrames: sched.flushFrames,
  };
  try {
    const snapshots = steps.map(([, run]) => { run(api); return snapshot(); });
    return { snapshots, delays: sched.delays(), unlocked, blips: blipCalls.map((c) => [...c]) };
  } finally {
    restoreRandom();
    (globalThis as Record<string, unknown>).setTimeout = realSetTimeout;
    (globalThis as Record<string, unknown>).requestAnimationFrame = realRaf;
  }
}

/**
 * Runs the same steps against the reference's own say/ach/showMsg/flashDmg/
 * flashHoly in a fresh sandbox.
 *
 * `M` and the achievement strings are handed in from the port's own tables.
 * That is only safe because both are pinned elsewhere against the reference
 * text itself — MONOLOGUE by tests/fidelity.test.ts (REF.monologue), and
 * every achievement triple by tests/content/achievements.test.ts, which
 * re-extracts them from the reference by regex. Without those two, this
 * would be feeding the same data to both sides and proving nothing.
 */
function referenceRun(seed: number, steps: readonly Step[]): RunResult {
  resetDom();
  const sched = makeScheduler();
  const blips: unknown[][] = [];
  const S = { ach: {} as Record<string, { title: string; desc: string }> };
  const ref = evalReference<RefUi>(REF_CHUNKS, REF_EXPR, {
    document, Math, M: MONOLOGUE, S,
    performance: { now: () => clockMs },
    blip: (...args: unknown[]) => { blips.push(args); },
    setTimeout: sched.setTimeout,
    requestAnimationFrame: sched.requestAnimationFrame,
  });
  const restoreRandom = seedRandom(seed);
  const api: UiApi = {
    say: (id, force) => ref.say(id, force),
    tickSubtitles: (dt) => ref.tickSubtitles(dt),
    ach: (a) => ref.ach(a.id, a.title, a.desc),
    showMsg: (t, sec) => ref.showMsg(t, sec),
    tickMessage: (dt) => ref.tickMessage(dt),
    flashDmg: (a) => ref.flashDmg(a),
    flashHoly: (a) => ref.flashHoly(a),
    advance: (ms) => { clockMs += ms; },
    flushTimers: sched.flushTimers,
    flushFrames: sched.flushFrames,
  };
  try {
    const snapshots = steps.map(([, run]) => { run(api); return snapshot(); });
    return { snapshots, blips, delays: sched.delays(), unlocked: S.ach };
  } finally {
    restoreRandom();
  }
}

/**
 * Runs `steps` on both sides from the same clock reading and asserts
 * everything either side produced matches: the DOM step by step (naming the
 * step that diverged), then the scheduled delays, the unlock record and the
 * blips.
 */
function expectParity(seed: number, steps: readonly Step[]): { module: RunResult; reference: RunResult } {
  const startClock = clockMs;
  const mod = moduleRun(seed, steps);
  clockMs = startClock; // the reference replays the same wall time, not the module's leftovers
  const ref = referenceRun(seed, steps);
  steps.forEach(([label], i) => {
    expect({ step: label, ...mod.snapshots[i] }).toEqual({ step: label, ...ref.snapshots[i] });
  });
  expect(mod.delays).toEqual(ref.delays);
  expect(mod.unlocked).toEqual(ref.unlocked);
  expect(mod.blips).toEqual(ref.blips);
  return { module: mod, reference: ref };
}

beforeEach(() => {
  // Past every throttle and every fade, so a case never inherits the
  // previous one's timing. The module's say() keeps its lastSayT for the
  // life of the file; the reference's starts at -9 in each fresh sandbox.
  clockMs += 1_000_000;
});

describe("say — ADEM's subtitles", () => {
  it("writes the same line, in the same markup, as the reference", () => {
    const { module } = expectParity(11, [["say lvl0", (a) => a.say("lvl0")]]);
    expect(module.snapshots[0].subt).toMatch(/^<b>ADEM<\/b><br>“.+”$/);
    // The line is one of that id's own, and not, say, the first one every time.
    const spoken = /“(.+)”/.exec(module.snapshots[0].subt)![1];
    expect(MONOLOGUE.lvl0).toContain(spoken);
  });

  it("throttles to one line per 3 seconds, and force skips the throttle", () => {
    expectParity(12, [
      ["first line", (a) => a.say("lvl1")],
      ["+1s: too soon, suppressed", (a) => { a.advance(1000); a.say("lvl2"); }],
      ["+2.9s total: still too soon", (a) => { a.advance(1900); a.say("lvl3"); }],
      ["forced through anyway", (a) => a.say("lvl4", true)],
      ["+0.1s: the forced line reset the throttle too", (a) => { a.advance(100); a.say("lvl5"); }],
      ["+3.1s: allowed again", (a) => { a.advance(3100); a.say("lvl6"); }],
    ]);
  });

  it("says a see_/boss_/named line at most once, and spends it even when the throttle eats it", () => {
    expectParity(13, [
      ["see_C, first time", (a) => a.say("see_C")],
      ["see_C again after 10s: silent forever", (a) => { a.advance(10000); a.say("see_C"); }],
      ["boss_Z, first time", (a) => { a.advance(10000); a.say("boss_Z"); }],
      // 'piano' is marked said here even though the throttle stops it being
      // shown — so the +10s retry below stays silent. Preserved deliberately.
      ["piano 1s later: marked said, but throttled out", (a) => { a.advance(1000); a.say("piano"); }],
      ["piano 10s later: already spent", (a) => { a.advance(10000); a.say("piano"); }],
      ["an unthrottled ordinary line still works", (a) => a.say("lowhp")],
    ]);
  });

  it("ignores an id the monologue has no lines for", () => {
    const { module } = expectParity(14, [
      ["say lvl7", (a) => a.say("lvl7")],
      ["say a nonexistent id", (a) => { a.advance(10000); a.say("no_such_line"); }],
    ]);
    expect(module.snapshots[1]).toEqual(module.snapshots[0]); // the previous line is still on screen, untouched
  });

  it("clears the subtitle 4.3 seconds later, and not a frame sooner", () => {
    const { module } = expectParity(15, [
      ["say", (a) => a.say("secret")],
      ["tick 4.2s — still under 4.3", (a) => a.tickSubtitles(4.2)],
      // 0.2, not 0.1: landing exactly on 4.3 leaves float residue whose
      // sign decides whether this frame or the next one clears. Both sides
      // agree either way, but pinning the life as "4.3, not 4.2" should not
      // rest on which way 4.3-4.2-0.1 rounds.
      ["tick past 4.3s", (a) => a.tickSubtitles(0.2)],
      ["tick again with nothing left", (a) => a.tickSubtitles(0.1)],
    ]);
    expect(module.snapshots[1].subt).not.toBe("");
    expect(module.snapshots[2].subt).toBe("");
  });
});

describe("ach — the achievement toast", () => {
  it("builds the same toast markup, unlock record, sound and fade timings as the reference", () => {
    const steps: Step[] = [
      ["ach punt", (a) => a.ach(ACHIEVEMENTS.punt)],
      ["the rAF opacity ramp", (a) => a.flushFrames()],
      ["ach punt again — already unlocked", (a) => a.ach(ACHIEVEMENTS.punt)],
      ["ach deadeye", (a) => a.ach(ACHIEVEMENTS.deadeye)],
      ["flush frames + both nested timers", (a) => { a.flushFrames(); a.flushTimers(); }],
    ];
    const { module } = expectParity(21, steps);
    const snaps = module.snapshots;

    // The toast itself, pinned as markup: a class, the ✦ prefix, the title,
    // and the description in its own <small>.
    expect(snaps[0].toasts).toBe(
      '<div class="toast">✦ FIELD GOAL<small>Kick an enemy into a wall</small></div>',
    );
    // Unlocking twice must not stack a second card.
    expect(snaps[2].toasts).toBe(snaps[1].toasts);
    expect(snaps[3].toasts.match(/class="toast"/g)!.length).toBe(2);
    // Both nested timers ran: opacity back to 0, then the node removed.
    expect(snaps[4].toasts).toBe("");

    // The unlock sound, and the 4200ms hold + 500ms removal — the delays are
    // the only trace of those two durations, since flushTimers runs the
    // queue whatever the delay says.
    expect(module.blips[0]).toEqual([160, .5, "sine", .05, 120, true]);
    expect(module.blips.length).toBe(2); // one per newly unlocked achievement, none for the repeat
    expect(module.delays.slice(0, 2)).toEqual([4200, 4200]);
    expect(module.delays.slice(2)).toEqual([500, 500]);
  });

  it("records the title and description into the unlocked map exactly as the reference does", () => {
    const { module } = expectParity(22, [["ach gauntlet", (a) => a.ach(ACHIEVEMENTS.gauntlet)]]);
    expect(module.unlocked).toEqual({ gauntlet: { title: "THE GAUNTLET", desc: "Survive the challenge plate" } });
  });
});

describe("HUD messages", () => {
  it("shows, holds and clears a message on the same schedule as the reference", () => {
    const { module } = expectParity(31, [
      ["showMsg with the default 2.2s", (a) => a.showMsg("YOU NEED THE RED KEY")],
      ["tick 2.1s — still under 2.2", (a) => a.tickMessage(2.1)],
      // 0.2 for the same reason the subtitle test uses it: 2.2-2.1-0.1
      // leaves a positive float residue, so the message survives one extra
      // frame. Both sides do it; the duration under test is 2.2, not that.
      ["tick past 2.2s", (a) => a.tickMessage(0.2)],
      ["showMsg with an explicit 4s", (a) => a.showMsg("SECRET FOUND", 4)],
      ["tick 3.9s", (a) => a.tickMessage(3.9)],
      ["tick past 4s", (a) => a.tickMessage(0.2)],
      ["tick with nothing showing", (a) => a.tickMessage(1)],
    ]);
    const snaps = module.snapshots;
    expect(snaps[0].msg).toBe("YOU NEED THE RED KEY");
    expect(snaps[1].msg).toBe("YOU NEED THE RED KEY"); // 2.1 < 2.2: still up
    expect(snaps[2].msg).toBe("");
    expect(snaps[4].msg).toBe("SECRET FOUND");         // 3.9 < 4: the explicit duration won
    expect(snaps[5].msg).toBe("");
  });

  it("flashes damage and holy overlays at the given opacity and clears them after 90ms / 80ms", () => {
    const { module } = expectParity(41, [
      ["flashDmg(.55)", (a) => a.flashDmg(.55)],
      ["flashHoly(.3)", (a) => a.flashHoly(.3)],
      ["run both clear-timers", (a) => a.flushTimers()],
    ]);
    expect(module.snapshots[0].dmg).toBe("0.55");
    expect(module.snapshots[1].holy).toBe("0.3");
    expect(module.snapshots[2]).toMatchObject({ dmg: "0", holy: "0" });
    // The two delays differ by 10ms and must keep doing so — flushTimers
    // clears both overlays whatever the delays are, so this is the only
    // place 90 and 80 are observable at all.
    expect(module.delays).toEqual([90, 80]);
  });
});
