import * as THREE from "three";
import { player } from "../../player/PlayerState";
import { renderState } from "../../render/Renderer";
import { track } from "../../render/DisposeRegistry";
import { ITEMTEX } from "../../render/ItemTextures";
import { showMsg } from "../../ui/HudMessages";
import { at } from "../../audio/AudioEngine";
import { chapterToll, doorOpens, lockedDoor } from "../../audio/sounds/doors";
import { machinery } from "../../audio/sounds/world";
import { shake } from "../../fx/ShakeState";
import { alertSound } from "../../enemies/ai/Perception";
import { CELL, WALLH } from "../Grid";
import { world } from "../WorldState";
import { sideOf, type Cell2, type LevelScript } from "./LevelScript";

/**
 * THE SCRIPT AT RUN TIME (`./LevelScript.ts` says what each part is). One level's state: the seals held, whether the bell has rung,
 * the lift's height. `loadScript` is called by `loadLevel` once the level's meshes are built; everything else is a no-op on a level
 * with no script, which is every level but the monastery.
 */

const EYE = 1.6;

export const script = {
  def: null as LevelScript | null,
  seals: new Set<string>(),
  bell: false,
  lift: { h: 0, target: 0, free: false, moving: false, mesh: null as THREE.Mesh | null },
};

const key = (c: Cell2): string => c[0] + "," + c[1];
/** A sound where the player stands. */
const here = (y: number, emit: () => void): void => { const px = player.px, pz = player.pz; at(px, y, pz, emit); };
const near = (c: Cell2, r: number): boolean => Math.hypot(player.px - (c[0] + 0.5) * CELL, player.pz - (c[1] + 0.5) * CELL) < r;
const inCells = (cells: readonly Cell2[], x: number, z: number): boolean => cells.some((c) => c[0] === (x / CELL | 0) && c[1] === (z / CELL | 0));

/** Whether a cell is the lift's (`LevelMeshes.ts`'s `buildPlatforms` leaves it to the lift's own mesh). */
export function isLiftCell(x: number, z: number): boolean {
  return !!script.def?.lift?.cells.some((c) => c[0] === x && c[1] === z);
}

function setLiftHeight(h: number): void {
  const L = script.def?.lift;
  if (!L || !world.heightMap) return;
  script.lift.h = h;
  for (const [x, z] of L.cells) world.heightMap[z][x] = h;
  const m = script.lift.mesh;
  if (m) { m.scale.y = Math.max(0.05, h); m.position.y = Math.max(0.05, h) / 2; }
}

/**
 * The marks on a gate (owner's brief: "Kapı üzerindeki işaretler gereken hedefleri ve tamamlanan ilerlemeyi anlaşılır biçimde
 * göstersin"): each seal it wants, pictured over the door on the side it is approached from — dark until that seal is held, then lit.
 */
const marks: Array<{ kind: string; m: THREE.SpriteMaterial }> = [];
const DIM = 0x3a3634, LIT = 0xffffff;
function markGate(g: NonNullable<LevelScript["gates"]>[number]): void {
  const scene = renderState.scene;
  if (!scene) return;
  const [dx, dz] = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[g.face ?? "s"];
  const cx = (g.at[0] + 0.5) * CELL + dx * (CELL / 2 + 0.06), cz = (g.at[1] + 0.5) * CELL + dz * (CELL / 2 + 0.06);
  const y = (world.heightMap?.[g.at[1]]?.[g.at[0]] ?? 0) + 2.75;
  g.needs.forEach((kind, i) => {
    const tex = ITEMTEX[kind];
    if (!tex || Array.isArray(tex)) return;
    const m = track(new THREE.SpriteMaterial({ map: tex, color: DIM, transparent: true }));
    const sp = new THREE.Sprite(m);
    const off = (i - (g.needs.length - 1) / 2) * 0.62;
    sp.position.set(cx + dz * off, y, cz + dx * off);
    sp.scale.set(0.5, 0.5, 1);
    scene.add(sp);
    marks.push({ kind, m });
  });
}
function lightMarks(): void { for (const k of marks) k.m.color.setHex(script.seals.has(k.kind) ? LIT : DIM); }

/** Names the level's script (or none), before `loadLevel` builds the level's meshes. */
export function setScriptDef(def: LevelScript | undefined): void { script.def = def ?? null; }

