import { S } from "../core/State";
import { game } from "../core/Game";
import { save } from "../save/SaveGame";
import { flushSave } from "../save/persist";
import { LEVELS } from "./levels/index";
import { loadLevel } from "./LevelLoader";
import { world } from "./WorldState";
import { doors, against } from "./ExitDoor";
import { pose, setLit } from "./DoorKit";
import { floorHeightAt } from "./Collision";
import { EYE, CELL } from "./Grid";
import { trans, T, smooth, setFade, showHud } from "./TransitionState";
import { CHAPTER_LINES } from "../content/monologue";
import { gradeOf, statsHtml } from "../ui/LevelEnd";
import { showMsg } from "../ui/HudMessages";
import { el } from "../ui/dom";
import { stopBossMusic } from "../audio/Ambient";
import { at } from "../audio/AudioEngine";
import { doorOpens, exitWalkthrough, chapterToll, doorShutsBehind } from "../audio/sounds/doors";
import { weaponRaise } from "../audio/sounds/foley";
import { renderState } from "../render/Renderer";
import { input } from "../player/Input";
import { player } from "../player/PlayerState";
import { weaponRuntime } from "../weapons/WeaponRuntime";

/**
 * LEAVING A LEVEL THROUGH A DOOR, AND ARRIVING THROUGH ANOTHER — the
 * transitions plan (`docs/superpowers/plans/2026-10-05-transitions.md`). The
 * owner, 2026-10-05: "the level transitions are very bad". What there was:
 * walk onto a glowing pad in the floor, a static panel, a button. Now it is
 * all in the engine, with the camera, and nothing is a panel until the screen
 * is black.
 *
 * ## The timeline (seconds; `TransitionState.ts` has the phases)
 *
 * ```
 *  0.00  the player opens the exit door (E facing it, or walking into it):
 *        input locks, the game stops, `maxLevel` is saved (where `endLevel`
 *        saved it), the boss music stops, the HUD fades; the door's own sound
 *  0.00-0.80  the door opens
 *  0.15-1.40  the camera walks to the doorway, turns to it, lifts level
 *  0.25  `exitWalkthrough` (1.5 s): air drawn in, a chord rising, footfalls
 *  0.65-1.45  the world goes to black (`#fade`)
 *  1.50  black. 0.25 s later the chapter card, over black: the level's name
 *        struck through, CLEARED, the grade and stats, one line from ADEM;
 *        `chapterToll`
 *  ...   until a deliberate key (Space, Enter, E — not a held key's repeat) or
 *        a click, at least 1.0 s after the card came up
 *  then  the next level loads behind the black, and for 2.3 s:
 *  0.10-1.30  the black lifts, the level's title coming up as it does
 *  0.15-1.00  the camera walks in from the entrance door to the spawn
 *  0.90-1.30  looks back over the shoulder, at the door
 *  1.20-1.70  the door shuts; `doorShutsBehind` as it comes to rest, at 1.65
 *  1.80-2.30  turns back to the way the level opens
 *  2.30  control. The hands come up.
 * ```
 *
 * Every pose is a pure function of the time in the phase, so nothing here
 * draws from `Math.random` and the same run walks the same path.
 *
 * ## Why the camera stops short of the dark
 *
 * The door's wall is an instanced box that cannot be cut, so the dark in the
 * doorway is a plane against its face, and a camera that went through it would
 * be inside the wall, seeing the room on the other side. The walk ends 0.15 in
 * front of the plane, where the opening fills the whole view, and the black
 * is complete before it gets there.
 *
 * ## The rules for continuing the card
 *
 * The opening's (`Opening.ts`'s): nothing continues it in its first
 * `T.cardAfter` seconds; a key's auto-repeat does nothing; a mouse button
 * already held when the card came up sends no `mousedown`, so it does
 * nothing; only Space, Enter or E, or a left click, continue — not Esc, a
 * modifier or a movement key. Registered after `Input.ts`'s own listeners (this
 * module imports it), so the key that continues is not also an interaction.
 *
 * The final level has no exit door: its boss shows the win screen (`showWin`,
 * `src/ui/LevelEnd.ts`), unchanged.
 */

const CONTINUE_KEYS: ReadonlySet<string> = new Set(["Space", "Enter", "NumpadEnter", "KeyE"]);

/** How close, and how squarely, the player must be to open the exit with E, and how near to walk into it. */
const USE = { out: 2.6, across: 1.5, facing: 0.4 }, TOUCH = { out: 0.7, across: 0.8 }, HINT_OUT = 2.4;

