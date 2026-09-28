import { game } from "../core/Game";
import { input } from "../player/Input";
import { player } from "../player/PlayerState";
import { renderState } from "../render/Renderer";
import { grain } from "../render/BandTextures";
import { weaponRuntime } from "../weapons/WeaponRuntime";
import { weaponRaise } from "../audio/sounds/foley";
import { graveBreath, graveHeartbeat, earthShifts, lidCracks, dirtFalls } from "../audio/sounds/grave";
import { spawnP } from "../fx/Particles";
import { say } from "../ui/Subtitles";
import { CELL, EYE } from "./Grid";
import { floorHeightAt } from "./Collision";

/**
 * THE OPENING — ADEM claws his way out of his grave. The prologue plan's
 * Task 2 (`docs/superpowers/plans/2026-09-27-player-feedback-2-prologue.md`):
 * black, a breath and a heartbeat in the box, the earth shifting, the coffin
 * lid splitting over his face with moonlight in the crack, the view rising
 * out of the ground — lying on his back looking up at the night sky, then
 * sitting up, then climbing out to stand beside his own grave, dirt falling
 * away — one line from ADEM, the weapon raised, and control. **5.5 seconds.
 * Space, Enter, E or a click skips it — deliberately, see the bottom of the
 * file.**
 *
 * ## Which level, and when
 *
 * A level has an opening when its `BuiltLevel` names a `grave` (only the
 * prologue does). `loadLevel` calls `beginOpening` as its last act, so it
 * runs when the level starts — NEW GAME, or chapter select's first row —
 * and never mid-level: level 0 is only ever loaded from the menu (death
 * reloads the page; `LevelEnd.ts`'s `loadLevel(S.level + 1)` moves forward, to
 * levels that name no grave, and `resetOpening` drops an opening left running
 * by any load).
 * On a level with an opening, the opening says the level's line
 * (`lvl0`) at its end, in place of `loadLevel`'s 1.4-second timer. That
 * timer is what used to overwrite `p0_down` for a player who ran straight to
 * the mausoleum (Task 1's first concern): no line is pending once the
 * player has control, however fast they run.
 *
 * ## The existing mechanisms it uses
 *
 * - **`game.inputLock`** — the boss cinematic's lock. With it set,
 *   `playerTick` returns before moving or placing the camera, mouse look,
 *   firing, reloading, the kick and interaction are refused, and the world
 *   keeps simulating. This file places the camera itself while it runs.
 * - **Not `world.cine`**, deliberately: that slot is the boss cinematic's
 *   (`cineTick` turns the camera to `cine.e`, a boss, and ends with the
 *   boss's line and music), and while it is set `enemyTick` freezes every
 *   enemy at `y = h/2` — which on the prologue's raised hell banks would sink
 *   them into the floor for the length of the opening. `openingTick` sits
 *   beside `cineTick` in `Loop.ts` instead, in the same gameplay block, so
 *   it pauses with the game.
 * - **The HUD fade** — the HUD and the crosshair are hidden and fade back
 *   in with the weapon (`#hud`, `#cross`); the level's name (`showMsg`) is
 *   shown over the black, like a film's title.
 * - **The weapon's own equip** — hidden through the rise
 *   (`openingHidesWeapon`, read by the viewmodel frame), then
 *   `wstate = "equip"` and `weaponRaise()`, exactly what `weaponTick` does at
 *   the end of a switch, so the hands draw the weapon up as control arrives.
 * - **The particle pool** (`src/fx/Particles.ts`'s `spawnP`) for the dirt.
 *
 * ## Determinism
 *
 * The pose is a pure function of the time (`openingPose`), the cues fire at
 * fixed times, the dirt's positions and speeds come from `grain` (an
 * integer hash) and the sounds draw from sound's own generator — nothing
 * here calls `Math.random`, so the trace harness's seeded stream is not
 * moved by the opening itself. The one draw it causes is `say()`'s own pick
 * of which `lvl0` line to speak, the same draw `loadLevel`'s timer used to
 * make, only earlier.
 */

/** When each beat of the opening happens, in seconds from the level's start. */
export const T = {
  /** The coffin lid splits: a sliver of moonlight. */
  crack: 1.7,
  /** The lid bursts apart; by `open` it is gone. */
  burst: 2.05, open: 2.5,
  /** Lying -> sitting up in the coffin. */
  sit0: 2.35, sit1: 3.4,
  /** Sitting -> clawing over the rim -> standing beside the grave. */
  climb0: 3.4, rim: 4.15, stand: 4.9,
  /** ADEM's line. */
  line: 4.6,
  /** The weapon is raised and the HUD fades in. */
  raise: 5.2,
  /** Control. */
  end: 5.5,
} as const;

