import { world } from "../world/WorldState";
import { CELL } from "../world/Grid";
import { player } from "../player/PlayerState";
import { input } from "../player/Input";
import { doors as placedDoors } from "../world/ExitDoor";

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
 * The record is per level: a new grid (a load, a restart, a rise at a shrine) starts it blank. It draws nothing and
 * casts nothing while the game has not started or the player is dead, and does nothing at all without a 2D context
 * (the test harness's stubs). Nothing here draws from `Math.random`: the trace fixtures are seeded.
 */

const SOLID = "#IW";
const VIEW_CELLS = 13;      // cells from the centre of the corner map to its rim
const RAYS = 72, REACH = 11; // the reveal fan: rays, and how many cells each may travel
const CAST_EVERY = 0.1;     // seconds between fans

interface Canvases { mini: HTMLCanvasElement; auto: HTMLCanvasElement; mg: CanvasRenderingContext2D; ag: CanvasRenderingContext2D }

const state = {
  grid: null as string[][] | null,
  seen: new Uint8Array(0),
  W: 0, H: 0,
  castT: 0,
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
}

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

/* ---------------------------------------------------------------- drawing */

const COL = {
  back: "rgba(8,6,6,0.72)",
  floor: "#2b2520",
  raised: "#3b3228",
  wall: "#9c8a62",
  door: "#b06a2a",
  locked: "#c42a1c",
  key: "#ff3a28",
  exitShut: "#5a6a52",
  exitOpen: "#6af05a",
  player: "#f2e6c8",
  rim: "#5a4a32",
  north: "#c42a1c",
};

/** The colour a seen cell is drawn in, or null for nothing (open floor beyond the walls is never seen). */
function cellColour(gx: number, gz: number): string | null {
  const ch = world.grid[gz]?.[gx];
  if (ch === undefined) return null;
  if (SOLID.includes(ch)) return COL.wall;
  if (ch === "S") { const d = world.doors[gx + "," + gz]; return d && d.open ? COL.floor : COL.wall; }
  if (ch === "+" || ch === "D") {
    const d = world.doors[gx + "," + gz];
    if (d && d.open) return COL.floor;
    return ch === "D" ? COL.locked : COL.door;
  }
  const h = world.heightMap?.[gz]?.[gx];
  return h ? COL.raised : COL.floor;
}

/** Draws the seen part of the level in grid units (one cell = 1 x 1), with `clip` limiting the cells walked. */
function drawCells(g: CanvasRenderingContext2D, x0: number, z0: number, x1: number, z1: number): void {
  const W = state.W;
  let last = "";
  for (let gz = Math.max(0, z0); gz <= Math.min(state.H - 1, z1); gz++) {
    for (let gx = Math.max(0, x0); gx <= Math.min(W - 1, x1); gx++) {
      if (!state.seen[gz * W + gx]) continue;
      const c = cellColour(gx, gz); if (!c) continue;
      if (c !== last) { g.fillStyle = c; last = c; }
      g.fillRect(gx - 0.02, gz - 0.02, 1.04, 1.04);
    }
  }
}

/** The things worth finding: the key where it still lies, the exit door. In grid units. */
function drawMarks(g: CanvasRenderingContext2D, scale: number, t: number): void {
  const pulse = 0.65 + 0.35 * Math.sin(t * 6);
  for (const it of world.items as Array<{ kind?: string; x: number; z: number; taken?: boolean }>) {
    if (it.kind !== "key" || it.taken) continue;
    const gx = Math.floor(it.x / CELL), gz = Math.floor(it.z / CELL);
    if (!seenCell(gx, gz)) continue;
    g.globalAlpha = pulse; g.fillStyle = COL.key;
    const r = Math.max(0.45, 3 / scale);
    g.fillRect(it.x / CELL - r, it.z / CELL - r, r * 2, r * 2);
    g.globalAlpha = 1;
  }
  const ex = placedDoors.exit;
  if (ex) {
    const gx = Math.floor((ex.x - ex.nx * 0.5) / CELL), gz = Math.floor((ex.z - ex.nz * 0.5) / CELL);
    const fx = Math.floor((ex.x + ex.nx * 0.5) / CELL), fz = Math.floor((ex.z + ex.nz * 0.5) / CELL);
    if (seenCell(gx, gz) || seenCell(fx, fz)) {
      const r = Math.max(0.6, 4 / scale);
      g.fillStyle = ex.lit ? COL.exitOpen : COL.exitShut;
      if (ex.lit) g.globalAlpha = pulse;
      g.fillRect(ex.x / CELL - r, ex.z / CELL - r, r * 2, r * 2);
      g.globalAlpha = 1;
    }
  }
}

/** The player's arrow, pointing up, centred on the origin, `s` canvas pixels long. */
function arrow(g: CanvasRenderingContext2D, s: number): void {
  g.fillStyle = "#000";
  g.beginPath(); g.moveTo(0, -s * 0.62 + 1); g.lineTo(s * 0.46 + 1, s * 0.5 + 1); g.lineTo(1, s * 0.22 + 1); g.lineTo(-s * 0.46 + 1, s * 0.5 + 1); g.closePath(); g.fill();
  g.fillStyle = COL.player;
  g.beginPath(); g.moveTo(0, -s * 0.62); g.lineTo(s * 0.46, s * 0.5); g.lineTo(0, s * 0.22); g.lineTo(-s * 0.46, s * 0.5); g.closePath(); g.fill();
}

function fitCanvas(c: HTMLCanvasElement): number {
  const dpr = Math.min(2, (typeof devicePixelRatio === "number" && devicePixelRatio) || 1);
  const w = Math.round((c.clientWidth || 160) * dpr), h = Math.round((c.clientHeight || 160) * dpr);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return dpr;
}

function drawMini(cv: Canvases, t: number): void {
  const c = cv.mini, g = cv.mg;
  fitCanvas(c);
  const S = c.width, R = S / 2, scale = R / VIEW_CELLS;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, S, S);
  g.save();
  g.beginPath(); g.arc(R, R, R - 2, 0, Math.PI * 2); g.clip();
  g.fillStyle = COL.back; g.fillRect(0, 0, S, S);
  const px = player.px / CELL, pz = player.pz / CELL;
  // heading-up: the facing (-sin yaw, -cos yaw) in (x, z) is turned onto the screen's up by a rotation of `yaw`
  g.translate(R, R); g.rotate(input.yaw); g.scale(scale, scale); g.translate(-px, -pz);
  const n = VIEW_CELLS + 2;
  drawCells(g, Math.floor(px - n), Math.floor(pz - n), Math.ceil(px + n), Math.ceil(pz + n));
  drawMarks(g, scale, t);
  g.restore();
  // the rim, the north tick on it (north is -z: up on the automap), and the arrow
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = COL.rim; g.lineWidth = Math.max(2, S / 70);
  g.beginPath(); g.arc(R, R, R - 2, 0, Math.PI * 2); g.stroke();
  const na = -Math.PI / 2 + input.yaw;   // where world north lands once the map is turned by yaw
  const nx = R + Math.cos(na) * (R - S * 0.075), ny = R + Math.sin(na) * (R - S * 0.075);
  g.fillStyle = COL.north; g.font = `bold ${Math.round(S * 0.1)}px "Courier New",monospace`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("N", nx, ny);
  g.translate(R, R); arrow(g, S * 0.085);
  g.setTransform(1, 0, 0, 1, 0, 0);
}

