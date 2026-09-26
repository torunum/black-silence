// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import type { SoundRow } from "../../src/soundboard/registry";

/**
 * THE SOUND BOARD — player feedback round 2, Task 1
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`). The page
 * the owner judges the game's sound with, by ear. What has to be true of it:
 *
 * 1. **It lists every sound.** Every function in the sound catalogue
 *    (`src/audio/sounds/`) and every already-named engine sound is played
 *    by some row, every row has a name, and the rows sit in the five groups.
 * 2. **It plays the game's real code, not copies.** Nothing under
 *    `src/soundboard/` builds a WebAudio node or calls a raw engine voice;
 *    every row makes sound, and draws nothing from the game's dice.
 * 3. **The game never loads it.** Nothing outside `src/soundboard/` imports
 *    it, and it is built by its own Vite config.
 * 4. **The page works from a click**, the only way a browser allows sound.
 * 5. **Old / new is ready for Task 2**: a registered old version turns a
 *    row's one button into two.
 */

const ROOT = join(__dirname, "..", "..");
const SRC = join(ROOT, "src");

function files(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...files(p));
    else if (/\.ts$/.test(ent.name)) out.push(p);
  }
  return out;
}
const code = (f: string): string =>
  readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
const rel = (f: string): string => relative(ROOT, f).split("\\").join("/");

let rows: readonly SoundRow[];
let registrySource: string;

beforeAll(async () => {
  installDomStubs();
  rows = (await import("../../src/soundboard/registry")).SOUND_ROWS;
  registrySource = code(join(SRC, "soundboard", "registry.ts"));
});

afterEach(() => vi.useRealTimers());

describe("it lists every sound in the game", () => {
  /** Pure helpers the catalogue exports alongside its sounds: a pitch formula and a roll. They make no sound. */
  const NOT_SOUNDS = new Set(["painPitch", "deathPitch", "ricochetRoll"]);

  it("every function the sound catalogue exports is played by a row", async () => {
    const W = await import("../../src/audio/sounds/weapons");
    const modules: Array<[string, Record<string, unknown>]> = [
      ["W", W],
      ["M", await import("../../src/audio/sounds/monsters")],
      ["WO", await import("../../src/audio/sounds/world")],
      ["UI", await import("../../src/audio/sounds/ui")],
      ["X", await import("../../src/audio/sounds/explosions")],
    ];
    const missing: string[] = [];
    let checked = 0;
    for (const [alias, mod] of modules) {
      for (const [name, fn] of Object.entries(mod)) {
        if (typeof fn !== "function" || NOT_SOUNDS.has(name)) continue;
        checked++;
        const named = new RegExp(`\\b${alias}\\.${name}\\b`).test(registrySource);
        const asWeaponSlot = W.WEAPON_FIRE_SOUNDS.includes(fn as () => void) && /W\.WEAPON_FIRE_SOUNDS\.map/.test(registrySource);
        if (!named && !asWeaponSlot) missing.push(`${alias}.${name}`);
      }
    }
    expect(checked).toBeGreaterThan(70);
    expect(missing).toEqual([]);
  });

  // Player feedback round 2 Task 2: the engine's already-named sounds are
  // now reached through catalogue functions that give them a level
  // (`monsterAlert`, `doorOpens`, `churchBells`, `organSting`, `pianoKey`),
  // so the board plays those — which the test above already requires — and
  // the catalogue plays the engine's. The boss pulse alone is still played
  // by name (see src/audio/Levels.ts on why it has no level).
  it("…and so is every sound the engine already had a name for, through the catalogue", () => {
    const catalogue = ["monsters", "world"].map((f) => code(join(SRC, "audio", "sounds", `${f}.ts`))).join("\n");
    for (const name of ["snarl", "wetDoor", "stoneDoor", "bellToll", "organChord", "pianoNote"]) {
      expect(catalogue, name).toMatch(new RegExp(`\\b${name}\\(`));
    }
    expect(registrySource).toMatch(/\bstartBossMusic\(\)/);
  });

  it("covers every monster alert: the ten kinds with their own bark, and the moan everyone else makes", () => {
    const voice = readFileSync(join(SRC, "audio", "Voice.ts"), "utf8");
    const kinds = [...voice.matchAll(/kind==="(\w)"/g)].map((m) => m[1]);
    expect(kinds).toHaveLength(10);
    const alerts = rows.filter((r) => r.id.startsWith("monster-alert-")).map((r) => r.id.slice("monster-alert-".length));
    expect(alerts.sort()).toEqual([...kinds, "other"].sort());
  });

  it("names each distinct pain and death cry once, and every monster makes one of them", async () => {
    const { ENEMY_DEFS } = await import("../../src/enemies/EnemyDefs");
    const { painPitch, deathPitch } = await import("../../src/audio/sounds/monsters");
    const distinct = (f: (p: number) => number) => new Set(Object.values(ENEMY_DEFS).map((d) => f(d.pain))).size;
    expect(rows.filter((r) => r.id.startsWith("monster-pain-"))).toHaveLength(distinct(painPitch));
    expect(rows.filter((r) => r.id.startsWith("monster-death-"))).toHaveLength(distinct(deathPitch));
  });

  it("puts every row in one of the five groups, with a unique id and a unique name", () => {
    expect(new Set(rows.map((r) => r.category))).toEqual(new Set(["Weapons", "Monsters", "World", "UI", "Explosions"]));
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    expect(new Set(rows.map((r) => r.name)).size).toBe(rows.length);
    for (const r of rows) expect(r.name.length, r.id).toBeGreaterThan(3);
  });
});

