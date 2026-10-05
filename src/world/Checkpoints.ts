import * as THREE from "three";
import { track } from "../render/DisposeRegistry";
import { renderState } from "../render/Renderer";
import { DRESSTEX } from "../render/DressTextures";
import { showMsg } from "../ui/HudMessages";
import { at } from "../audio/AudioEngine";
import { shrineLights } from "../audio/sounds/world";
import { S } from "../core/State";
import { player } from "../player/PlayerState";
import { input } from "../player/Input";
import { CELL } from "./Grid";
import { world } from "./WorldState";
import { floorHeightAt } from "./Collision";
import type { BuiltLevel } from "./LevelBuilder";
import { CHECKPOINTS, LIT_RADIUS } from "./decor/checkpoint";
import { checkpoint as CP, type Facts, type Inventory, type Mark, type Snapshot } from "./CheckpointState";

/**
 * CHECKPOINTS — the marker that lights, and the record it takes. Deeper-levels plan, Task 1. The
 * rule (reload the level, replay recorded facts) and why is in `CheckpointState.ts`; what happens on
 * death is `src/world/Respawn.ts`; the death screen is `src/ui/DeathScreen.ts`.
 *
 * A level lists its markers as ordinary decor (`DecorSpec`s whose kind is one of `CHECKPOINTS`, so a
 * level author places one the way they place a sconce: `d.place("candlestub", 18, 24)`), and the
 * piece draws itself unlit as part of the level's merged decor meshes. This file reads the same list
 * to know where they are. When the player comes within `LIT_RADIUS` of one that is not lit, it catches:
 * a flame sprite on each of the piece's anchors and an additive glow over them (no point light: the
 * lights of a level are a budget, and a light added mid-level makes three.js rebuild every lit
 * material), a sound from the marker, a line on the HUD, and the snapshot.
 *
 * **Level changes clear them.** `buildCheckpoints` runs in every `loadLevel`: a first load (the menu, a
 * chapter select, the next level) forgets the last snapshot and records what the player came in with;
 * a reload for a death keeps both (`Respawn.ts` is the only caller that asks for that).
 *
 * Nothing here calls `Math.random`: the glow pulses on a clock this file advances, the flame flickers
 * through `world.candles` (`torchTick`'s sine).
 */

const rec = (it: unknown): { taken?: boolean; kind: string; x: number; z: number } => it as { taken?: boolean; kind: string; x: number; z: number };

export function takeInventory(): Inventory {
  return {
    hp: S.hp, armor: S.armor, key: S.key, ammo: { ...S.ammo }, mag: [...S.mag], weapons: [...S.weapons], cur: S.cur,
    totKills: S.totKills, totGibs: S.totGibs, totSecrets: S.totSecrets,
  };
}

/** Puts what the player carried back, in place (the arrays and the ammo object keep their identity: things hold them). */
export function applyInventory(inv: Inventory): void {
  S.hp = inv.hp; S.armor = inv.armor; S.key = inv.key; S.cur = inv.cur;
  Object.assign(S.ammo, inv.ammo);
  inv.mag.forEach((v, i) => { S.mag[i] = v; });
  inv.weapons.forEach((v, i) => { S.weapons[i] = v; });
  S.totKills = inv.totKills; S.totGibs = inv.totGibs; S.totSecrets = inv.totSecrets;
}

export const hasCheckpoint = (): boolean => CP.snap !== null;

/** Builds the level's markers from its decor list; on a first load, also forgets the old snapshot and records what the player came in with. Called by `loadLevel` once the grid's things exist. */
export function buildCheckpoints(L: Pick<BuiltLevel, "decor">, keep: boolean): void {
  CP.marks = [];
  for (const d of L.decor || []) {
    const look = CHECKPOINTS[d.k];
    if (!look) continue;
    const wx = (d.x + .5) * CELL, wz = (d.z + .5) * CELL, r = d.r || 0, fy = floorHeightAt(wx, wz);
    CP.marks.push({
      k: d.k, look, x: wx, z: wz, lit: false, sprites: [],
      flames: look.anchors.map(([ax, ay, az]) => ({ x: wx + ax * Math.cos(r) + az * Math.sin(r), y: fy + ay, z: wz - ax * Math.sin(r) + az * Math.cos(r) })),
    });
  }
  CP.base = { enemies: world.enemies.length, items: world.items.length, props: world.props.length };
  CP.pulse = 0;
  if (!keep) { CP.snap = null; CP.entry = takeInventory(); S.deaths = 0; }
}

