import * as THREE from "three";
import { pick } from "../utils/math";
import { makeTex } from "../render/ProcTextures";
import { grain } from "../render/BandTextures";
import { track } from "../render/DisposeRegistry";
import { quietly } from "../fx/Quiet";
import { spawnP, smoke3d } from "../fx/Particles";
import { at } from "../audio/AudioEngine";
import { glassShatters } from "../audio/sounds/world";
import { alertSound } from "../enemies/ai/Perception";
import { S } from "../core/State";
import { CELL, WALLH } from "./Grid";

/**
 * THE WINDOWS, AND BREAKING THEM (owner: "kırılabilir cam pencereler"). A `W` cell is a wall with a window of stained glass on its
 * room side, a coloured light thrown into the room and a faint beam — built here, as `loadLevel` always built them (the same objects,
 * in the same order, the same draw for the colour). Now the glass breaks: a bullet into it, a stake, a blast nearby. It goes in a burst
 * of coloured shards falling into the room with a crash and a long tinkle; the pane is left a jagged ring of glass round a hole onto
 * the night, and the coloured light turns the cold grey of the moon. A broken window stays broken; it does not block anything that it
 * did not before (a `W` is a wall either way).
 */

const BROKEN_LIGHT = 0x8a98b4;

interface Pane { gx: number; gz: number; glass: THREE.Mesh; light: THREE.PointLight; cone: THREE.Mesh; col: number; broken: boolean; nx: number; nz: number }
const panes: Pane[] = [];

/** Forgets the last level's windows (`loadLevel`, before it builds the new ones). */
export function resetWindows(): void { panes.length = 0; }

/** Builds the window of the `W` cell (x, z), centred (wx, wz), looking into the room through its open side (dx, dz). */
export function addWindow(scene: THREE.Scene, x: number, z: number, wx: number, wz: number, dx: number, dz: number, mat: THREE.Material): void {
  const gm = new THREE.Mesh(track(new THREE.PlaneGeometry(1.6, 2.6)), mat);
  gm.position.set(wx + dx * (CELL / 2 + .02), WALLH * .56, wz + dz * (CELL / 2 + .02));
  gm.lookAt(wx + dx * 4, WALLH * .56, wz + dz * 4); gm.name = "window"; scene.add(gm);
  const col = pick([0x5a3a8e, 0x3a5a9e, 0x9e3a3a]);
  const wl = track(new THREE.PointLight(col, 1.1, 9, 1.5));
  wl.position.set(wx + dx * 1.7, WALLH * .6, wz + dz * 1.7); scene.add(wl);
  const cone = new THREE.Mesh(track(new THREE.ConeGeometry(1.2, WALLH - .6, 8, 1, true)),
    track(new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .05,
      side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })));
  cone.position.set(wx + dx * 1.7, (WALLH - .6) / 2, wz + dz * 1.7); cone.name = "windowCone"; scene.add(cone);
  panes.push({ gx: x, gz: z, glass: gm, light: wl, cone, col, broken: false, nx: dx, nz: dz });
}

let brokenTex: THREE.CanvasTexture | null = null;
/** The pane once it is broken: a ring of jagged coloured glass in the lead, round a hole onto a night sky with a few stars. */
function broken(): THREE.CanvasTexture {
  return brokenTex ??= quietly(() => makeTex((g, w, h) => {
    const cols = ["#5a2a6e", "#2a4a7e", "#7e2a2a", "#7e6a2a", "#2a6e4a"];
    const inArch = (x: number, y: number): boolean => {
      if (x < 12 || x >= w - 12 || y < 8) return false;
      const t = (y - 8) / (h - 8), half = (w - 24) / 2 * Math.min(1, Math.sqrt(t * 3.2));
      return Math.abs(x - w / 2) <= half;
    };
    g.fillStyle = "#0a0b0d"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inArch(x, y)) continue;
      // how far in from the arch's edge: the glass that stays clings to the lead, ragged
      let edge = 0;
      while (edge < 14 && inArch(x - edge, y) && inArch(x + edge, y) && inArch(x, y + edge) && inArch(x, y - edge)) edge++;
      const ragged = 4 + grain(x >> 1, y >> 2, 7) * 7;
      if (edge < ragged) g.fillStyle = cols[(grain(x >> 2, y >> 2, 9) * cols.length) | 0];
      else g.fillStyle = grain(x, y, 11) > .985 ? "#c8d0e0" : `rgb(${8 + (y >> 3)},${12 + (y >> 3)},${30 + (y >> 2)})`;
      g.fillRect(x, y, 1, 1);
    }
    g.strokeStyle = "#23262b"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(12, h); g.quadraticCurveTo(12, 18, w / 2, 8); g.quadraticCurveTo(w - 12, 18, w - 12, h); g.stroke();
  }));
}

/** Breaks a pane: the crash, the shards into the room, the hole and the moonlight. */
function shatter(p: Pane): void {
  p.broken = true;
  p.glass.material = track(new THREE.MeshBasicMaterial({ map: broken() }));
  p.light.color.setHex(BROKEN_LIGHT); p.light.intensity = .8;
  (p.cone.material as THREE.MeshBasicMaterial).color.setHex(BROKEN_LIGHT);
  const { x, y, z } = p.glass.position;
  const r = (p.col >> 16 & 255) / 255, gg = (p.col >> 8 & 255) / 255, b = (p.col & 255) / 255;
  for (let i = 0; i < 46; i++) {
    const u = (i % 9) / 8 - .5, v = ((i / 9) | 0) / 5 - .5, out = 1.2 + (i % 5) * .5;
    const lx = x + p.nz * u * 1.4, lz = z - p.nx * u * 1.4, ly = y + v * 2.2;
    const bright = i % 3 === 0 ? 1.6 : 1;
    spawnP(lx, ly, lz, p.nx * out + p.nz * u * 1.5, .4 + (i % 4) * .4, p.nz * out - p.nx * u * 1.5,
      Math.min(1, r * bright + .15), Math.min(1, gg * bright + .15), Math.min(1, b * bright + .15), .7 + (i % 6) * .15, 0);
  }
  smoke3d(x + p.nx * .4, y, z + p.nz * .4, 4);
  at(x, y, z, () => glassShatters());
  alertSound(x, z, 16);
  S.propsBroken++;
}

/** A shot or a stake struck the wall at (x, y, z): if that is a window's glass, it breaks. True if it did. */
export function hitWindow(x: number, y: number, z: number): boolean {
  const gx = x / CELL | 0, gz = z / CELL | 0;
  for (const p of panes) {
    if (p.broken || p.gx !== gx || p.gz !== gz) continue;
    if (Math.abs(y - p.glass.position.y) > 1.3) return false;
    shatter(p);
    return true;
  }
  return false;
}

/** A blast at (x, z): every whole pane within `r` breaks. */
export function blastWindows(x: number, z: number, r: number): void {
  for (const p of panes) if (!p.broken && Math.hypot(p.glass.position.x - x, p.glass.position.z - z) < r) shatter(p);
}

/** For the tests: how many panes the level has, and how many are broken. */
export function windowCount(): { panes: number; broken: number } { return { panes: panes.length, broken: panes.filter((p) => p.broken).length }; }