const mix = (a: number, b: number, k: number): number => a + (b - a) * k;
/** The turn from angle `a` to angle `b` by the short way. */
const turn = (a: number, b: number): number => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  return d;
};
const cue = (id: string, at_: number, f: () => void): void => {
  if (trans.t >= at_ && !trans.cued.has(id)) { trans.cued.add(id); f(); }
};

function placeCamera(x: number, y: number, z: number, yaw: number, pitch: number): void {
  const cam = renderState.camera;
  cam.position.set(x, y, z);
  cam.rotation.order = "YXZ";
  cam.rotation.y = yaw; cam.rotation.x = pitch; cam.rotation.z = 0;
  if (renderState.lamp) renderState.lamp.position.set(x, y + .4, z);
  if (renderState.lampCore) renderState.lampCore.position.set(x, y + .2, z);
}

/** The yaw that looks along (wx, wz): the camera's forward is (-sin yaw, -cos yaw). */
const yawOf = (wx: number, wz: number): number => Math.atan2(-wx, -wz);

const nameOf = (i: number): string => (LEVELS[i] ? LEVELS[i].name.replace(/^(LEVEL \d+|PROLOGUE) — /, "") : "");

/** Opens the exit door and begins the walk, if the door is there, the boss is dead and nothing else is happening. */
export function leaveLevel(): boolean {
  const d = doors.exit;
  if (!d || !world.exitPos || trans.phase !== "idle" || S.won || S.dead) return false;
  if (world.enemies.some((e) => e.boss && !e.dead)) { showMsg("SOMETHING STILL BREATHES HERE", 1.5); return false; }
  S.won = true;
  // the same save, at the same moment, as `endLevel` made it: the level is done when its exit is taken
  save.maxLevel = Math.max(save.maxLevel, Math.min(S.level + 1, LEVELS.length - 1));
  flushSave();
  stopBossMusic();
  const grade = gradeOf();
  trans.grade = grade; trans.stats = statsHtml();
  const lines = CHAPTER_LINES[S.level];
  trans.line = lines ? lines[grade === "C" || grade === "D" ? 1 : 0] : "";
  game.inputLock = true; input.firing = false;
  showHud(false);
  showMsg("", 0); el("subt").innerHTML = "";   // "PRESS E", and whatever ADEM was saying, do not hang over the walk
  trans.phase = "walk"; trans.t = 0; trans.card = -T.hold; trans.cued.clear();
  trans.from = { x: player.px, y: player.pyy, z: player.pz, yaw: input.yaw, pitch: input.pitch };
  at(d.x, d.y + 1.2, d.z, () => doorOpens(d.rig.spec.sound));
  return true;
}

/** `interact` (E): opens the exit if the player is at it, facing it. True if the key was spent on the door. */
export function tryExit(): boolean {
  const d = doors.exit;
  if (!d || !world.exitPos || trans.phase !== "idle") return false;
  const a = against(d, player.px, player.pz, input.yaw);
  if (a.out < 0 || a.out > USE.out || Math.abs(a.across) > USE.across || a.facing < USE.facing) return false;
  leaveLevel();
  return true;
}

let hinted = false;
/** Each `playerTick`: walking into the exit door opens it; coming up to it says so, or says why not. */
export function exitTick(): void {
  const d = doors.exit;
  if (!d || trans.phase !== "idle") return;
  const a = against(d, player.px, player.pz, input.yaw);
  const near = a.out >= 0 && a.out < HINT_OUT && Math.abs(a.across) < USE.across;
  if (!near) { hinted = false; return; }
  // A boss level's door is built sealed (no exitPos until the boss dies):
  // say so once, so a dark door does not read as a broken one.
  if (!world.exitPos) { if (!hinted) { hinted = true; showMsg("SEALED — SOMETHING STILL BREATHES HERE", 2.2); } return; }
  const bossLeft = world.enemies.some((e) => e.boss && !e.dead);
  if (bossLeft) { showMsg("SOMETHING STILL BREATHES HERE", 1.5); return; }
  if (a.out < TOUCH.out && Math.abs(a.across) < TOUCH.across) { leaveLevel(); return; }
  if (!hinted) { hinted = true; showMsg("PRESS E — " + d.rig.spec.name, 2.2); }
}