/** The camera, as the opening places it. */
export interface Pose { x: number; y: number; z: number; pitch: number; yaw: number; roll: number }

/** Where the opening happens: the grave's centre and floor, and where he ends up standing. World units. */
export interface Site { gx: number; gz: number; gy: number; sx: number; sz: number; sy: number }

export const opening = {
  active: false,
  t: 0,
  site: { gx: 0, gz: 0, gy: 0, sx: 0, sz: 0, sy: 0 } as Site,
  line: "",
  /** The next cue to fire (an index into `CUES`). */
  cue: 0,
  /** Clods spawned so far, and the fraction of one owed — the trickle is paced by time, not by frames. */
  clods: 0,
  owed: 0,
  said: false,
  raised: false,
  lamp: 1.7,
  core: 1.1,
};

const smooth = (a: number, b: number, t: number): number => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};
const mix = (a: number, b: number, k: number): number => a + (b - a) * k;

/**
 * The camera at time `t`: lying in the coffin (head to the headstone, looking
 * up past his feet at the sky), sitting up, clawing over the rim, standing.
 * Pure — the same `t` and site always give the same pose.
 */
export function openingPose(t: number, s: Site): Pose {
  // lying on his back in the coffin, head at the north end
  const lie: Pose = { x: s.gx, y: s.gy + 0.3, z: s.gz - 0.5, pitch: 1.05, yaw: Math.PI, roll: 0.06 };
  // sitting up, his eyes just over the lip of the grave
  const sit: Pose = { x: s.gx + 0.05, y: s.gy + 0.82, z: s.gz + 0.15, pitch: 0.04, yaw: Math.PI - 0.08, roll: -0.03 };
  // knees on the rim, hands in the grass, looking at the ground he is dragging himself onto
  const rim: Pose = { x: mix(s.gx, s.sx, 0.5), y: s.sy + 0.45, z: mix(s.gz, s.sz, 0.55), pitch: -0.38, yaw: Math.PI + 0.12, roll: 0.05 };
  const stand: Pose = { x: s.sx, y: s.sy + EYE, z: s.sz, pitch: 0, yaw: Math.PI, roll: 0 };
  let p: Pose;
  if (t < T.sit1) p = lerpPose(lie, sit, smooth(T.sit0, T.sit1, t));
  else if (t < T.rim) p = lerpPose(sit, rim, smooth(T.climb0, T.rim, t));
  else p = lerpPose(rim, stand, smooth(T.rim, T.stand, t));
  if (t < T.sit0) {
    // breathing in the box, and the box shaken as the earth shifts and the lid gives
    p.y += Math.sin(t * 2.6) * 0.012;
    const quake = smooth(1.0, 1.3, t) * (1 - smooth(2.2, 2.4, t));
    p.roll += Math.sin(t * 37) * 0.012 * quake;
    p.pitch += Math.sin(t * 29 + 1) * 0.01 * quake;
  } else if (t < T.stand) {
    // the effort of it: a heave on each pull
    const heave = Math.sin((t - T.sit0) * 7.5) * (1 - smooth(T.rim, T.stand, t));
    p.y += heave * 0.025;
    p.roll += heave * 0.02;
  }
  return p;
}

function lerpPose(a: Pose, b: Pose, k: number): Pose {
  return { x: mix(a.x, b.x, k), y: mix(a.y, b.y, k), z: mix(a.z, b.z, k), pitch: mix(a.pitch, b.pitch, k), yaw: mix(a.yaw, b.yaw, k), roll: mix(a.roll, b.roll, k) };
}

/**
 * Dirt: clods of earth falling past the camera — `ahead` units in front of
 * where the opening has it now, from up to `up` above it, over `spread` — so
 * they fall through the view. Each clod is numbered (`opening.clods`), and its
 * position, speed and shade come from the integer hash of its number, never
 * from `Math.random`.
 */
function clods(n: number, ahead: number, up: number, spread: number): void {
  const p = openingPose(opening.t, opening.site);
  const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
  for (let k = 0; k < n; k++) {
    const i = opening.clods++;
    const a = grain(i, 1, 41), b = grain(i, 2, 43), c = grain(i, 3, 47), d = grain(i, 4, 53);
    const side = (a - 0.5) * spread, fwd = ahead + c * 0.9, tone = 0.6 + 0.4 * d;
    spawnP(p.x + fx * fwd + fz * side, p.y + up * (0.3 + 0.7 * b), p.z + fz * fwd - fx * side,
      (a - 0.5) * 0.5, -0.2 - 0.8 * b, (c - 0.5) * 0.5,
      0.075 * tone, 0.05 * tone, 0.03 * tone, 0.5 + 0.4 * d, 2);   // linear: dark earth on screen
  }
}