function facts(): Facts {
  const killed: number[] = [], taken: number[] = [], spawned: Facts["spawned"] = [], broken: number[] = [];
  world.enemies.forEach((e, i) => { if (i < CP.base.enemies && e.dead) killed.push(i); });
  world.items.forEach((raw, i) => {
    const it = rec(raw);
    if (i < CP.base.items) { if (it.taken) taken.push(i); } else if (!it.taken) spawned.push({ kind: it.kind, x: it.x, z: it.z });
  });
  world.props.forEach((p, i) => { if (i < CP.base.props && p.dead) broken.push(i); });
  const opened = Object.keys(world.doors).filter((k) => (world.doors[k] as { open?: boolean }).open);
  return { killed, taken, spawned, opened, broken, challenge: (world.challenge as { state?: number } | null)?.state ?? 0 };
}

/** What a marker records as it catches. */
function capture(index: number): Snapshot {
  return {
    mark: index, lit: CP.marks.flatMap((m, i) => (m.lit ? [i] : [])),
    at: { x: player.px, z: player.pz, yaw: input.yaw },
    inv: takeInventory(),
    tallies: { kills: S.kills, gibs: S.gibs, secrets: S.secrets, shots: S.shots, hitsLanded: S.hitsLanded, propsBroken: S.propsBroken },
    facts: facts(),
  };
}

/** The flame, and the glow over it, standing where the marker's flames go. In the scene, so the next load drops them with it. */
export function igniteMark(m: Mark, index: number): void {
  m.lit = true;
  const look = m.look, scene = renderState.scene as THREE.Scene;
  for (const f of m.flames) {
    const flame = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: DRESSTEX.spark, color: look.flame, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    flame.scale.set(look.size[0], look.size[1], 1); flame.position.set(f.x, f.y + look.size[1] * .35, f.z); flame.name = "checkpointFlame";
    const glow = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: DRESSTEX.spark, color: look.glow, transparent: true, opacity: .32, depthWrite: false, blending: THREE.AdditiveBlending })));
    glow.scale.set(look.halo, look.halo, 1); glow.position.set(f.x, f.y + .05, f.z); glow.name = "checkpointGlow";
    scene.add(flame); scene.add(glow);
    m.sprites.push(flame, glow);
    world.candles.push({ sp: flame, x: f.x, z: f.z, seed: index * 3 + m.sprites.length });   // flickers with the level's candles
  }
}

/** Each `playerTick`: the player comes near an unlit marker and it catches. */
export function checkpointTick(dt: number): void {
  if (!CP.marks.length) return;
  CP.pulse += dt;
  CP.marks.forEach((m, i) => {
    if (m.lit) {
      const k = .3 + Math.sin(CP.pulse * 2.4 + i) * .07;   // the glow breathes
      for (const s of m.sprites) if (s.name === "checkpointGlow") (s.material as THREE.SpriteMaterial).opacity = k;
      return;
    }
    if (Math.hypot(player.px - m.x, player.pz - m.z) > LIT_RADIUS) return;
    if (Math.abs(floorHeightAt(m.x, m.z) - floorHeightAt(player.px, player.pz)) > 1.6) return;   // not through the floor
    igniteMark(m, i);
    CP.snap = capture(i);
    const f = m.flames[0];
    at(f.x, f.y, f.z, () => shrineLights());
    showMsg(m.look.msg + " — YOU WILL RISE HERE", 3.2);
  });
}
