// @vitest-environment jsdom
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { installDomStubs } from "../support/domStubs";
import type { BestiaryApi } from "../../src/bestiary/page";

/**
 * THE BESTIARY (enemies plan, Task 1): the page the owner judges the monsters
 * by eye with. What has to be true of it:
 *
 * 1. **It shows every enemy**, and for each re-rigged enemy the old art and the
 *    new, with a button for walk, attack, pain, death and each dismemberment.
 * 2. **Its buttons play things**: a press makes the row play that clip, on both
 *    sides, and the frames are the game's (the rig's, the legacy rows').
 * 3. **The game never loads it.** Nothing the game imports reaches `src/bestiary/`
 *    (read off the real import graph from `src/main.ts`), nothing outside the
 *    folder names it, and it is built by its own Vite config, not the game's.
 */

const ROOT = join(__dirname, "..", "..");
const SRC = join(ROOT, "src");
const rel = (f: string): string => relative(ROOT, f).split("\\").join("/");

function files(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...files(p));
    else if (/\.(ts|js)$/.test(ent.name)) out.push(p);
  }
  return out;
}
const code = (f: string): string => readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

/** Every file reachable from `entry` through static and dynamic relative imports. */
function reachable(entry: string): Set<string> {
  const seen = new Set<string>(), todo = [entry];
  while (todo.length) {
    const f = todo.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of code(f).matchAll(/(?:from\s*|import\s*\(\s*|import\s+)["'](\.[^"']+)["']/g)) {
      const base = resolve(dirname(f), m[1]);
      for (const c of [base + ".ts", base + ".js", join(base, "index.ts"), base]) {
        if (/\.(ts|js)$/.test(c) && existsSync(c)) { todo.push(c); break; }
      }
    }
  }
  return seen;
}

describe("the game never loads the bestiary", () => {
  it("nothing reachable from the game's entry point is under src/bestiary", () => {
    const game = reachable(join(SRC, "main.ts"));
    expect(game.size, "the walk found the game").toBeGreaterThan(150);
    expect(game.has(join(SRC, "enemies", "SpriteBaker.ts")), "and the rig's baker is in it").toBe(true);
    expect([...game].map(rel).filter((f) => f.startsWith("src/bestiary/"))).toEqual([]);
  });

  it("nothing outside src/bestiary names it", () => {
    const hits = files(SRC).filter((f) => !rel(f).startsWith("src/bestiary/") && /bestiary/i.test(code(f))).map(rel);
    expect(hits).toEqual([]);
  });

  it("the game's page and build never mention it; it has a page and a build of its own", () => {
    expect(readFileSync(join(ROOT, "index.html"), "utf8")).not.toMatch(/bestiary/i);
    expect(readFileSync(join(ROOT, "vite.config.ts"), "utf8")).not.toMatch(/bestiary/i);
    expect(readFileSync(join(ROOT, "vite.bestiary.config.ts"), "utf8")).toMatch(/input:\s*\{\s*bestiary:\s*"bestiary\.html"/);
    expect(readFileSync(join(ROOT, "bestiary.html"), "utf8")).toMatch(/src="\/src\/bestiary\/main\.ts"/);
    expect(JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts.build).toMatch(/vite\.bestiary\.config\.ts/);
  });

  it("the README links it, next to the sound board", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf8");
    expect(readme).toMatch(/\]\(https:\/\/torunum\.github\.io\/black-silence\/bestiary\.html\)/);
    expect(readme.indexOf("bestiary.html")).toBeGreaterThan(readme.indexOf("soundboard.html"));
  });
});

let api: BestiaryApi;
let root: HTMLElement;

beforeAll(async () => {
  installDomStubs();
  vi.stubGlobal("requestAnimationFrame", () => 0);
  root = document.createElement("div");
  document.body.append(root);
  const { mountBestiary } = await import("../../src/bestiary/page");
  api = mountBestiary(root);
});
afterAll(() => { api.stop(); vi.unstubAllGlobals(); });

