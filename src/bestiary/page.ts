import { CLIP_LABEL, CLIP_NAMES, bestiary, frameAt, type ClipName, type Clip, type Entry, type Side } from "./roster";

/**
 * THE BESTIARY PAGE — `bestiary.html`. Built for the project owner, who judges
 * the monsters by eye: one row for every enemy in the game, its art animated,
 * and for an enemy that has been re-rigged the old art and the new side by
 * side, with a button for each thing it can do — walk, attack, pain, death,
 * and each dismemberment — that plays it on both. The enemies not yet
 * re-rigged show their legacy art alone and say so. Below each, the parts
 * that fly off it (its head, its arms, its legs), old and new.
 *
 * It plays the art the game plays, with the game's own frame times and the
 * sink of a falling body (`./roster.ts`), and it is never imported by the
 * game: nothing outside `src/bestiary/` names it, and it is built by its own
 * Vite config into `dist/bestiary.html` beside the game
 * (`vite.bestiary.config.ts`), the way the sound board is.
 *
 * `window.bestiary` is for whoever works on a monster next (and for the tests):
 * `play(key, clip)`, `frameOf(key, side, ms)`.
 */

export interface BestiaryApi {
  entries: readonly Entry[];
  /** Plays `clip` on every column of the enemy's row. */
  play(key: string, clip: ClipName): void;
  /** The clip a row is playing now. */
  playing(key: string): ClipName;
  /** The frame (as a canvas) the row's `side` shows `ms` into its current clip, or null if that side has no such clip. */
  frameOf(key: string, side: Side, ms: number): HTMLCanvasElement | null;
  setSpeed(factor: number): void;
  /** Stops the animation loop (the tests'). */
  stop(): void;
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Pixels a metre of sprite is drawn at on the page. */
const PX_PER_M = 120;

interface Stage { side: Side; canvas: HTMLCanvasElement; note: HTMLElement }
interface Row { entry: Entry; clip: ClipName; t0: number; stages: Stage[]; buttons: Map<ClipName, HTMLButtonElement>; last: Map<Side, string> }

export function mountBestiary(root: HTMLElement): BestiaryApi {
  root.textContent = "";
  const entries = bestiary();
  let speed = 0.5, running = true;

  const head = make("header");
  head.append(make("h1", undefined, "THE BLACK SILENCE — bestiary"));
  head.append(make("p", "lede",
    "Every enemy in the game, animated. Where an enemy has been redrawn the old art is on the left and the new on the right; " +
    "the buttons play the same thing on both. An enemy with only one picture has not been redrawn yet."));
  const controls = make("div", "controls");
  const speedPick = make("select", "speed");
  speedPick.setAttribute("aria-label", "Speed");
  speedPick.append(new Option("Half speed", "0.5"), new Option("Full speed (as in the game)", "1"), new Option("Quarter speed", "0.25"));
  controls.append(speedPick);
  head.append(controls);
  root.append(head);

  const rows = new Map<string, Row>();
  const list = make("div", "rows");
  for (const entry of entries) {
    const rig = entry.rigged;
    const card = make("section", "card");
    card.dataset.key = entry.key;
    const title = make("h2", undefined, entry.name);
    title.append(make("span", "key", ` (${entry.key})`));
    title.append(make("span", rig ? "badge new" : "badge", rig ? "redrawn" : "legacy art"));
    card.append(title);
    const stages: Stage[] = [];
    const view = make("div", "view");
    for (const side of ["old", "new"] as const) {
      if (side === "new" && !rig) continue;
      const col = make("figure", "col");
      const canvas = make("canvas");
      canvas.width = Math.round(entry.def.w * PX_PER_M); canvas.height = Math.round(entry.def.h * PX_PER_M);
      canvas.setAttribute("aria-label", `${entry.name}, ${side === "old" ? "old art" : "new art"}`);
      const note = make("figcaption", undefined, rig ? (side === "old" ? "old" : "new") : "");
      col.append(canvas, note);
      view.append(col);
      stages.push({ side, canvas, note });
    }
    card.append(view);
    const bar = make("div", "buttons");
    const buttons = new Map<ClipName, HTMLButtonElement>();
    const row: Row = { entry, clip: "walk", t0: performance.now(), stages, buttons, last: new Map() };
    for (const name of CLIP_NAMES) {
      const b = make("button", "play", CLIP_LABEL[name]);
      b.type = "button";
      b.dataset.clip = name;
      const has = entry.clips("old")[name] || (rig && entry.clips("new")[name]);
      if (!has) { b.disabled = true; b.setAttribute("title", "this enemy's art has no such frames"); }
      b.addEventListener("click", () => play(entry.key, name));
      bar.append(b);
      buttons.set(name, b);
    }
    card.append(bar);
    // the parts that fly off it
    const parts = make("div", "parts");
    for (const side of ["old", "new"] as const) {
      const ps = entry.parts(side);
      if (!ps.length) continue;
      const group = make("div", "partgroup");
      group.append(make("span", "partlabel", rig ? `flying parts, ${side}` : "flying parts"));
      for (const p of ps) { const c = make("canvas", "part"); c.width = p.canvas.width; c.height = p.canvas.height; c.setAttribute("title", p.kind); c.getContext("2d")?.drawImage(p.canvas, 0, 0); group.append(c); }
      parts.append(group);
    }
    card.append(parts);
    list.append(card);
    rows.set(entry.key, row);
    markActive(row);
  }
  root.append(list);

  function markActive(row: Row): void { for (const [n, b] of row.buttons) b.classList.toggle("on", n === row.clip); }
  function play(key: string, clip: ClipName): void {
    const row = rows.get(key);
    if (!row) throw new Error(`no enemy ${key} in the bestiary`);
    row.clip = clip; row.t0 = performance.now(); markActive(row);
  }
  function clipOn(row: Row, side: Side): Clip | null { return row.entry.clips(side)[row.clip] ?? null; }

  function draw(row: Row, now: number): void {
    const ms = ((now - row.t0) * speed);
    for (const st of row.stages) {
      const clip = clipOn(row, st.side), c = st.canvas, g = c.getContext("2d");
      if (!g) continue;
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = "#1b1a1e"; g.fillRect(0, c.height - 3, c.width, 3);   // the floor
      if (!clip) { st.note.textContent = `${st.side === "old" ? "old" : "new"}: nothing for “${CLIP_LABEL[row.clip]}”`; continue; }
      st.note.textContent = row.entry.rigged ? st.side : "";
      const f = frameAt(clip, ms);
      g.imageSmoothingEnabled = false;
      g.save();
      const sink = clip.sink ? clip.sink(f.ms) : 0, tilt = clip.tilt ? clip.tilt(f.ms) : 0;
      g.translate(c.width / 2, c.height / 2 + sink * c.height);
      if (tilt) g.rotate(tilt);
      g.drawImage(f.canvas, -c.width / 2, -c.height / 2, c.width, c.height);
      g.restore();
    }
  }

  const tick = (now: number): void => {
    if (!running) return;
    for (const row of rows.values()) draw(row, now);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  speedPick.addEventListener("change", () => { speed = Number(speedPick.value); });

  return {
    entries,
    play,
    playing: (key) => rows.get(key)!.clip,
    frameOf: (key, side, ms) => { const c = clipOn(rows.get(key)!, side); return c ? frameAt(c, ms).canvas : null; },
    setSpeed: (f) => { speed = f; },
    stop: () => { running = false; },
  };
}