/** Clods a second through the rise: the earth caving in as he sits up, falling off him as he climbs. */
const trickle = (t: number): number =>
  t < T.burst ? 0 : t < T.sit1 ? 70 : t < T.stand ? 55 * (1 - smooth(T.rim, T.stand, t)) + 10 : 0;

const say0 = (): void => { if (!opening.said) { opening.said = true; if (opening.line) say(opening.line, true); } };
const raise0 = (): void => {
  if (opening.raised) return;
  opening.raised = true;
  weaponRuntime.wstate = "equip"; weaponRuntime.wtime = 0; weaponRaise();
  showHud(true);
};

/** The opening's cues, in time order: the sounds, the dirt, the line, the weapon. */
const CUES: ReadonlyArray<readonly [number, () => void]> = [
  [0.15, graveBreath], [0.55, graveHeartbeat], [1.0, earthShifts], [1.25, graveHeartbeat], [1.45, graveBreath],
  [T.crack, lidCracks],
  [T.burst, () => { dirtFalls(); clods(50, 1.0, 1.2, 2.2); }],
  [T.sit0 + 0.3, graveHeartbeat],
  [T.climb0 + 0.25, dirtFalls],
  [T.line, say0],
  [T.raise, raise0],
];

// ---- the lid: two black halves over the screen, split by a jagged crack, with moonlight in it

interface Lid { root: HTMLElement; top: HTMLElement; bot: HTMLElement; sliver: HTMLElement }
let lid: Lid | null = null;

/** The crack's line across the screen: [x %, y %] — both halves share it, so any parting opens a jagged crack along it. */
const CRACK: ReadonlyArray<readonly [number, number]> = [
  [0, 49.5], [8, 51], [17, 48.6], [26, 50.8], [35, 49], [44, 51.6], [53, 48.4], [61, 50.2], [70, 51.4], [79, 48.8], [88, 50.6], [96, 49.2], [100, 50],
];

function makeLid(): Lid {
  const div = (css: string): HTMLElement => { const d = document.createElement("div"); d.style.cssText = css; return d; };
  const root = div("position:fixed;inset:0;z-index:6;pointer-events:none;overflow:hidden;display:none");
  root.id = "graveLid";
  const line = CRACK.map(([x, y]) => `${x}% ${y}%`);
  const half = "position:absolute;inset:0;background:#030303;";
  const top = div(half + `clip-path:polygon(0 0,100% 0,${[...line].reverse().join(",")})`);
  const bot = div(half + `clip-path:polygon(${line.join(",")},100% 100%,0 100%)`);
  // behind the lid: the moonlight the crack lets in
  const sliver = div("position:absolute;left:0;right:0;top:44%;height:12%;opacity:0;" +
    "background:radial-gradient(ellipse 60% 50% at 50% 50%,rgba(228,234,248,.95) 0%,rgba(165,182,218,.55) 38%,rgba(90,110,150,0) 80%)");
  root.append(sliver, top, bot);
  document.body.appendChild(root);
  return { root, top, bot, sliver };
}

/** The lid over the screen at time `t`: shut, cracked, bursting apart, gone. */
function drawLid(t: number): void {
  if (!lid) lid = makeLid();
  const crack = smooth(T.crack, T.crack + 0.25, t), part = smooth(T.burst, T.open, t);
  const gap = crack * 0.7 + part * 62;   // vh each half moves off the crack
  lid.root.style.display = t >= T.open ? "none" : "block";
  lid.top.style.transform = `translateY(${-gap}vh) rotate(${-part * 5}deg)`;
  lid.bot.style.transform = `translateY(${gap}vh) rotate(${part * 4}deg)`;
  // the moonlight in the crack flickers as grit falls through it, and is lost as the lid goes
  lid.sliver.style.opacity = String(crack * (1 - part) * (1 - part) * (0.85 + 0.15 * Math.sin(t * 23)));
}

function hideLid(): void { if (lid) lid.root.style.display = "none"; }

function showHud(on: boolean): void {
  for (const id of ["hud", "cross"]) {
    const e = document.getElementById(id);
    if (!e) continue;
    e.style.transition = on ? "opacity .8s" : "";
    e.style.opacity = on ? "" : "0";
  }
}

