import { world } from "../world/WorldState";
import { CELL } from "../world/Grid";
import { player } from "../player/PlayerState";
import { input } from "../player/Input";
import { doors as placedDoors } from "../world/ExitDoor";
import { S } from "../core/State";
import { titleOf } from "../world/levels/index";

/**
 * How the minimap and the automap are drawn (owner, 2026-10-21: "minimap i de geliştir. daha güzel olsun") — the record of
 * what was seen is `./Minimap.ts`'s; this only paints it.
 *
 * Drawn as Doom draws its automap, in lines: a seen floor is a dark fill, and where it meets a wall the wall is a bright
 * bone-gold line along that edge, with a soft glow under it, so the rooms read by their outlines; a window is a cold blue
 * line, a pillar a small disc, a step between two heights a dim line. A closed door is a bar across its doorway, orange, a
 * locked one red; an open one is floor. The things worth finding are marked by what they are — a red cross for health, a
 * green diamond for armour, a gold square for ammunition, a white diamond for a weapon, a pulsing key, the seals in gold,
 * the exit door — once seen and until taken; and the player's own path is a trail of faint dots, so where they have not
 * been yet shows. The corner map is a brass-rimmed round window turned heading-up, ticked at the eight points with the
 * north in red, a cone of the player's view in front of the arrow; the automap is north-up, framed on what has been
 * explored, with the level's name, the kills and the secrets over it and a key to its marks under it.
 *
 * Nothing here draws from `Math.random`: the trace fixtures are seeded.
 */

export interface MapView { seen: Uint8Array; W: number; H: number; trail: number[] }
export interface Canvases { mini: HTMLCanvasElement; auto: HTMLCanvasElement; mg: CanvasRenderingContext2D; ag: CanvasRenderingContext2D }
type G = CanvasRenderingContext2D;

const VIEW_CELLS = 12;   // cells from the centre of the corner map to its rim

const COL = {
  back: "#0a0807",
  floor: "#231c17",
  raised: "#3a2e22",
  step: "#6e5a3c",
  wall: "#e2c890",
  glow: "rgba(226,200,144,0.16)",
  window: "#86a8c0",
  pillar: "#c8ae78",
  door: "#ee9036",
  locked: "#f03a2a",
  trail: "#f2e6c8",
  health: "#ee4a3a",
  armor: "#5ad47c",
  ammo: "#d8ae46",
  weapon: "#f6f4e6",
  seal: "#f4c840",
  key: "#ff3a28",
  exitShut: "#6a7a5e",
  exitOpen: "#6af05a",
  player: "#fff4d8",
  rim: "#8a7046",
  rimDark: "#120d09",
  north: "#f0402e",
  tick: "#a08858",
  text: "#d8c08a",
  dim: "#7a6c52",
};

/** 0 floor, 1 wall, 2 window, 3 pillar, 4 closed door, 5 closed locked door. A hidden door is a wall until it opens. */
function kindAt(gx: number, gz: number): number {
  const ch = world.grid[gz]?.[gx];
  if (ch === undefined || ch === "#") return 1;
  if (ch === "W") return 2;
  if (ch === "I") return 3;
  if (ch === "S" || ch === "+" || ch === "D") {
    const d = world.doors[gx + "," + gz] as { open?: boolean } | undefined;
    if (d && d.open) return 0;
    return ch === "S" ? 1 : ch === "D" ? 5 : 4;
  }
  return 0;
}
const heightAt = (gx: number, gz: number): number => world.heightMap?.[gz]?.[gx] ?? 0;