function walk(): void {
  const d = doors.exit!, t = trans.t, f = trans.from;
  pose(d.rig, smooth(0, .8, t));
  cue("walk", .25, exitWalkthrough);
  const tx = d.x + d.nx * .15, tz = d.z + d.nz * .15, p = smooth(.2, 1.4, t), look = smooth(0, .6, t);
  const wx = tx - f.x, wz = tz - f.z;
  const yaw = Math.hypot(wx, wz) > .05 ? f.yaw + turn(f.yaw, yawOf(wx, wz)) * look : f.yaw;
  placeCamera(mix(f.x, tx, p), f.y, mix(f.z, tz, p), yaw, f.pitch * (1 - look));
  setFade(smooth(.65, 1.45, t));
  if (t >= T.walk) {
    trans.phase = "card"; trans.t = 0;
    setFade(1);
    document.exitPointerLock();
  }
}

/** The card's words, set when it comes up. */
function showCard(): void {
  const done = nameOf(S.level), next = nameOf(S.level + 1);
  el("letitle").innerHTML = `<span class="done"></span> <b>CLEARED</b>`;
  el("letitle").firstElementChild!.textContent = done;
  el("legrade").textContent = trans.grade;
  el("lestats").innerHTML = trans.stats;
  el("leline").textContent = trans.line ? "ADEM: “" + trans.line + "”" : "";
  el("lebtn").textContent = `[ SPACE OR CLICK — ON TO ${next} ]`;
  el("levelend").classList.remove("hidden");
  chapterToll();
}

function card(dt: number): void {
  trans.card += dt;
  if (trans.card >= 0 && !trans.cued.has("card")) { trans.cued.add("card"); showCard(); }
}

/** The next level, loaded behind the black, and the walk in. */
function proceed(): void {
  if (trans.phase !== "card" || trans.card < T.cardAfter) return;
  el("levelend").classList.add("hidden");
  const next = S.level + 1;
  loadLevel(next);
  renderState.renderer.domElement.requestPointerLock?.();
  beginArrival();
}

function beginArrival(): void {
  const e = doors.entrance;
  trans.phase = "arrive"; trans.t = 0; trans.cued.clear(); hinted = false;
  game.inputLock = true; input.firing = false;
  setFade(1);
  if (e) {
    pose(e.rig, 1); setLit(e.rig, true);
    const x = (e.site.sx + .5) * CELL, z = (e.site.sz + .5) * CELL;
    placeCamera(x, floorHeightAt(x, z) + EYE, z, yawOf(player.px - x, player.pz - z), 0);
  } else placeCamera(player.px, player.pyy, player.pz, input.yaw, 0);
}

function arrive(): void {
  const e = doors.entrance, t = trans.t;
  setFade(1 - smooth(.1, 1.3, t));
  if (e) {
    const x0 = (e.site.sx + .5) * CELL, z0 = (e.site.sz + .5) * CELL, y0 = floorHeightAt(x0, z0) + EYE;
    const p = smooth(.15, 1.0, t), wx = player.px - x0, wz = player.pz - z0;
    // walking in he looks where he goes; at the shoulder he looks back at the door; then to the way the level opens
    const ahead = Math.hypot(wx, wz) > .05 ? yawOf(wx, wz) : input.yaw, back = ahead + Math.PI;
    const yaw = t < 1.8 ? ahead + turn(ahead, back) * smooth(.9, 1.3, t) : back + turn(back, input.yaw) * smooth(1.8, 2.3, t);
    placeCamera(mix(x0, player.px, p), mix(y0, player.pyy, p), mix(z0, player.pz, p), yaw, 0);
    const k = 1 - smooth(1.2, 1.7, t);
    pose(e.rig, k);
    if (k <= 0) setLit(e.rig, false);
    cue("shut", 1.65, doorShutsBehind);
  }
  if (t >= T.arrive) finishArrival();
}

function finishArrival(): void {
  const e = doors.entrance;
  if (e) { pose(e.rig, 0); setLit(e.rig, false); }
  trans.phase = "idle"; trans.t = 0;
  setFade(0);
  placeCamera(player.px, player.pyy, player.pz, input.yaw, input.pitch);
  game.inputLock = false; input.firing = false;
  showHud(true);
  weaponRuntime.wstate = "equip"; weaponRuntime.wtime = 0; weaponRaise();
}

/** Every frame from `Loop.ts`, outside the gameplay block (the walk runs with the game stopped). */
export function transitionTick(dt: number): void {
  if (trans.phase === "idle") return;
  trans.t += dt;
  if (trans.phase === "walk") walk();
  else if (trans.phase === "card") card(dt);
  else arrive();
}

// Continuing is deliberate; see the header. `trans.card` is negative while the screen is still going black.
addEventListener("keydown", (e) => {
  if (trans.phase === "card" && !e.repeat && CONTINUE_KEYS.has(e.code)) proceed();
});
addEventListener("mousedown", (e) => {
  if (trans.phase === "card" && e.button === 0) proceed();
});
