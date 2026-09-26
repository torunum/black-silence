import { audioInit, ctx, isReady } from "../audio/AudioEngine";
import { CATEGORIES, SOUND_ROWS, type SoundRow, type SoundVersion } from "./registry";
import { renderOffline, type Rendered } from "./offline";

/**
 * THE SOUND BOARD PAGE — `soundboard.html`. Built for the project owner, who
 * judges the game's sound by ear and is not a programmer, so it is one page
 * of plain rows: a name, a line saying when the game plays it, and a play
 * button. Player feedback round 2, Task 1.
 *
 * Browsers refuse to make sound until the person clicks something, so
 * nothing is built until the first click — "Turn sound on", or any play
 * button, which turns sound on and plays in the same click.
 *
 * The page also puts a small `soundboard` object on `window` for whoever
 * works on a sound next: `soundboard.play(id)`, and `await
 * soundboard.render(id)` to render it offline and read its level (see
 * `./offline.ts`).
 */

export interface SoundboardApi {
  rows: readonly SoundRow[];
  play(id: string, label?: SoundVersion["label"]): void;
  render(id: string, seconds?: number, label?: SoundVersion["label"]): Promise<Rendered>;
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

const BUTTON_TEXT: Record<SoundVersion["label"], string> = { current: "▶ Play", old: "▶ Old", new: "▶ New" };

export function mountSoundboard(root: HTMLElement): SoundboardApi {
  root.textContent = "";

  const head = make("header");
  head.append(make("h1", undefined, "THE BLACK SILENCE — sound board"));
  head.append(make("p", "lede",
    "Every sound in the game, by name. Press ▶ to hear one. This page plays the game's own sound code, " +
    "so what you hear here is exactly what the game plays."));
  const controls = make("div", "controls");
  const power = make("button", "power", "Turn sound on");
  power.type = "button";
  const droneLabel = make("label", "drone");
  const drone = make("input");
  drone.type = "checkbox";
  droneLabel.append(drone, document.createTextNode(" Play the game's background drone underneath"));
  const search = make("input", "search");
  search.type = "search";
  search.placeholder = "Find a sound — try \"shotgun\" or \"door\"";
  search.setAttribute("aria-label", "Find a sound");
  controls.append(power, droneLabel, search);
  head.append(controls);
  head.append(make("p", "hint",
    "Sound starts on your first click — browsers do not allow a page to make noise before that. " +
    "Where a sound has been redesigned, its row has two buttons: Old and New."));
  root.append(head);

  let live: BaseAudioContext | null = null;
  function soundOn(): void {
    if (isReady() && live) return;
    audioInit({ drones: drone.checked });
    live = ctx();
    power.textContent = "Sound is on";
    power.disabled = true;
    drone.disabled = true;
    // A context created in a click handler normally starts running; resume in case it did not.
    const running = live as AudioContext;
    if (typeof running.resume === "function") void running.resume();
  }
  power.addEventListener("click", soundOn);

  function versionOf(id: string, label?: SoundVersion["label"]): SoundVersion {
    const row = SOUND_ROWS.find((r) => r.id === id);
    if (!row) throw new Error(`no sound with id ${id}`);
    const v = label ? row.versions.find((x) => x.label === label) : row.versions[row.versions.length - 1];
    if (!v) throw new Error(`${id} has no "${label}" version`);
    return v;
  }

  const rowEls: Array<{ row: SoundRow; li: HTMLLIElement }> = [];
  const sections: Array<{ section: HTMLElement; items: HTMLLIElement[] }> = [];
  for (const category of CATEGORIES) {
    const rows = SOUND_ROWS.filter((r) => r.category === category);
    const section = make("section", "category");
    section.dataset.category = category;
    section.append(make("h2", undefined, `${category} (${rows.length})`));
    const list = make("ul", "rows");
    const items: HTMLLIElement[] = [];
    for (const row of rows) {
      const li = make("li", "row");
      li.dataset.id = row.id;
      const text = make("div", "text");
      text.append(make("span", "name", row.name));
      if (row.detail) text.append(make("span", "detail", row.detail));
      const buttons = make("div", "buttons");
      for (const v of row.versions) {
        const b = make("button", `play ${v.label}`, BUTTON_TEXT[v.label]);
        b.type = "button";
        b.setAttribute("aria-label", `${BUTTON_TEXT[v.label].slice(2)}: ${row.name}`);
        b.addEventListener("click", () => {
          soundOn();
          v.play();
          li.classList.remove("flash");
          void li.offsetWidth; // restart the highlight
          li.classList.add("flash");
        });
        buttons.append(b);
      }
      li.append(text, buttons);
      list.append(li);
      items.push(li);
      rowEls.push({ row, li });
    }
    section.append(list);
    root.append(section);
    sections.push({ section, items });
  }

  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    for (const { row, li } of rowEls) {
      li.hidden = q !== "" && !`${row.name} ${row.detail ?? ""} ${row.category}`.toLowerCase().includes(q);
    }
    for (const { section, items } of sections) section.hidden = items.every((li) => li.hidden);
  });

  const api: SoundboardApi = {
    rows: SOUND_ROWS,
    play(id, label) { soundOn(); versionOf(id, label).play(); },
    async render(id, seconds = 2, label) {
      const v = versionOf(id, label);
      try {
        return await renderOffline(v.play, seconds);
      } finally {
        // Back to the speakers. The drone, if it was on, never stopped: it
        // lives on the first graph, which is still connected.
        if (live) audioInit({ context: live, drones: false });
      }
    },
  };
  return api;
}