/** The seen part of the level between the cells (x0, z0) and (x1, z1), in grid units; `px` is canvas pixels per cell. */
function drawCells(g: G, v: MapView, x0: number, z0: number, x1: number, z1: number, px: number): void {
  const W = v.W, lo = Math.max(0, x0), hi = Math.min(W - 1, x1), top = Math.max(0, z0), bot = Math.min(v.H - 1, z1);
  const seen = (gx: number, gz: number): boolean => v.seen[gz * W + gx] === 1;
  const open: Array<[number, number]> = [];
  for (let gz = top; gz <= bot; gz++) for (let gx = lo; gx <= hi; gx++) if (seen(gx, gz) && kindAt(gx, gz) !== 1 && kindAt(gx, gz) !== 2) open.push([gx, gz]);
  // the floors, the raised ones lighter
  g.fillStyle = COL.floor;
  for (const [gx, gz] of open) if (!heightAt(gx, gz)) g.fillRect(gx - 0.01, gz - 0.01, 1.02, 1.02);
  g.fillStyle = COL.raised;
  for (const [gx, gz] of open) if (heightAt(gx, gz)) g.fillRect(gx - 0.01, gz - 0.01, 1.02, 1.02);
  const lw = (p: number): number => Math.max(p / px, 0.04);
  const edges = (pick: (k: number, gx: number, gz: number, nx: number, nz: number) => boolean): Path2D | null => {
    if (typeof Path2D !== "function") return null;
    const p = new Path2D();
    for (const [gx, gz] of open) {
      if (kindAt(gx, gz) === 3) continue;
      if (pick(kindAt(gx, gz - 1), gx, gz, gx, gz - 1)) { p.moveTo(gx, gz); p.lineTo(gx + 1, gz); }
      if (pick(kindAt(gx, gz + 1), gx, gz, gx, gz + 1)) { p.moveTo(gx, gz + 1); p.lineTo(gx + 1, gz + 1); }
      if (pick(kindAt(gx - 1, gz), gx, gz, gx - 1, gz)) { p.moveTo(gx, gz); p.lineTo(gx, gz + 1); }
      if (pick(kindAt(gx + 1, gz), gx, gz, gx + 1, gz)) { p.moveTo(gx + 1, gz); p.lineTo(gx + 1, gz + 1); }
    }
    return p;
  };
  g.lineCap = "square";
  // a step: two floors of different heights, drawn once from the lower side
  const steps = edges((k, gx, gz, nx, nz) => (k === 0 || k === 4 || k === 5) && heightAt(nx, nz) > heightAt(gx, gz));
  if (steps) { g.strokeStyle = COL.step; g.lineWidth = lw(1.2); g.stroke(steps); }
  const walls = edges((k) => k === 1), wins = edges((k) => k === 2);
  if (walls) {
    g.strokeStyle = COL.glow; g.lineWidth = lw(5); g.stroke(walls);
    g.strokeStyle = COL.wall; g.lineWidth = lw(1.8); g.stroke(walls);
  }
  if (wins) { g.strokeStyle = COL.window; g.lineWidth = lw(1.6); g.setLineDash?.([0.22, 0.12]); g.stroke(wins); g.setLineDash?.([]); }
  // pillars, and the doors as bars across their doorways
  for (const [gx, gz] of open) {
    const k = kindAt(gx, gz);
    if (k === 3) { g.fillStyle = COL.pillar; g.beginPath(); g.arc(gx + 0.5, gz + 0.5, 0.3, 0, Math.PI * 2); g.fill(); continue; }
    if (k !== 4 && k !== 5) continue;
    g.fillStyle = k === 5 ? COL.locked : COL.door;
    const sideways = kindAt(gx - 1, gz) === 1 || kindAt(gx + 1, gz) === 1;   // walls left and right: the way through runs north-south
    if (sideways) g.fillRect(gx - 0.05, gz + 0.36, 1.1, 0.28); else g.fillRect(gx + 0.36, gz - 0.05, 0.28, 1.1);
  }
}

function diamond(g: G, x: number, z: number, r: number): void { g.beginPath(); g.moveTo(x, z - r); g.lineTo(x + r, z); g.lineTo(x, z + r); g.lineTo(x - r, z); g.closePath(); g.fill(); }
function cross(g: G, x: number, z: number, r: number): void { const t = r * 0.38; g.fillRect(x - r, z - t, r * 2, t * 2); g.fillRect(x - t, z - r, t * 2, r * 2); }

