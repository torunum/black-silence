import * as THREE from "three";
import { S } from "../core/State";
import { game } from "../core/Game";
import { input } from "../player/Input";
import { weaponRuntime } from "../weapons/WeaponRuntime";
import { screenShake } from "../fx/ShakeState";
import { renderState } from "../render/Renderer";
import { addSprite } from "../render/RenderCore";
import { ITEMTEX } from "../render/ItemTextures";
import { showMsg } from "../ui/HudMessages";
import { el } from "../ui/dom";
import { weaponRaise } from "../audio/sounds/foley";
import { WALLH } from "./Grid";
import { world } from "./WorldState";
import { LEVELS } from "./levels/index";
import { loadLevel } from "./LevelLoader";
import { applyInventory, igniteMark } from "./Checkpoints";
import { checkpoint as CP, RISE_MIN_HP, type Facts, type Snapshot } from "./CheckpointState";

/**
 * RISING AGAIN, AND STARTING OVER (deeper-levels plan, Task 1) — what the death screen's two choices
 * do. Death used to reload the page; neither choice does now, and neither reaches past `loadLevel`:
 * the level is built again by the one function that already cancels every timer, drops every scheduled
 * call, frees every GPU resource and replaces the scene, so nothing from the dead run — a pending
 * sound, a particle, a boss's attack, the music — is still running in the new one. What each choice
 * then puts back is `CheckpointState.ts`'s rule.
 *
 * ## RISE AGAIN AT THE LAST SHRINE (only if one was lit)
 *
 * The level, as `loadLevel` makes it, with the player where the shrine caught them, facing as they
 * faced; then what they carried (health, armour, the key, every weapon, magazine and ammunition
 count, the weapon in hand; health is at least `RISE_MIN_HP`, a mercy floor, armour as recorded) and the facts about the level (the dead stay dead, the taken stay taken,
 * the opened stay open). The checkpoint stays, so a second death rises at the same shrine.
 *
 * ## RESTART THE LEVEL
 *
 * The level as it was on entering it: the player at the spawn with what they walked in with (a chapter
 * select, the start of the run or the previous level's end — `CP.entry`), the world as built, no
 * checkpoint (a restart forgets them, as a first load does), every marker unlit.
 *
 * ## What a death does to the numbers
 *
 * Decided here so the grade stays honest:
 *  - **Kills, gibs, secrets, shots, hits, objects broken, and the run's kill/gib/secret totals** go back
 *    to the shrine's values (a restart: to nothing — `loadLevel` zeroes them — and the totals to what
 *    the player came in with). The enemies the dead run killed after the shrine are alive again, so
 *    keeping their kills would count them twice, and `gradeOf` divides kills by the enemies the level
 *    placed. Shots and hits go back with them: accuracy is the accuracy of the life being kept.
 *  - **Time**: the level's clock keeps what the lost stretch cost — the player played it — but does
 *    not count the seconds spent on the death screen. (A restart starts the clock over.) The time is
 *    shown on the chapter card and never graded.
 *  - **Deaths** are counted (`S.deaths`, shown once there is one) and cleared with the level.
 *  - Achievements already earned stay earned; `kickK` and `beheads`, whole-run counters of them, are
 *    not rewound.
 */

interface Rec { taken?: boolean; sp?: THREE.Object3D; mesh?: THREE.Object3D; open?: boolean; dead?: boolean; m?: THREE.Object3D }

/** The facts, applied to a level `loadLevel` has just built: ids mean the same on every load of a level (`CheckpointState.ts`). */
function replay(f: Facts): void {
  const scene = renderState.scene as THREE.Scene;
  for (const i of f.killed) {
    const e = world.enemies[i];
    if (!e || e.dead) continue;
    e.dead = true; e.gone = true; e.hp = 0; e.dormant = false;
    scene.remove(e.sp); scene.remove(e.blob);
  }
  for (const i of f.taken) {
    const it = world.items[i] as unknown as Rec | undefined;
    if (!it || it.taken) continue;
    it.taken = true; scene.remove(it.sp!);
  }
  for (const d of f.spawned) {
    world.items.push({ kind: d.kind, x: d.x, z: d.z, sp: addSprite(ITEMTEX[d.kind] as THREE.CanvasTexture, d.x, d.z, .55, .55, .5), bob: 0 });
  }
  for (const k of f.opened) {
    const d = world.doors[k] as unknown as Rec | undefined;
    if (!d) continue;
    d.open = true; d.mesh!.position.y = -WALLH / 2;   // all the way down, as `doorTick` leaves one
  }
  for (const i of f.broken) {
    const p = world.props[i] as unknown as Rec | undefined;
    if (!p || p.dead) continue;
    p.dead = true; scene.remove(p.m!);
  }
  const ch = world.challenge as unknown as { state: number; plate: { material: { color: THREE.Color } }; light: { color: THREE.Color } } | null;
  if (ch && f.challenge === 2) {   // a cleared plate stays cleared; a wave under way starts over (state 0)
    ch.state = 2; ch.plate.material.color.setHex(0x4ab86a); ch.light.color.setHex(0x4ab86a);
  }
}

/** What the player does not carry across a death: a held key, a half-played reload, a lean of the camera, a locked cinematic. */
function settle(): void {
  game.inputLock = false; input.firing = false; input.zoomOn = false; S.kickCd = 0;
  Object.assign(weaponRuntime, { wstate: "equip", wtime: 0, wCool: 0, pending: -1, reloadFlags: {}, recoilPitch: 0, kickAmt: 0, kickRot: 0, muzzle: 0, zoomLerp: 0, kickAnim: 0, volleyHit: false });
  screenShake.trauma = 0; screenShake.hitStop = 0;
  el("dead").classList.add("hidden");
  renderState.renderer.domElement.requestPointerLock?.();
  weaponRaise();
}

/** Rise at the last shrine. False if there is none, or the player is not dead. */
export function riseAgain(): boolean {
  const snap: Snapshot | null = CP.snap;
  if (!snap || !S.dead) return false;
  const t0 = S.levelT0, away = performance.now() - CP.deadAt, deaths = S.deaths;
  loadLevel(S.level, { at: snap.at });
  applyInventory(snap.inv);
  S.hp = Math.max(S.hp, RISE_MIN_HP);   // a mercy floor: a shrine reached at 3 hp does not raise you at 3 hp
  Object.assign(S, snap.tallies);
  S.deaths = deaths; S.levelT0 = t0 + away;
  replay(snap.facts);
  snap.lit.forEach((i) => { const m = CP.marks[i]; if (m && !m.lit) igniteMark(m, i); });
  settle();
  showMsg("YOU RISE AGAIN", 2.6);
  return true;
}

/** Start the level over, as it was when entered, with nothing lit. False if the player is not dead. */
export function restartLevel(): boolean {
  if (!S.dead) return false;
  const deaths = S.deaths, entry = CP.entry;
  loadLevel(S.level, {});
  CP.snap = null;
  if (entry) applyInventory(entry);
  S.deaths = deaths;
  settle();
  showMsg(LEVELS[S.level].name, 3);
  return true;
}
