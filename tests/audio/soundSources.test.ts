// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { recordingAudioContext } from "../support/recordingAudio";

/**
 * Guards on where sound comes from — player feedback round 2, Task 1
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`):
 *
 * 1. every sound the game plays has a name (no raw engine voice is called
 *    outside `src/audio/`), and
 * 2. **no sound draws from `Math.random()`** — the game's own generator,
 *    the one the trace harness seeds (`docs/known-issues.md` KNOWN-22).
 *    Statically, over every file in `src/audio/` and the ambient layer's
 *    timers; and at runtime, by playing every sound under a
 *    `Math.random()` that counts.
 */

const SRC = join(__dirname, "..", "..", "src");

function srcFiles(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...srcFiles(p));
    else if (ent.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

/** Source with comments blanked, so a doc comment naming `bang(` is not a call. */
function code(file: string): string {
  return readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

const rel = (f: string): string => relative(SRC, f).split("\\").join("/");

describe("every sound the game plays has a name", () => {
  /**
   * The engine's raw voices. Outside `src/audio/` the game must call a named
   * sound from `src/audio/sounds/` (or one of the already-named functions in
   * `Ambient.ts`/`Voice.ts`: the doors, bells, organ, piano, boss pulse and
   * `snarl`) — never one of these with numbers. An inline call is a sound
   * the sound board cannot list and a later task cannot find.
   */
  const RAW = /(?<![.\w$])(blip|bang|boom|click|gunshot|growl|gurgle|pain|deathCry|noiseBuf)\(/g;

  // src/soundboard/previous/ is the sound board's record of sounds a task
  // replaced (player feedback round 2 Task 3 put the old weapons there):
  // copies of old catalogue bodies, raw voices and all, which the game never
  // imports (tests/soundboard/soundboard.test.ts holds that line).
  const outside = srcFiles(SRC).filter((f) => !rel(f).startsWith("audio/") && !rel(f).startsWith("soundboard/previous/"));

  it("scans the game's files at all", () => {
    expect(outside.length).toBeGreaterThan(80);
  });

  it("calls no raw engine voice outside src/audio", () => {
    const hits: string[] = [];
    for (const f of outside) {
      for (const m of code(f).matchAll(RAW)) hits.push(`${rel(f)}: ${m[0]}`);
    }
    expect(hits).toEqual([]);
  });

  /**
   * Player feedback round 2 Task 2: every sound plays at a level
   * (`src/audio/Levels.ts`), and the catalogue is where levels are set. The
   * engine's already-named sounds are reached through catalogue wrappers
   * (`monsterAlert`, `doorOpens`, `churchBells`, `organSting`, `pianoKey`);
   * calling one directly from the game would play it untrimmed. The boss
   * pulse (`startBossMusic`) is the documented exception.
   */
  it("calls no engine-named sound outside src/audio either — the catalogue gives each its level", () => {
    const NAMED = /(?<![.\w$])(snarl|wetDoor|stoneDoor|bellToll|organChord|pianoNote)\(/g;
    const hits: string[] = [];
    for (const f of outside) {
      if (rel(f).startsWith("soundboard/previous/")) continue;
      for (const m of code(f).matchAll(NAMED)) hits.push(`${rel(f)}: ${m[0]}`);
    }
    expect(hits).toEqual([]);
    const inside = srcFiles(join(SRC, "audio", "sounds")).reduce((n, f) => n + [...code(f).matchAll(NAMED)].length, 0);
    // Five, not six, since player feedback round 2 Task 4: `snarl`, the monsters' old first-sighting
    // bark, is no longer the game's (each monster has a voice, src/audio/VoiceTable.ts); only the sound
    // board's record of the old sounds calls it now (src/soundboard/previous/monsters.ts).
    // Two, not five, since Task 5: the stone door, the bells and the organ were rebuilt
    // (src/audio/sounds/doors.ts, music.ts), and `stoneDoor`, `bellToll` and `organChord` are called
    // only by the board's record of the old ones (src/soundboard/previous/world.ts). The flesh door
    // (`wetDoor`) and the piano (`pianoNote`) are still the engine's.
    expect(inside, "the same pattern finds them in the catalogue, once each").toBe(2);
    const board = code(join(SRC, "soundboard", "previous", "world.ts"));
    for (const name of ["stoneDoor", "bellToll", "organChord"]) expect(board, name).toMatch(new RegExp(`\\b${name}\\(`));
  });

  it("is not vacuous — the same pattern finds the raw calls inside the catalogue", () => {
    const inside = srcFiles(join(SRC, "audio", "sounds"));
    const n = inside.reduce((sum, f) => sum + [...code(f).matchAll(RAW)].length, 0);
    // (over 60 until player feedback round 2 Task 4 turned the monsters' blips and growls into voices, src/audio/Speak.ts;
    // over 40 until Task 5 rebuilt the world's — its steps, impacts, doors, pickups, explosions and UI, src/audio/Layers.ts)
    expect(n).toBeGreaterThan(25);
  });
});

describe("no sound draws from Math.random() — the game's own dice (KNOWN-22)", () => {
  /** Anything that rolls the game's generator: a bare Math.random(), or the gameplay helpers built on it. */
  const DRAW = /Math\.random\s*\(|(?<![.\w$])(rnd|pick)\s*\(|from\s+"[./]*utils\/math"/g;

  /** Every file whose code exists only to make sound: all of src/audio/, and the ambient layer's timers. */
  const SOUND_FILES = [...srcFiles(join(SRC, "audio")), join(SRC, "world", "Ambience.ts")];

  it("scans the sound files at all", () => {
    expect(SOUND_FILES.length).toBeGreaterThanOrEqual(14);
  });

  it("no file in src/audio/, nor the ambient layer, calls Math.random(), rnd() or pick() — or imports them", () => {
    const hits: string[] = [];
    for (const f of SOUND_FILES) {
      // utils/math's clamp is fine (it draws nothing); only rnd and pick roll dice.
      const src = code(f).replace(/import\s*\{\s*clamp\s*\}\s*from\s*"[./]*utils\/math";/g, "");
      for (const m of src.matchAll(DRAW)) hits.push(`${rel(f)}: ${m[0]}`);
    }
    expect(hits).toEqual([]);
  });

  it("is not vacuous — the same pattern finds the game's own draws outside them", () => {
    const n = srcFiles(SRC)
      .filter((f) => !SOUND_FILES.includes(f))
      .reduce((sum, f) => sum + [...code(f).matchAll(DRAW)].length, 0);
    expect(n).toBeGreaterThan(100);
  });

  it("playing every sound in the game, and running the ambient layer for ten minutes, draws Math.random() zero times", async () => {
    installDomStubs();
    const { ctx, events } = recordingAudioContext();
    (globalThis as { AudioContext?: unknown }).AudioContext = function () { return ctx; };
    const engine = await import("../../src/audio/AudioEngine");
    const sfx = await import("../../src/audio/Sfx");
    const voice = await import("../../src/audio/Voice");
    const amb = await import("../../src/audio/Ambient");
    const sounds = [
      await import("../../src/audio/sounds/weapons"),
      await import("../../src/audio/sounds/foley"),
      await import("../../src/audio/sounds/monsters"),
      await import("../../src/audio/sounds/world"),
      await import("../../src/audio/sounds/ui"),
      await import("../../src/audio/sounds/explosions"),
    ];
    const ambience = await import("../../src/world/Ambience");
    const { S } = await import("../../src/core/State");

    const real = Math.random;
    let draws = 0;
    Math.random = () => { draws++; return real(); };
    vi.useFakeTimers();
    try {
      engine.audioInit();
      sfx.blip(440, 0.1); sfx.bang(0.1); sfx.click(); sfx.boom(1);
      voice.growl(80, 0.3); voice.gurgle(0.2); voice.pain(120); voice.deathCry(80);
      for (const k of ["C", "A", "L", "j", "n", "k", "q", "R", "y", "s", "z"]) voice.snarl(k);
      amb.wetDoor(); amb.stoneDoor(); amb.bellToll(); amb.organChord(); amb.pianoNote(60);
      amb.startBossMusic(); vi.advanceTimersByTime(3000); amb.stopBossMusic();
      // Every function the catalogue exports, called with a plausible
      // argument where it takes one — so a sound added later is covered
      // without anyone remembering to list it here.
      let played = 0;
      for (const mod of sounds) {
        for (const [name, fn] of Object.entries(mod)) {
          if (typeof fn !== "function") continue;
          const f = fn as (...a: unknown[]) => unknown;
          if (name === "orbLaunch") for (const k of ["toxic", "heavy", "normal"]) f(k, "C");
          else if (name === "footstep") { for (const a of [false, true]) for (const b of [false, true]) f(a, b); for (const s of ["stone", "marble", "ash", "flesh", "metal", "water", "dirt"]) f(true, false, s); }
          else if (name === "bulletHitsWall") for (const m of ["stone", "metal", "flesh"]) f(m);
          else if (name === "kickImpact") for (const k of ["flesh", "stone", "air"]) f(k);
          else if (name === "doorOpens") for (const k of ["stone", "secret", "gate", "flesh"]) f(k);
          else if (name === "itemPickup") for (const k of ["health", "armor", "bullets", "shells", "slugs", "crosses", "nails", "souls", "key", "w5"]) f(k);
          else if (f.length > 0) { f(200); for (const k of ["z", "E", "L"]) f(k); } // a number for the rest; a monster's letter for its voice
          else f();
          played++;
        }
      }
      expect(played).toBeGreaterThan(60);
      // The ambient layer: stingers, heartbeat and breathing, at low health.
      S.hp = 10;
      for (let t = 0; t < 600; t += 0.1) { ambience.ambience(0.1); ambience.vitalsAudio(0.1); vi.advanceTimersByTime(100); }
      vi.runAllTimers();
    } finally {
      vi.useRealTimers();
      Math.random = real;
    }
    expect(events.length, "the sounds really played").toBeGreaterThan(2000);
    expect(draws).toBe(0);
  });
});