describe("it plays the game's real sound code, never a copy", () => {
  const BOARD = files(join(SRC, "soundboard")).filter((f) => !rel(f).startsWith("src/soundboard/previous/"));

  it("nothing in src/soundboard builds a sound node or calls a raw engine voice", () => {
    const hits: string[] = [];
    for (const f of BOARD) {
      for (const m of code(f).matchAll(/\.create(Oscillator|Gain|BiquadFilter|BufferSource|Buffer|Delay|Panner)\(|(?<![.\w$])(blip|bang|boom|click|gunshot|growl|gurgle|pain|deathCry)\(/g)) {
        hits.push(`${rel(f)}: ${m[0]}`);
      }
    }
    expect(BOARD.length).toBeGreaterThanOrEqual(4);
    expect(hits).toEqual([]);
  });

  it("every row's every button makes sound through the game's engine, and draws nothing from the game's dice", async () => {
    const { ctx, events } = recordingAudioContext();
    (globalThis as { AudioContext?: unknown }).AudioContext = function () { return ctx; };
    const { audioInit } = await import("../../src/audio/AudioEngine");
    const real = Math.random;
    let draws = 0;
    Math.random = () => { draws++; return real(); };
    vi.useFakeTimers();
    const silent: string[] = [];
    try {
      audioInit({ drones: false });
      for (const row of rows) {
        for (const v of row.versions) {
          const before = events.length;
          v.play();
          vi.advanceTimersByTime(5000);
          const made = events.slice(before).filter((e: AudioEvent) => e.kind === "create" && e.detail.type !== "AudioBuffer");
          if (made.length === 0) silent.push(`${row.id}/${v.label}`);
        }
      }
    } finally {
      Math.random = real;
    }
    expect(rows.length).toBeGreaterThan(100);
    expect(silent).toEqual([]);
    expect(draws).toBe(0);
  });
});

describe("the game never loads it", () => {
  it("nothing outside src/soundboard imports it", () => {
    const hits = files(SRC)
      .filter((f) => !rel(f).startsWith("src/soundboard/"))
      // `from "…"`, a bare side-effect `import "…"`, and a dynamic `import("…")`.
      .filter((f) => /(\bfrom\s*|\bimport\s*\(?\s*)["'][^"']*soundboard/.test(readFileSync(f, "utf8")))
      .map(rel);
    expect(hits).toEqual([]);
  });

  it("every element the board looks up exists in soundboard.html (the lookups tests/smoke.test.ts leaves to this file)", () => {
    const page = readFileSync(join(ROOT, "soundboard.html"), "utf8");
    const ids = files(join(SRC, "soundboard")).flatMap((f) => [...readFileSync(f, "utf8").matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]));
    expect(ids).toEqual(["board"]);
    for (const id of ids) expect(page).toContain(`id="${id}"`);
  });

  it("index.html does not reference it; soundboard.html loads only the board", () => {
    expect(readFileSync(join(ROOT, "index.html"), "utf8")).not.toMatch(/soundboard/);
    const page = readFileSync(join(ROOT, "soundboard.html"), "utf8");
    expect([...page.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1])).toEqual(["/src/soundboard/main.ts"]);
  });

  it("is built by its own Vite config, after the game's, into the same dist/ — and the single-file build still starts from the game's", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toBe("vite build && vite build --config vite.soundboard.config.ts");
    expect(pkg.scripts["build:single"]).toMatch(/^npm run build && node scripts\/inline-single-file\.mjs$/);
    const cfg = readFileSync(join(ROOT, "vite.soundboard.config.ts"), "utf8");
    expect(cfg).toMatch(/emptyOutDir:\s*false/);
    expect(cfg).toMatch(/input:\s*\{\s*soundboard:\s*"soundboard\.html"\s*\}/);
    expect(readFileSync(join(ROOT, "vite.config.ts"), "utf8")).not.toMatch(/soundboard/);
  });
});

describe("the page", () => {
  async function mount() {
    const { ctx, events } = recordingAudioContext();
    let constructed = 0;
    (globalThis as { AudioContext?: unknown }).AudioContext = function () { constructed++; return ctx; };
    document.body.innerHTML = '<div id="board"></div>';
    vi.resetModules();
    const { mountSoundboard } = await import("../../src/soundboard/page");
    const api = mountSoundboard(document.getElementById("board")!);
    return { api, events, constructed: () => constructed };
  }

  it("shows the five groups, each with its count, and one play button per row", async () => {
    await mount();
    const headings = [...document.querySelectorAll("h2")].map((h) => h.textContent);
    expect(headings.map((h) => h!.replace(/ \(\d+\)$/, ""))).toEqual(["Weapons", "Monsters", "World", "UI", "Explosions"]);
    const total = headings.reduce((n, h) => n + Number(/\((\d+)\)$/.exec(h!)![1]), 0);
    expect(total).toBe(rows.length);
    expect(document.querySelectorAll("button.play")).toHaveLength(rows.length);
    expect(document.querySelector("button.power")?.textContent).toBe("Turn sound on");
  });

  it("makes no sound — builds no audio at all — until a click, and a play button's click both turns sound on and plays", async () => {
    const { events, constructed } = await mount();
    expect(constructed()).toBe(0);
    const shotgun = document.querySelector('li[data-id="weapon-fire-1"] button.play') as HTMLButtonElement;
    shotgun.click();
    expect(constructed()).toBe(1);
    expect(events.some((e) => e.kind === "create" && e.detail.type === "AudioBufferSourceNode")).toBe(true);
    expect((document.querySelector("button.power") as HTMLButtonElement).disabled).toBe(true);
    // A second click plays again on the same context.
    shotgun.click();
    expect(constructed()).toBe(1);
  });

  it("finds a sound by typing", async () => {
    await mount();
    const search = document.querySelector("input.search") as HTMLInputElement;
    search.value = "shotgun";
    search.dispatchEvent(new Event("input"));
    const shown = [...document.querySelectorAll("li.row")].filter((li) => !(li as HTMLElement).hidden);
    expect(shown.map((li) => (li as HTMLElement).dataset.id).sort()).toEqual(["shotgun-pump", "weapon-fire-1"]);
    const visibleSections = [...document.querySelectorAll("section")].filter((s) => !(s as HTMLElement).hidden);
    expect(visibleSections).toHaveLength(1);
  });
});

describe("old and new, ready for Task 2", () => {
  it("in Task 1 every row has exactly one version, \"current\"", () => {
    for (const r of rows) expect(r.versions.map((v) => v.label), r.id).toEqual(["current"]);
  });

  it("a registered old version turns a row into Old and New, New being the game's own sound", async () => {
    vi.resetModules();
    const old = vi.fn();
    vi.doMock("../../src/soundboard/previous", () => ({ PREVIOUS: { "weapon-fire-1": old } }));
    try {
      const { SOUND_ROWS } = await import("../../src/soundboard/registry");
      const W = await import("../../src/audio/sounds/weapons");
      const row = SOUND_ROWS.find((r) => r.id === "weapon-fire-1")!;
      expect(row.versions.map((v) => v.label)).toEqual(["old", "new"]);
      expect(row.versions[0].play).toBe(old);
      expect(row.versions[1].play).toBe(W.shotgunFire);
      expect(SOUND_ROWS.filter((r) => r.versions.length === 2)).toHaveLength(1);
    } finally {
      vi.doUnmock("../../src/soundboard/previous");
    }
  });

  it("every old version registered is for a row that exists", async () => {
    vi.resetModules();
    const { PREVIOUS } = await import("../../src/soundboard/previous");
    const ids = new Set(rows.map((r) => r.id));
    for (const id of Object.keys(PREVIOUS)) expect(ids.has(id), id).toBe(true);
  });
});
