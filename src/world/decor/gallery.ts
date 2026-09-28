import { LEVELS, type LevelDef } from "../levels/index";
import type { BuiltLevel } from "../LevelBuilder";
import type { Theme } from "./kit";
import { Decorator } from "./place";
import { PIECES, VOCAB } from "./registry";

/**
 * THE GALLERY — every piece of a theme's vocabulary standing in a lit hall,
 * for looking at (levels-feel-full plan, Task 1). Not a level of the game
 * and reachable from nothing in it: from the dev server's console,
 *
 *     const { LEVELS } = await import("/src/world/levels/index.ts");
 *     const { galleryDef } = await import("/src/world/decor/gallery.ts");
 *     LEVELS[8] = galleryDef("dungeon");
 *     (await import("/src/world/LevelLoader.ts")).loadLevel(8);
 *
 * The hall wears the look of its theme's own level (fog, light, floor, walls)
 * and shows pieces in four rows so each reads against what it will really
 * stand against: `edge` and `wall` pieces along the north wall, `free` ones
 * in the middle of the floor, `flat` ones on it, `hang` ones from the
 * ceiling. `tests/world/decorKit.test.ts` builds every hall, validates it
 * with the placement rules and checks every kind of every vocabulary is here
 * — so a piece added to a vocabulary without being shown fails a test.
 * (The prologue's `solid` pieces — headstones, crosses, tombs, trees — are
 * not: they need a buried `I` cell under them, and the prologue is where
 * they are seen.)
 */
const STEP = 3;

export function buildGallery(theme: Theme): BuiltLevel {
  const kinds = [...new Set(VOCAB[theme].map((v) => v.k))];
  const rows: Record<"wall" | "free" | "flat" | "hang", string[]> = { wall: [], free: [], flat: [], hang: [] };
  for (const k of kinds) {
    const m = PIECES[k].mode;
    rows[m === "edge" || m === "wall" ? "wall" : m === "free" ? "free" : m === "flat" ? "flat" : "hang"].push(k);
  }
  const cols = Math.max(...Object.values(rows).map((r) => r.length), 3);
  const W = cols * STEP + 3, H = 13;
  const g: string[][] = Array.from({ length: H }, (_, z) => Array.from({ length: W }, (_, x): string => (z === 0 || z === H - 1 || x === 0 || x === W - 1 ? "#" : ".")));
  g[H - 2][1] = "P";
  for (let x = 3; x < W - 2; x += 2 * STEP) { g[3][x] = "i"; g[H - 3][x] = "i"; }   // torches to see by
  const dress = new Decorator({ g, W, H }, theme);
  const at = (i: number) => 2 + i * STEP;
  rows.wall.forEach((k, i) => dress.place(k, at(i), 1));
  rows.free.forEach((k, i) => dress.place(k, at(i), 5));
  rows.flat.forEach((k, i) => dress.place(k, at(i), 7));
  rows.hang.forEach((k, i) => dress.place(k, at(i), 9));
  return { g, W, H, decor: dress.specs };
}

/** A level table entry for a theme's gallery, in the look of the game's own level of that theme. */
export function galleryDef(theme: Theme): LevelDef {
  const own = LEVELS.find((l) => l.sub === theme);
  if (!own) throw new Error("gallery: no level wears the look " + theme);
  return { ...own, name: "GALLERY — " + theme.toUpperCase(), build: () => buildGallery(theme) };
}