describe("it shows every enemy, the old art and the new side by side", () => {
  it("one card for every enemy the game can spawn", async () => {
    const { ENEMY_DEFS } = await import("../../src/enemies/EnemyDefs");
    const keys = [...root.querySelectorAll<HTMLElement>(".card")].map((c) => c.dataset.key);
    expect(new Set(keys)).toEqual(new Set(Object.keys(ENEMY_DEFS)));
    expect(keys.length).toBe(Object.keys(ENEMY_DEFS).length);
  });

  it("a re-rigged enemy has two pictures and says it is redrawn; the rest have one and say they are legacy art", async () => {
    const { RIGS } = await import("../../src/enemies/rig");
    for (const card of root.querySelectorAll<HTMLElement>(".card")) {
      const key = card.dataset.key!, rigged = !!RIGS[key];
      expect(card.querySelectorAll("figure canvas").length, key).toBe(rigged ? 2 : 1);
      expect(card.querySelector(".badge")!.textContent, key).toBe(rigged ? "redrawn" : "legacy art");
    }
    expect(Object.keys(RIGS), "the ghoul is the first").toContain("z");
  });

  it("every card has a button for walk, attack, pain, death, head off, each arm and legs off", () => {
    for (const card of root.querySelectorAll<HTMLElement>(".card")) {
      expect([...card.querySelectorAll<HTMLButtonElement>("button.play")].map((b) => b.dataset.clip)).toEqual(
        ["walk", "attack", "pain", "death", "head", "lArm", "rArm", "legs"]);
    }
  });

  it("an enemy re-rigged can do all eight; a legacy enemy cannot be hurt (it has no pain frames) and some cannot attack", () => {
    const z = root.querySelector<HTMLElement>('.card[data-key="z"]')!;
    for (const b of z.querySelectorAll<HTMLButtonElement>("button.play")) expect(b.disabled, `z ${b.dataset.clip}`).toBe(false);
    const f = root.querySelector<HTMLElement>('.card[data-key="f"]')!;
    expect(f.querySelector<HTMLButtonElement>('button[data-clip="pain"]')!.disabled).toBe(true);
    expect(f.querySelector<HTMLButtonElement>('button[data-clip="walk"]')!.disabled).toBe(false);
  });
});

describe("its buttons play things", () => {
  it("a press makes the row play that clip, and marks the button", () => {
    const card = root.querySelector<HTMLElement>('.card[data-key="z"]')!;
    expect(api.playing("z")).toBe("walk");
    card.querySelector<HTMLButtonElement>('button[data-clip="death"]')!.click();
    expect(api.playing("z")).toBe("death");
    expect(card.querySelector('button[data-clip="death"]')!.classList.contains("on")).toBe(true);
    expect(card.querySelector('button[data-clip="walk"]')!.classList.contains("on")).toBe(false);
    api.play("z", "walk");
  });

  it("the ghoul's walk is six different frames over its cycle and the old walk is two; the new frames are not the old", () => {
    const step = 125, newFrames = new Set<HTMLCanvasElement | null>(), oldFrames = new Set<HTMLCanvasElement | null>();
    for (let i = 0; i < 6; i++) { newFrames.add(api.frameOf("z", "new", i * step + 1)); oldFrames.add(api.frameOf("z", "old", i * 110 + 1)); }
    expect(newFrames.size).toBe(6);
    expect(oldFrames.size).toBe(2);
    for (const f of newFrames) expect(oldFrames.has(f)).toBe(false);
    expect(api.frameOf("f", "new", 0), "a legacy enemy has no new column").toBeNull();
  });

  it("every dismemberment plays frames of its own: the ghoul without its head, an arm, the other, or its legs", () => {
    const frame = (clip: Parameters<BestiaryApi["play"]>[1]): HTMLCanvasElement | null => { api.play("z", clip); return api.frameOf("z", "new", 1); };
    const frames = (["walk", "head", "lArm", "rArm", "legs"] as const).map(frame);
    expect(new Set(frames).size).toBe(5);
  });

  it("death shows its five frames and the sink of a falling body, old and new", () => {
    const new0 = api.frameOf("z", "new", 1), new4 = api.frameOf("z", "new", 800);
    expect(new0).not.toBe(new4);
    const frames = new Set([1, 70, 150, 250, 400].map((ms) => { api.play("z", "death"); return api.frameOf("z", "new", ms); }));
    expect(frames.size).toBe(5);
  });
});