/** The things worth finding, the trail of where the player has been. In grid units; `px` canvas pixels per cell. */
function drawMarks(g: G, v: MapView, px: number, t: number): void {
  const pulse = 0.6 + 0.4 * Math.sin(t * 6), seen = (gx: number, gz: number): boolean => gx >= 0 && gz >= 0 && gx < v.W && gz < v.H && v.seen[gz * v.W + gx] === 1;
  // the trail, older dots fainter
  const n = v.trail.length / 2, dot = Math.max(0.07, 1.1 / px);
  g.fillStyle = COL.trail;
  for (let i = 0; i < n; i++) { g.globalAlpha = 0.08 + 0.22 * (i / Math.max(1, n)); g.fillRect(v.trail[i * 2] - dot, v.trail[i * 2 + 1] - dot, dot * 2, dot * 2); }
  g.globalAlpha = 1;
  const r = Math.max(0.2, 2.6 / px);
  for (const it of world.items as Array<{ kind?: string; x: number; z: number; taken?: boolean }>) {
    if (it.taken || !it.kind || !seen(Math.floor(it.x / CELL), Math.floor(it.z / CELL))) continue;
    const x = it.x / CELL, z = it.z / CELL, k = it.kind;
    if (k === "key") {
      g.globalAlpha = pulse * 0.35; g.fillStyle = COL.key; g.beginPath(); g.arc(x, z, r * 2.4, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1; g.strokeStyle = COL.key; g.lineWidth = r * 0.5;
      g.beginPath(); g.arc(x - r * 0.6, z, r * 0.7, 0, Math.PI * 2); g.moveTo(x + 0.1 * r, z); g.lineTo(x + r * 1.6, z); g.moveTo(x + r * 1.2, z); g.lineTo(x + r * 1.2, z + r * 0.7); g.stroke();
    } else if (k === "health") { g.fillStyle = COL.health; cross(g, x, z, r); }
    else if (k === "armor") { g.fillStyle = COL.armor; diamond(g, x, z, r * 1.05); }
    else if (k[0] === "w" && k.length === 2) { g.fillStyle = COL.weapon; diamond(g, x, z, r * 1.25); g.fillStyle = COL.back; diamond(g, x, z, r * 0.45); }
    else if (k.startsWith("seal")) { g.globalAlpha = pulse; g.fillStyle = COL.seal; g.beginPath(); g.arc(x, z, r * 1.1, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    else { g.fillStyle = COL.ammo; g.fillRect(x - r * 0.6, z - r * 0.6, r * 1.2, r * 1.2); }
  }
  const ex = placedDoors.exit;
  if (ex) {
    const gx = Math.floor((ex.x - ex.nx * 0.5) / CELL), gz = Math.floor((ex.z - ex.nz * 0.5) / CELL);
    const fx = Math.floor((ex.x + ex.nx * 0.5) / CELL), fz = Math.floor((ex.z + ex.nz * 0.5) / CELL);
    if (seen(gx, gz) || seen(fx, fz)) {
      const x = ex.x / CELL, z = ex.z / CELL, s = Math.max(0.55, 4.5 / px), c = ex.lit ? COL.exitOpen : COL.exitShut;
      if (ex.lit) { g.globalAlpha = pulse * 0.35; g.fillStyle = c; g.beginPath(); g.arc(x, z, s * 2, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1; g.strokeStyle = c; g.lineWidth = s * 0.3; g.strokeRect(x - s, z - s, s * 2, s * 2);
      g.fillStyle = c; g.fillRect(x - s * 0.45, z - s * 0.45, s * 0.9, s * 0.9);
    }
  }
}

/** The player's arrow, pointing up, centred on the origin, `s` canvas pixels long. */
function arrow(g: G, s: number): void {
  const head = (dx: number, dy: number): void => { g.beginPath(); g.moveTo(dx, -s * 0.62 + dy); g.lineTo(s * 0.46 + dx, s * 0.5 + dy); g.lineTo(dx, s * 0.22 + dy); g.lineTo(-s * 0.46 + dx, s * 0.5 + dy); g.closePath(); g.fill(); };
  g.fillStyle = "#000"; head(1, 1.5);
  g.fillStyle = COL.player; head(0, 0);
}

/** The cone of the player's view, up from the origin. */
function cone(g: G, len: number): void {
  const a = 0.62, grad = g.createRadialGradient?.(0, 0, 0, 0, 0, len);
  if (grad) { grad.addColorStop(0, "rgba(255,244,216,0.22)"); grad.addColorStop(1, "rgba(255,244,216,0)"); g.fillStyle = grad; } else g.fillStyle = "rgba(255,244,216,0.1)";
  g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, len, -Math.PI / 2 - a, -Math.PI / 2 + a); g.closePath(); g.fill();
}

function fitCanvas(c: HTMLCanvasElement): void {
  const dpr = Math.min(2, (typeof devicePixelRatio === "number" && devicePixelRatio) || 1);
  const w = Math.round((c.clientWidth || 160) * dpr), h = Math.round((c.clientHeight || 160) * dpr);
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
}

/** The corner map: round, heading-up, brass-rimmed. */
export function drawMini(cv: Canvases, v: MapView, t: number): void {
  const c = cv.mini, g = cv.mg;
  fitCanvas(c);
  const Sz = c.width, R = Sz / 2, rim = Math.max(3, Sz * 0.045), Ri = R - rim, scale = Ri / VIEW_CELLS;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, Sz, Sz);
  g.save();
  g.beginPath(); g.arc(R, R, Ri, 0, Math.PI * 2); g.clip();
  g.globalAlpha = 0.86; g.fillStyle = COL.back; g.fillRect(0, 0, Sz, Sz); g.globalAlpha = 1;
  const px = player.px / CELL, pz = player.pz / CELL;
  // heading-up: the facing (-sin yaw, -cos yaw) in (x, z) is turned onto the screen's up by a rotation of `yaw`
  g.translate(R, R); g.rotate(input.yaw); g.scale(scale, scale); g.translate(-px, -pz);
  const n = VIEW_CELLS + 2;
  drawCells(g, v, Math.floor(px - n), Math.floor(pz - n), Math.ceil(px + n), Math.ceil(pz + n), scale);
  drawMarks(g, v, scale, t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.translate(R, R); cone(g, Ri * 0.62);
  // the dark at its edge
  const vig = g.createRadialGradient?.(0, 0, Ri * 0.55, 0, 0, Ri);
  if (vig) { vig.addColorStop(0, "rgba(0,0,0,0)"); vig.addColorStop(1, "rgba(0,0,0,0.7)"); g.fillStyle = vig; g.fillRect(-R, -R, Sz, Sz); }
  g.restore();
  // the rim: a dark band, a brass ring each side of it, the eight points ticked on it, the four letters
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.strokeStyle = COL.rimDark; g.lineWidth = rim; g.beginPath(); g.arc(R, R, R - rim / 2, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = COL.rim; g.lineWidth = Math.max(1, Sz / 120);
  for (const rr of [Ri, R - g.lineWidth / 2]) { g.beginPath(); g.arc(R, R, rr, 0, Math.PI * 2); g.stroke(); }
  const na = -Math.PI / 2 + input.yaw;   // where world north lands once the map is turned by yaw
  g.strokeStyle = COL.tick; g.lineCap = "butt";
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) continue;   // the four letters stand on the cardinal points
    const a = na + (i * Math.PI) / 4;
    g.lineWidth = Math.max(1, Sz / 110);
    g.beginPath(); g.moveTo(R + Math.cos(a) * (Ri - rim * 0.1), R + Math.sin(a) * (Ri - rim * 0.1)); g.lineTo(R + Math.cos(a) * (R - rim * 0.25), R + Math.sin(a) * (R - rim * 0.25)); g.stroke();
  }
  g.textAlign = "center"; g.textBaseline = "middle";
  const L: Array<[string, number, string, number]> = [["N", 0, COL.north, 0.12], ["E", 1, COL.dim, 0.085], ["S", 2, COL.dim, 0.085], ["W", 3, COL.dim, 0.085]];
  for (const [ch, q, col, f] of L) {
    const a = na + (q * Math.PI) / 2, x = R + Math.cos(a) * (R - rim / 2), y = R + Math.sin(a) * (R - rim / 2);
    g.font = `bold ${Math.round(Sz * f)}px "Courier New",monospace`;
    g.fillStyle = "#000"; g.fillText(ch, x + 1, y + 1);
    g.fillStyle = col; g.fillText(ch, x, y);
  }
  g.translate(R, R); arrow(g, Sz * 0.08);
  g.setTransform(1, 0, 0, 1, 0, 0);
}

/** The bounds of what has been seen, in cells, or the whole level when nothing has. */
function seenBounds(v: MapView): [number, number, number, number] {
  let x0 = v.W, z0 = v.H, x1 = -1, z1 = -1;
  for (let gz = 0; gz < v.H; gz++) for (let gx = 0; gx < v.W; gx++) if (v.seen[gz * v.W + gx]) { if (gx < x0) x0 = gx; if (gx > x1) x1 = gx; if (gz < z0) z0 = gz; if (gz > z1) z1 = gz; }
  return x1 < 0 ? [0, 0, v.W - 1, v.H - 1] : [x0, z0, x1, z1];
}

const LEGEND: Array<[string, string, (g: G, x: number, y: number, r: number) => void]> = [
  ["YOU", COL.player, (g, x, y, r) => { g.save(); g.translate(x, y); arrow(g, r * 2.2); g.restore(); }],
  ["DOOR", COL.door, (g, x, y, r) => g.fillRect(x - r, y - r * 0.3, r * 2, r * 0.6)],
  ["LOCKED", COL.locked, (g, x, y, r) => g.fillRect(x - r, y - r * 0.3, r * 2, r * 0.6)],
  ["KEY", COL.key, (g, x, y, r) => { g.beginPath(); g.arc(x, y, r * 0.7, 0, Math.PI * 2); g.fill(); }],
  ["EXIT", COL.exitOpen, (g, x, y, r) => g.fillRect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4)],
  ["HEALTH", COL.health, (g, x, y, r) => cross(g, x, y, r * 0.8)],
  ["ARMOUR", COL.armor, (g, x, y, r) => diamond(g, x, y, r * 0.8)],
  ["AMMO", COL.ammo, (g, x, y, r) => g.fillRect(x - r * 0.55, y - r * 0.55, r * 1.1, r * 1.1)],
  ["WEAPON", COL.weapon, (g, x, y, r) => diamond(g, x, y, r)],
];

/** The automap: the explored level, north up, framed on what has been seen, its name and tallies over it. */
export function drawAuto(cv: Canvases, v: MapView, t: number): void {
  const c = cv.auto, g = cv.ag;
  fitCanvas(c);
  const Wp = c.width, Hp = c.height, u = Math.max(12, Hp * 0.022);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, Wp, Hp);
  g.fillStyle = "rgba(5,4,3,0.93)"; g.fillRect(0, 0, Wp, Hp);
  const head = u * 3.2, foot = u * 2.6, pad = u * 1.5;
  const [bx0, bz0, bx1, bz1] = seenBounds(v), bw = bx1 - bx0 + 3, bh = bz1 - bz0 + 3;
  const scale = Math.min(u * 2.4, (Wp - pad * 2) / bw, (Hp - head - foot) / bh);
  const ox = (Wp - bw * scale) / 2 - (bx0 - 1.5) * scale, oz = head + (Hp - head - foot - bh * scale) / 2 - (bz0 - 1.5) * scale;
  // a faint grid under it, a cell to a square
  if (scale >= 7) {
    g.strokeStyle = "rgba(226,200,144,0.045)"; g.lineWidth = 1; g.beginPath();
    for (let x = bx0 - 1; x <= bx1 + 2; x++) { g.moveTo(ox + x * scale, oz + (bz0 - 1) * scale); g.lineTo(ox + x * scale, oz + (bz1 + 2) * scale); }
    for (let z = bz0 - 1; z <= bz1 + 2; z++) { g.moveTo(ox + (bx0 - 1) * scale, oz + z * scale); g.lineTo(ox + (bx1 + 2) * scale, oz + z * scale); }
    g.stroke();
  }
  g.save();
  g.translate(ox, oz); g.scale(scale, scale);
  drawCells(g, v, 0, 0, v.W - 1, v.H - 1, scale);
  drawMarks(g, v, scale, t);
  g.restore();
  g.save();
  g.translate(ox + (player.px / CELL) * scale, oz + (player.pz / CELL) * scale);
  g.rotate(-input.yaw);   // north-up: the arrow turns to the facing (up is -z, the facing at yaw 0)
  cone(g, Math.max(u * 3, scale * 4)); arrow(g, Math.max(u * 1.1, scale * 1.3));
  g.restore();
  // the header: the level's name, a rule, the tallies
  g.textBaseline = "middle";
  g.font = `bold ${Math.round(u * 1.25)}px "Courier New",monospace`; g.textAlign = "left";
  g.fillStyle = "#000"; g.fillText(titleOf(S.level).toUpperCase(), pad + 1, head * 0.45 + 1);
  g.fillStyle = COL.text; g.fillText(titleOf(S.level).toUpperCase(), pad, head * 0.45);
  g.font = `${Math.round(u)}px "Courier New",monospace`; g.textAlign = "right";
  const tally = `KILLS ${S.kills ?? 0}/${S.enemiesTotal ?? 0}    SECRETS ${S.secrets ?? 0}/${S.secretsTotal ?? 0}`;
  g.fillStyle = COL.dim; g.fillText(tally, Wp - pad, head * 0.45);
  g.strokeStyle = COL.rim; g.lineWidth = 1; g.beginPath(); g.moveTo(pad, head * 0.8); g.lineTo(Wp - pad, head * 0.8); g.stroke();
  // the key to the marks, and how to close it
  g.font = `${Math.round(u * 0.8)}px "Courier New",monospace`; g.textAlign = "left";
  const y = Hp - foot * 0.5, r = u * 0.45;
  let x = pad;
  for (const [label, col, draw] of LEGEND) { g.fillStyle = col; draw(g, x + r, y, r); g.fillStyle = COL.dim; g.fillText(label, x + r * 2.8, y); const tw = typeof g.measureText === "function" ? g.measureText(label).width : u * 4; x += r * 2.8 + tw + u * 1.4; }
  g.textAlign = "right"; g.fillStyle = COL.dim; g.fillText("M / TAB — CLOSE", Wp - pad, y);
}
