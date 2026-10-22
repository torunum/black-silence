import { world } from "../world/WorldState";
import { CELL } from "../world/Grid";
import { player } from "../player/PlayerState";
import { drawAuto, drawMini, type Canvases } from "./MinimapDraw";

/**
 * THE MINIMAP (owner, 2026-10-20: "mini map önemli. yönümüzü bulamıyoruz").
 *
 * Two views of the same record of where the player has been:
 *
 * - **the corner map**, top left: a round window on the cells around the player, turned so that the way the player
 *   faces is always up (the arrow in the middle never turns; the world turns under it), with a north tick on its rim
 *   so the compass is never lost;
 * - **the automap** (`M`, or held `Tab`): the whole explored level, north up, over the game, with the player's arrow
 *   in it, as Doom's is.
 *
 * Only what the player has *seen* is drawn: every tenth of a second a fan of rays is cast through the grid from the
 * player, and each cell a ray reaches is marked explored — the walls and closed doors that stop them included, so the
 * map is drawn from its edges in. A secret door is drawn as the wall it pretends to be until it is opened. The key is
 * marked where it lies, once seen, until it is taken; the exit door once seen, dim while sealed and green once it opens.
 *
 * How it is drawn — walls as lines, doors as bars, the things worth finding by what they are, the trail of where the
 * player has walked — is `./MinimapDraw.ts`.
 *
 * The record is per level: a new grid (a load, a restart, a rise at a shrine) starts it blank. It draws nothing and
 * casts nothing while the game has not started or the player is dead, and does nothing at all without a 2D context
 * (the test harness's stubs). Nothing here draws from `Math.random`: the trace fixtures are seeded.
 */

const SOLID = "#IW";
const RAYS = 72, REACH = 11; // the reveal fan: rays, and how many cells each may travel
const CAST_EVERY = 0.1;     // seconds between fans

const TRAIL_STEP = 0.6, TRAIL_MAX = 400;   // the breadcrumbs: a dot every this many cells walked, and how many are kept

const state = {
  grid: null as string[][] | null,
  seen: new Uint8Array(0),
  W: 0, H: 0,
  castT: 0,
  /** Where the player has walked on this level, in cells: x, z pairs, oldest first. */
  trail: [] as number[],
  /** The automap is up: toggled by `M`, or held with `Tab`. */
  open: false,
  tabHeld: false,
  cv: undefined as Canvases | null | undefined,
};

function canvases(): Canvases | null {
  if (state.cv !== undefined) return state.cv;
  const mini = document.getElementById("minimap") as HTMLCanvasElement | null;
  const auto = document.getElementById("automap") as HTMLCanvasElement | null;
  const mg = mini?.getContext?.("2d") as CanvasRenderingContext2D | null | undefined;
  const ag = auto?.getContext?.("2d") as CanvasRenderingContext2D | null | undefined;
  state.cv = mini && auto && mg && ag && typeof mg.fillRect === "function" ? { mini, auto, mg, ag } : null;
  return state.cv;
}

/** Starts a new record when the level's grid changes (a load builds a new one). */
function syncLevel(): void {
  if (state.grid === world.grid && state.W === world.GW && state.H === world.GH) return;
  state.grid = world.grid; state.W = world.GW; state.H = world.GH;
  state.seen = new Uint8Array(Math.max(0, state.W * state.H));
  state.castT = 0;
  state.trail = [];
}

/** Drops a breadcrumb where the player stands once they are `TRAIL_STEP` cells from the last. */
function walkTrail(): void {
  const x = player.px / CELL, z = player.pz / CELL, t = state.trail, n = t.length;
  if (n && Math.hypot(x - t[n - 2], z - t[n - 1]) < TRAIL_STEP) return;
  t.push(x, z);
  if (t.length > TRAIL_MAX * 2) t.splice(0, 2);
}
/** The breadcrumbs on this level (for tests): x, z pairs in cells. */
export function trailOf(): readonly number[] { return state.trail; }

/** Forgets the level's record: the next tick starts it again. */
export function resetMinimap(): void { state.grid = null; }

/** Is this cell something a ray stops at: a wall, a pillar, a window, a closed door? */
function blocks(gx: number, gz: number): boolean {
  const row = world.grid[gz]; if (!row) return true;
  const ch = row[gx]; if (ch === undefined) return true;
  if (SOLID.includes(ch)) return true;
  if (ch === "+" || ch === "D" || ch === "S") { const d = world.doors[gx + "," + gz]; return !d || !d.open; }
  return false;
}

/** Marks every cell the player can see from where they stand (a fan of rays through the grid). */
export function revealAround(px: number, pz: number): void {
  syncLevel();
  const W = state.W, H = state.H; if (!W || !H) return;
  const gx0 = px / CELL, gz0 = pz / CELL;
  const cx = Math.floor(gx0), cz = Math.floor(gz0);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) mark(cx + dx, cz + dz);   // where you stand, and what you touch
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2, sx = Math.cos(a) * 0.25, sz = Math.sin(a) * 0.25;
    let x = gx0, z = gz0;
    for (let s = 0; s < REACH * 4; s++) {
      x += sx; z += sz;
      const gx = Math.floor(x), gz = Math.floor(z);
      if (gx < 0 || gz < 0 || gx >= W || gz >= H) break;
      mark(gx, gz);
      if (blocks(gx, gz)) break;
    }
  }
}
function mark(gx: number, gz: number): void {
  if (gx < 0 || gz < 0 || gx >= state.W || gz >= state.H) return;
  state.seen[gz * state.W + gx] = 1;
}

/** Has the player seen this cell (for tests and the automap)? */
export function seenCell(gx: number, gz: number): boolean {
  syncLevel();
  return gx >= 0 && gz >= 0 && gx < state.W && gz < state.H && state.seen[gz * state.W + gx] === 1;
}
/** How many cells of this level the player has seen. */
export function seenCount(): number {
  syncLevel();
  let n = 0; for (const v of state.seen) n += v; return n;
}

/**
 * Once a frame, from `src/core/Loop.ts`: reveals what the player sees (every `CAST_EVERY` seconds), then draws the
 * corner map and, when it is up, the automap. `visible` is false before the game starts, while dead, behind an
 * overlay: then both are hidden and nothing is cast.
 */
export function minimapTick(dt: number, t: number, visible: boolean): void {
  const cv = canvases();
  if (!cv) return;
  if (!visible || !world.GW) {
    cv.mini.style.display = "none"; cv.auto.style.display = "none";
    return;
  }
  syncLevel();
  state.castT -= dt;
  if (state.castT <= 0) { state.castT = CAST_EVERY; revealAround(player.px, player.pz); walkTrail(); }
  cv.mini.style.display = "block";
  drawMini(cv, state, t);
  const up = state.open || state.tabHeld;
  cv.auto.style.display = up ? "block" : "none";
  if (up) drawAuto(cv, state, t);
}

/** Whether the automap is up (for tests). */
export function automapOpen(): boolean { return state.open || state.tabHeld; }

addEventListener("keydown", (e) => {
  if (e.code === "KeyM" && !e.repeat) state.open = !state.open;
  if (e.code === "Tab") { state.tabHeld = true; e.preventDefault?.(); }
});
addEventListener("keyup", (e) => { if (e.code === "Tab") state.tabHeld = false; });
addEventListener("blur", () => { state.tabHeld = false; });
