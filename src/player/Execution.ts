import * as THREE from "three";
import { world } from "../world/WorldState";
import { player } from "./PlayerState";
import { input } from "./Input";
import { hands } from "./HandsState";
import { S } from "../core/State";
import { game } from "../core/Game";
import { damageEnemy, severLimb, refreshSeverSprite } from "../enemies/Damage";
import { reeling } from "../enemies/Stagger";
import { blood } from "../fx/Particles";
import { bloodFx } from "../fx/ImpactFx";
import { addPool } from "../fx/Decals";
import { screenShake, shake } from "../fx/ShakeState";
import { addHitPunch } from "../fx/ViewPunch";
import { screenBlood } from "../render/Overlay2D";
import { at } from "../audio/AudioEngine";
import { kickSlamFlesh } from "../audio/sounds/kick";
import { limbTorn, monsterPain, decapitation } from "../audio/sounds/monsters";
import { showMsg } from "../ui/HudMessages";
import { say } from "../ui/Subtitles";
import { collides } from "../world/Collision";
import type { Enemy } from "../enemies/Enemy";

/**
 * THE FINISH BY HAND (owner, 2026-10-22: "öyle olunca da E tuşu ile animasyonlu öldürme olsun. Vahşice animasyonlu öldürelim"). A
 * monster reeling at the last of its health (`src/enemies/Stagger.ts`) can be finished with E. The player is pulled in to arm's length
 * and turned onto it, the weapon goes down, and the hands do it, in one of three ways, chosen by the game's dice:
 *
 *  0 THE HEAD   — the left hand takes it by the skull, wrenches it once, and tears the head off, toward the eye.
 *  1 THE SKULL  — the left hand holds it by the throat, the right fist smashes its face in twice, and the third blow bursts it.
 *  2 THE ARM    — the hands take an arm and rip it out at the shoulder, then the fist takes the head off with the next blow.
 *
 * It lasts `EXEC_T`; the player cannot be hurt while it runs (the spawn guard), cannot fire, reload, kick or walk (`hands.busy`), and the
 * finished monster gives back `EXEC_HEAL` health. The viewmodel draws the hands from `hands.exec` (`src/render/viewmodel/execute.ts`).
 */

/** Seconds a finish takes, from the lunge to the hands coming back. */
export const EXEC_T = 1.25;
/** How far ahead of the player, and how far to either side of the aim, a reeling monster can be finished from. */
export const EXEC_REACH = 2.9, EXEC_CONE = 0.5;
/** Health a finish gives back. */
export const EXEC_HEAL = 15;
/** Where the hands stand from the monster: arm's length. */
const STAND = 1.15;
/** The moments the blows land, seconds in: the grab, the second blow, the last. */
export const BLOWS = [0.32, 0.56, 0.82] as const;
const NAMES = ["THE HEAD", "THE SKULL", "THE ARM"];

const ex = { e: null as Enemy | null, t: 0, kind: 0, fired: 0, from: { x: 0, z: 0, yaw: 0, pitch: 0 }, prompt: null as HTMLElement | null };

/** The reeling monster the player could finish now, if any: in reach, in front, on its floor. */
export function finishable(): Enemy | null {
  if (!game.started || S.dead || hands.busy) return null;
  const dir = new THREE.Vector3(-Math.sin(input.yaw), 0, -Math.cos(input.yaw));
  let best: Enemy | null = null, bd = EXEC_REACH;
  for (const e of world.enemies) {
    if (!reeling(e)) continue;
    const dx = e.x - player.px, dz = e.z - player.pz, d = Math.hypot(dx, dz);
    if (d > bd || d < 0.01) continue;
    if ((dx * dir.x + dz * dir.z) / d < EXEC_CONE) continue;
    if (Math.abs((e.fy || 0) - (player.pyy - 1)) > 1.3) continue;
    best = e; bd = d;
  }
  return best;
}

/** E pressed: finish the reeling monster in front, if there is one. Returns whether it did (`interact` goes on to doors otherwise). */
export function tryExecute(): boolean {
  const e = finishable();
  if (!e) return false;
  ex.e = e; ex.t = 0; ex.fired = 0; ex.kind = Math.floor(Math.random() * 3);
  ex.from = { x: player.px, z: player.pz, yaw: input.yaw, pitch: input.pitch };
  e.executing = true; e.kx = 0; e.kz = 0;
  hands.busy = true; hands.exec = { t: 0, kind: ex.kind };
  player.spawnGuard = Math.max(player.spawnGuard, EXEC_T + 0.2);
  player.vx = player.vz = 0;
  showMsg(NAMES[ex.kind], 1.4);
  return true;
}

const ease = (u: number): number => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
const wrap = (a: number): number => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