function placeCamera(p: Pose, lampK: number): void {
  const cam = renderState.camera;
  cam.position.set(p.x, p.y, p.z);
  cam.rotation.order = "YXZ";
  cam.rotation.y = p.yaw; cam.rotation.x = p.pitch; cam.rotation.z = p.roll;
  if (renderState.lamp) { renderState.lamp.position.set(p.x, p.y + .4, p.z); renderState.lamp.intensity = opening.lamp * lampK; }
  if (renderState.lampCore) { renderState.lampCore.position.set(p.x, p.y + .2, p.z); renderState.lampCore.intensity = opening.core * lampK; }
}

/** The player's lamp through the opening: a faint glow in the grave, full once he is standing. */
const lampAt = (t: number): number => 0.3 + 0.7 * smooth(T.climb0, T.stand, t);

/**
 * Called by `loadLevel` as its last act on a level with a grave: `grave` is
 * the grave's cell, the player has already been placed on the spawn cell
 * beside it, and `line` is the level's opening line.
 */
export function beginOpening(grave: { x: number; z: number }, line: string): void {
  const gx = (grave.x + .5) * CELL, gz = (grave.z + .5) * CELL;
  opening.site = { gx, gz, gy: floorHeightAt(gx, gz), sx: player.px, sz: player.pz, sy: floorHeightAt(player.px, player.pz) };
  opening.active = true; opening.t = 0; opening.cue = 0; opening.line = line; opening.clods = 0; opening.owed = 0;
  opening.said = false; opening.raised = false;
  opening.lamp = renderState.lamp ? renderState.lamp.intensity : 1.7;
  opening.core = renderState.lampCore ? renderState.lampCore.intensity : 1.1;
  game.inputLock = true; input.firing = false;
  showHud(false);
  drawLid(0);
  placeCamera(openingPose(0, opening.site), lampAt(0));
}

/** Every gameplay frame, from `Loop.ts`, beside `cineTick`. */
export function openingTick(dt: number): void {
  if (!opening.active) return;
  opening.t += dt;
  const t = opening.t;
  while (opening.cue < CUES.length && CUES[opening.cue][0] <= t) CUES[opening.cue++][1]();
  if (t >= T.end) { finish(); return; }
  opening.owed += trickle(t) * dt;
  if (opening.owed >= 1) { const n = Math.floor(opening.owed); opening.owed -= n; clods(n, 1.0, 0.9, 2.0); }
  drawLid(t);
  placeCamera(openingPose(t, opening.site), lampAt(t));
}

/** Straight to the end — standing beside the grave, the line said, the weapon coming up. */
export function skipOpening(): void {
  if (opening.active) finish();
}

function finish(): void {
  opening.active = false;
  opening.cue = CUES.length;
  hideLid();
  placeCamera(openingPose(T.end, opening.site), 1);
  say0();
  raise0();
  game.inputLock = false; input.firing = false;
}

/** Called by `loadLevel` first thing: an opening still running when another level loads is dropped, with no line and no lock left behind. */
export function resetOpening(): void {
  if (!opening.active) return;
  opening.active = false;
  hideLid();
  showHud(true);
  game.inputLock = false;
}

/** True while the weapon is kept out of the hands — the viewmodel frame's `hidden` (`Loop.ts`). */
export function openingHidesWeapon(): boolean {
  return opening.active && !opening.raised;
}

/**
 * Seconds at the start in which nothing skips it: the click that started the
 * game (the second click of a double-click on NEW GAME, or the one that takes
 * the pointer lock) must not also end the opening it began.
 */
export const SKIP_AFTER = 0.6;

/** The keys that skip: a deliberate press, not the movement keys, Esc or a modifier. */
const SKIP_KEYS: ReadonlySet<string> = new Set(["Space", "Enter", "NumpadEnter", "KeyE"]);

// Skipping is deliberate. A held key's auto-repeats, Esc, modifiers and the
// movement keys do nothing, nothing skips in the first `SKIP_AFTER` seconds,
// and a click that only re-takes the pointer lock (`input.locked` is false —
// `../player/Input.ts` is asking for it in the very same event) does not skip.
// Registered after `../player/Input.ts`'s own listeners (this module imports
// it, so it evaluated first), so the event reaching the game's handlers still
// sees the lock: the skipping key or click does not also kick, reload or
// interact. A held movement key keeps walking once control arrives; a click
// does not also fire (`finish` clears `input.firing`).
addEventListener("keydown", (e) => {
  if (opening.active && opening.t >= SKIP_AFTER && !e.repeat && SKIP_KEYS.has(e.code)) skipOpening();
});
addEventListener("mousedown", () => {
  if (opening.active && opening.t >= SKIP_AFTER && input.locked) skipOpening();
});