function drawAuto(cv: Canvases, t: number): void {
  const c = cv.auto, g = cv.ag;
  fitCanvas(c);
  const Wp = c.width, Hp = c.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, Wp, Hp);
  g.fillStyle = "rgba(4,3,3,0.9)"; g.fillRect(0, 0, Wp, Hp);
  const pad = Math.min(Wp, Hp) * 0.06;
  const scale = Math.min((Wp - pad * 2) / Math.max(1, state.W), (Hp - pad * 2) / Math.max(1, state.H));
  const ox = (Wp - state.W * scale) / 2, oz = (Hp - state.H * scale) / 2;
  g.save();
  g.translate(ox, oz); g.scale(scale, scale);
  drawCells(g, 0, 0, state.W - 1, state.H - 1);
  drawMarks(g, scale, t);
  g.restore();
  // the player
  g.save();
  g.translate(ox + player.px / CELL * scale, oz + player.pz / CELL * scale);
  g.rotate(-input.yaw);   // north-up: the arrow turns to the facing (up is -z, the facing at yaw 0)
  arrow(g, Math.max(10, scale * 1.4));
  g.restore();
  g.fillStyle = COL.wall; g.font = `${Math.round(Math.max(12, Hp * 0.022))}px "Courier New",monospace`;
  g.textAlign = "center"; g.textBaseline = "top";
  g.fillText("MAP — M / TAB TO CLOSE", Wp / 2, pad * 0.35);
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
  if (state.castT <= 0) { state.castT = CAST_EVERY; revealAround(player.px, player.pz); }
  cv.mini.style.display = "block";
  drawMini(cv, t);
  const up = state.open || state.tabHeld;
  cv.auto.style.display = up ? "block" : "none";
  if (up) drawAuto(cv, t);
}

/** Whether the automap is up (for tests). */
export function automapOpen(): boolean { return state.open || state.tabHeld; }

addEventListener("keydown", (e) => {
  if (e.code === "KeyM" && !e.repeat) state.open = !state.open;
  if (e.code === "Tab") { state.tabHeld = true; e.preventDefault?.(); }
});
addEventListener("keyup", (e) => { if (e.code === "Tab") state.tabHeld = false; });
addEventListener("blur", () => { state.tabHeld = false; });