/** Arms the level's script, after `loadLevel` has built the level. */
export function loadScript(): void {
  const def = script.def;
  script.seals.clear();
  script.bell = false;
  Object.assign(script.lift, { h: 0, target: 0, free: false, moving: false, mesh: null });
  marks.length = 0;
  for (const g of def?.gates ?? []) markGate(g);
  const L = def?.lift;
  if (!L) return;
  const xs = L.cells.map((c) => c[0]), zs = L.cells.map((c) => c[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) + 1, z0 = Math.min(...zs), z1 = Math.max(...zs) + 1;
  const m = new THREE.Mesh(track(new THREE.BoxGeometry((x1 - x0) * CELL - 0.06, 1, (z1 - z0) * CELL - 0.06)),
    track(new THREE.MeshLambertMaterial({ color: 0x4a4038 })));
  m.position.set((x0 + x1) / 2 * CELL, 0.5, (z0 + z1) / 2 * CELL);
  m.name = "lift";
  renderState.scene?.add(m);
  script.lift.mesh = m;
  script.lift.target = L.high;
  setLiftHeight(L.high);
}

/** A seal picked up: true if `kind` is one (the caller then shows nothing else). */
export function takeSeal(kind: string): boolean {
  const s = script.def?.seals?.find((x) => x.kind === kind);
  if (!s) return false;
  script.seals.add(kind);
  lightMarks();
  const left = (script.def?.seals ?? []).filter((x) => !script.seals.has(x.kind));
  showMsg(s.name + (left.length ? " — THE GATE WANTS ONE MORE" : " — BOTH SEALS: THE GATE WILL OPEN"), 3.2);
  return true;
}

/** The HUD's key line: the seals held. */
export function sealLine(): string {
  return (script.def?.seals ?? []).filter((s) => script.seals.has(s.kind)).map((s) => "■ " + s.name).join("   ");
}

/** Why the door at (gx, gz) will not open now, or null if it may. `opening` is called when it does, for a scripted door's own sound. */
export function doorRule(gx: number, gz: number): { block: string | null; gate: boolean } {
  const d = script.def;
  if (!d) return { block: null, gate: false };
  const g = d.gates?.find((x) => x.at[0] === gx && x.at[1] === gz);
  if (g) {
    const names = (d.seals ?? []).filter((s) => g.needs.includes(s.kind));
    const marks = names.map((s) => s.name + (script.seals.has(s.kind) ? " ✔" : " ✘")).join("  ·  ");
    return { block: names.every((s) => script.seals.has(s.kind)) ? null : "THE GATE WANTS TWO SEALS  —  " + marks, gate: true };
  }
  const o = d.oneWay?.find((x) => x.at[0] === gx && x.at[1] === gz);
  if (o && sideOf(o.at, player.px, player.pz, CELL) !== o.from) return { block: o.barred, gate: false };
  if (d.niches?.some((c) => c[0] === gx && c[1] === gz) && !script.bell) return { block: "IT WILL NOT MOVE", gate: false };
  return { block: null, gate: false };
}

/** The great bell: one toll, the niches open, the lift is freed. */
function ringBell(): void {
  if (script.bell) { showMsg("THE BELL STILL HUMS", 1.6); return; }
  script.bell = true;
  chapterToll(); shake(0.5);
  showMsg("THE GREAT BELL TOLLS — SOMETHING IN THE COURTYARD ANSWERS", 4);
  for (const c of script.def?.niches ?? []) {
    const dr = world.doors[key(c)] as { open?: boolean } | undefined;
    if (dr) dr.open = true;
    alertSound((c[0] + 0.5) * CELL, (c[1] + 0.5) * CELL, 10);
  }
  if (script.def?.lift) { script.lift.free = true; here(2, () => machinery()); }
}

/** `E`: the lever, the lift. True if the script took the press. */
export function scriptInteract(): boolean {
  const d = script.def;
  if (!d) return false;
  if (d.lever && near(d.lever, 2.2)) { ringBell(); return true; }
  const L = d.lift;
  if (!L) return false;
  const onLift = inCells(L.cells, player.px, player.pz), atFoot = L.foot.some((c) => near(c, 1.4));
  if (!onLift && !atFoot) return false;
  if (!script.lift.free) { showMsg("THE LIFT IS CHAINED FROM ABOVE", 2.2); here(1, () => lockedDoor()); return true; }
  if (script.lift.moving) return true;
  script.lift.target = onLift ? (script.lift.h > (L.low + L.high) / 2 ? L.low : L.high) : L.low;
  if (script.lift.target === script.lift.h) return true;
  script.lift.moving = true;
  here(2, () => machinery());
  return true;
}

/** One frame: the lift rides, and carries whoever stands on it. */
export function scriptTick(dt: number): void {
  const L = script.def?.lift;
  if (!L || !script.lift.moving) return;
  const h = script.lift.h, t = script.lift.target, step = L.speed * dt;
  const next = Math.abs(t - h) <= step ? t : h + Math.sign(t - h) * step;
  const riding = inCells(L.cells, player.px, player.pz) && player.pyy <= EYE + h + 0.3;
  setLiftHeight(next);
  if (riding) { player.pyy = EYE + next; player.vy = 0; player.grounded = true; }
  if (next === t) { script.lift.moving = false; here(1, () => doorOpens("gate")); }
}

/** After a rise at a shrine (`Respawn.ts`'s replay): the seals the taken items were, the bell if its niches stand open. */
export function scriptReplay(): void {
  const d = script.def;
  if (!d) return;
  for (const it of world.items as unknown as Array<{ kind: string; taken?: boolean }>) if (it.taken && d.seals?.some((s) => s.kind === it.kind)) script.seals.add(it.kind);
  lightMarks();
  const opened = (d.niches ?? []).some((c) => (world.doors[key(c)] as { open?: boolean } | undefined)?.open);
  if (opened) { script.bell = true; if (d.lift) script.lift.free = true; }
}

/** Opens a scripted gate's way: the sound of the two seals turning. */
export function gateOpens(gx: number, gz: number): void {
  at((gx + 0.5) * CELL, WALLH / 2, (gz + 0.5) * CELL, () => doorOpens("gate"));
  showMsg("THE TWO SEALS TURN IN THE GATE", 3);
}
