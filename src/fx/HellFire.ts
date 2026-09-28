import * as THREE from "three";
import { grain } from "../render/BandTextures";
import { DRESSTEX } from "../render/DressTextures";
import { track } from "../render/DisposeRegistry";

/**
 * HELL'S FIRE — flames and embers rising off a burning pit and out of its
 * braziers, and the heat flicker of the pit's glow (the prologue plan's
 * Task 3, `docs/superpowers/plans/2026-09-27-player-feedback-2-prologue.md`).
 *
 * **Pooled, fixed budget, no allocation per frame.** Two `THREE.Points`,
 * built once per level from `Decor.ts` (only on a level whose decor names
 * fire — today the prologue): `FLAMES` (240) big soft flames and `EMBERS`
 * (120) sparks. Their position and colour buffers are allocated at build and
 * rewritten in place each frame; nothing is created, pushed or spliced
 * while the level runs, and the two scene children are the only ones this
 * module ever adds. The shared blood-and-sparks pool (`Particles.ts`) is
 * left alone, so a fight in hell cannot be starved of blood by the fire.
 *
 * **Every particle is a pure function of the clock.** Particle `i` lives a
 * fixed life, over and over; its `n`th life starts from an emitter, an
 * offset and a speed chosen by `grain(i, n)` — the integer hash — so the
 * fire needs no generator state and never calls `Math.random`: the trace
 * harness's seeded stream is untouched however long it burns. The clock is
 * `fireTick`'s own sum of `dt`.
 *
 * **Heat flicker.** The pit's glow lights (`decorLight`, `Decor.ts`) swell
 * and gutter on three incommensurate sines — intensity only; their colour
 * and position, which the traces record, never change.
 */

/** Pool sizes: the whole budget, fixed at build. */
export const FLAMES = 240, EMBERS = 120;

/** Where fire comes from: a burning floor cell (a wide, low source) or a brazier's bowl (a tight one). */
export interface Emitter { x: number; y: number; z: number; spread: number; brazier: boolean }

interface Light { L: THREE.PointLight; base: number; seed: number }

const fire = {
  t: 0,
  pit: [] as Emitter[],
  bowls: [] as Emitter[],
  lights: [] as Light[],
  flames: null as THREE.Points | null,
  embers: null as THREE.Points | null,
};

function points(n: number, size: number, scene: THREE.Scene, name: string): THREE.Points {
  const g = track(new THREE.BufferGeometry());
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos[i * 3 + 1] = -100;
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = track(new THREE.PointsMaterial({ size, map: DRESSTEX.spark || null, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));   // fire is its own light
  const p = new THREE.Points(g, m);
  p.name = name; p.frustumCulled = false; scene.add(p);
  return p;
}

/** Called by `Decor.ts` once per level: the fire's sources and the lights that flicker with it. Nothing on a level without any. */
export function buildFire(scene: THREE.Scene, emitters: Emitter[], lights: THREE.PointLight[]): void {
  fire.t = 0;
  fire.pit = emitters.filter((e) => !e.brazier);
  fire.bowls = emitters.filter((e) => e.brazier);
  fire.lights = lights.map((L, i) => ({ L, base: L.intensity, seed: i * 1.7 + .3 }));
  fire.flames = fire.embers = null;
  if (!emitters.length) return;
  fire.flames = points(FLAMES, .75, scene, "fireFlames");
  fire.embers = points(EMBERS, .12, scene, "fireEmbers");
}

/** The source of particle `i`'s `n`th life: a brazier for about one in seven (if there are braziers), else a burning cell. */
function source(i: number, n: number): Emitter {
  const pick = grain(i, n, 91);
  const useBowl = fire.bowls.length && (!fire.pit.length || pick < .15);
  const list = useBowl ? fire.bowls : fire.pit;
  return list[Math.floor(grain(i, n, 92) * list.length) % list.length];
}

/** Every frame, from `Loop.ts`'s render block (it is only light and colour). */
export function fireTick(dt: number): void {
  if (!fire.flames || !fire.embers) return;
  const t = (fire.t += dt);
  step(fire.flames, FLAMES, t, false);
  step(fire.embers, EMBERS, t, true);
  for (const l of fire.lights) {
    const s = l.seed;
    l.L.intensity = l.base * (1 + .22 * Math.sin(t * 7.3 + s) * Math.sin(t * 3.1 + 2 * s) + .08 * Math.sin(t * 19.7 + 3 * s));
  }
}

function step(p: THREE.Points, n: number, t: number, ember: boolean): void {
  const pos = p.geometry.attributes.position as THREE.BufferAttribute, col = p.geometry.attributes.color as THREE.BufferAttribute;
  const P = pos.array as Float32Array, C = col.array as Float32Array;
  for (let i = 0; i < n; i++) {
    const life = ember ? 2.2 + 1.4 * grain(i, 0, 93) : .5 + .4 * grain(i, 0, 94);
    const phase = t / life + grain(i, 1, 95), cycle = Math.floor(phase), age = phase - cycle;
    const e = source(i, cycle + (ember ? 7919 : 0));
    const ox = (grain(i, cycle, 96) - .5) * e.spread, oz = (grain(i, cycle, 97) - .5) * e.spread;
    const k = i * 3;
    if (ember) {
      // sparks climb high on the heat, drifting and weaving, and wink out
      const rise = (2.5 + 3.5 * grain(i, cycle, 98)) * age;
      P[k] = e.x + ox + Math.sin(t * 1.3 + i) * .35 * age;
      P[k + 1] = e.y + .3 + rise;
      P[k + 2] = e.z + oz + Math.cos(t * 1.1 + i * 1.7) * .35 * age;
      const glow = (1 - age) * (.6 + .4 * Math.sin(t * 17 + i * 3.1));
      C[k] = glow; C[k + 1] = .45 * glow; C[k + 2] = .1 * glow;
    } else {
      // a flame licks up and narrows, yellow to orange to a dull red, and is gone
      const rise = (e.brazier ? .7 : 1.1) * (.6 + .4 * grain(i, cycle, 99)) * age;
      const pull = 1 - .6 * age;
      P[k] = e.x + ox * pull + Math.sin(t * 6 + i) * .06 * age;
      P[k + 1] = e.y + .05 + rise;
      P[k + 2] = e.z + oz * pull;
      const f = Math.pow(1 - age, 1.3) * Math.min(1, age * 8);
      C[k] = .9 * f; C[k + 1] = (.5 - .35 * age) * f; C[k + 2] = (.12 - .1 * age) * f;
    }
  }
  pos.needsUpdate = true; col.needsUpdate = true;
}

/** What the pool holds — for tests: its two buffers' lengths never change after `buildFire`. */
export function firePool(): { flames: THREE.Points | null; embers: THREE.Points | null; sources: number; lights: number } {
  return { flames: fire.flames, embers: fire.embers, sources: fire.pit.length + fire.bowls.length, lights: fire.lights.length };
}