/** Every frame, after `playerTick`: the finish under way, and the prompt over a monster that can be finished. */
export function executionTick(dt: number): void {
  const e = ex.e;
  if (e && (!world.enemies.includes(e) || S.dead)) { end(); return; }   // a level load or a death took it from the hands
  if (!e) { promptTick(); return; }
  ex.t += dt;
  const t = ex.t;
  hands.exec = { t, kind: ex.kind };
  // the lunge: in to arm's length and square onto it, over the first fifth of a second; then held there
  const dx = e.x - ex.from.x, dz = e.z - ex.from.z, d = Math.hypot(dx, dz) || 1;
  const ux = dx / d, uz = dz / d, k = ease(t / 0.2);
  const tx = e.x - ux * STAND, tz = e.z - uz * STAND;
  const nx = ex.from.x + (tx - ex.from.x) * k, nz = ex.from.z + (tz - ex.from.z) * k;
  if (!collides(nx, player.pz)) player.px = nx;
  if (!collides(player.px, nz)) player.pz = nz;
  player.vx = player.vz = 0;
  const yaw = Math.atan2(-ux, -uz), aim = Math.atan2((e.fy || 0) + e.h * 0.55 - player.pyy, STAND);
  input.yaw = ex.from.yaw + wrap(yaw - ex.from.yaw) * k;
  input.pitch = ex.from.pitch + (aim - ex.from.pitch) * k;
  while (ex.fired < BLOWS.length && t >= BLOWS[ex.fired]) blow(e, ex.fired++, ux, uz);
  if (t >= EXEC_T) end();
}

/** One of the three blows of the finish under way: `i` 0, 1 or 2; (`ux`,`uz`) from the player to it. */
function blow(e: Enemy, i: number, ux: number, uz: number): void {
  const hy = (e.fy || 0) + e.h * (ex.kind === 2 && i < 2 ? 0.6 : 0.85), back = { x: -ux, z: -uz };
  const last = i === BLOWS.length - 1;
  if (!last) {
    bloodFx(e.x - ux * 0.3, hy, e.z - uz * 0.3, 10 + 6 * i, 2, -ux, -uz);
    blood(e.x, hy, e.z, 8, 2);
    at(e.x, hy, e.z, () => kickSlamFlesh());
    at(e.x, hy, e.z, () => monsterPain(e.key, e));
    if (ex.kind === 2 && i === 1 && !(e.sever && e.sever.lArm)) {   // the arm comes out at the shoulder
      e.sever = e.sever || {}; e.sever.lArm = true;
      severLimb(e, "arm", { dir: back, armSide: "L" });
      refreshSeverSprite(e);
      at(e.x, hy, e.z, () => limbTorn());
    }
    addHitPunch(0.9 + 0.3 * i, i % 2 ? 1 : -1);
    shake(0.2 + 0.08 * i);
    screenShake.hitStop = Math.max(screenShake.hitStop, 0.05);
    if (i === 1) screenBlood();
    return;
  }
  // the last: the head torn off toward the eye, or the body burst by the fist
  e.executing = false; e.stagger = 0; e.plate = 0; e.shield = false;   // nothing turns the hands aside
  if (ex.kind === 1) damageEnemy(e, e.hp + 90, { dir: { x: ux, z: uz }, wIdx: -3, explosive: true });
  else {
    damageEnemy(e, e.hp + 5, { dir: back, head: true, wIdx: -3 });
    at(e.x, hy, e.z, () => decapitation());
  }
  bloodFx(e.x - ux * 0.4, hy, e.z - uz * 0.4, 26, 3, -ux, -uz);
  blood(e.x, hy, e.z, 24, 3.2);
  addPool(e.x, e.z, 1.1);
  screenBlood(); screenBlood();
  addHitPunch(1.6, 0);
  shake(0.45);
  screenShake.hitStop = Math.max(screenShake.hitStop, 0.09);
  S.hp = Math.min(100, S.hp + EXEC_HEAL);
  if (Math.random() < 0.5) say(ex.kind === 1 ? "gib" : "kicksplat", true);
}

function end(): void {
  if (ex.e && !ex.e.dead) { ex.e.executing = false; ex.e.stagger = 0; }
  if (ex.prompt) ex.prompt.style.opacity = "0";
  ex.e = null; hands.busy = false; hands.exec = null;
}

/** Drops a finish under way (a level load, a death). */
export function resetExecution(): void {
  if (ex.e) ex.e.executing = false;
  ex.e = null; hands.busy = false; hands.exec = null; hands.drop = false;
  if (ex.prompt) ex.prompt.style.opacity = "0";
}

/** The prompt over a monster that can be finished: "E — FINISH IT", shown while one is in reach. */
function promptTick(): void {
  if (typeof document === "undefined") return;
  if (!ex.prompt) {
    const el = document.createElement("div");
    el.id = "execPrompt";
    el.textContent = "E — FINISH IT";
    el.style.cssText = "position:fixed;left:50%;top:58%;transform:translateX(-50%);font:700 15px/1 'Courier New',monospace;letter-spacing:3px;"
      + "color:#ffb070;text-shadow:0 0 6px #ff4a10,0 0 2px #000;pointer-events:none;opacity:0;transition:opacity .12s;z-index:12";
    (document.body || document.documentElement).appendChild(el);
    ex.prompt = el;
  }
  ex.prompt.style.opacity = finishable() ? "1" : "0";
}

/** For tests: the finish under way. */
export function executionState(): { active: boolean; t: number; kind: number; target: Enemy | null } {
  return { active: !!ex.e, t: ex.t, kind: ex.kind, target: ex.e };
}
