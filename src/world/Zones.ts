import * as THREE from "three";
import { renderState } from "../render/Renderer";
import { setRoom } from "../audio/AudioEngine";
import { roomFor } from "../audio/Room";
import { say } from "../ui/Subtitles";
import { player } from "../player/PlayerState";
import { CELL } from "./Grid";
import { world } from "./WorldState";
import { ambienceState } from "./AmbienceState";
import type { BuiltLevel, ZoneTheme } from "./LevelBuilder";
import type { LevelDef } from "./levels/index";

/**
 * CROSSING FROM ONE ZONE INTO ANOTHER — the live half of level zones (the
 * read half, textures by cell, is `ZoneLook.ts`).
 *
 * A zone carries a `LevelDef`'s own light and fog fields and theme flags, so
 * everything `loadLevel` used to set once per level can follow the player:
 *
 * - **Fog and sky.** `scene.fog`'s colour and density and `scene.background`
 *   ease toward the zone the player stands in. Background and fog move
 *   together because the far walls fade *into* the fog colour — a background
 *   of another colour would draw a seam round every silhouette.
 * - **Ambient light**, colour and intensity (at `loadLevel`'s own `*0.42`).
 *   The intensity is left alone while the random blackout event has the
 *   lights out (`ambienceState.darkT`), so the two never fight; the event
 *   restores its saved level and the ease carries on from there.
 * - **The reverb room**, by `roomFor` (`src/audio/Room.ts`), set once on the
 *   step that crosses the boundary. Footsteps and bullet hits already ask the
 *   room what they are walking on (`src/audio/Surface.ts`), so the surface
 *   follows with no wiring of its own. The mix swaps the convolver at once:
 *   a reverb tail ringing at the moment of the crossing is cut, not faded —
 *   `Mix.ts` has one convolver slot, and a crossfade between two would be a
 *   change to the mix, not to a level.
 * - **ADEM's line**, `say(line, true)`, the first time a zone is entered in a
 *   load — never for the zone the level starts in, which has the level's own
 *   opening line.
 *
 * The ease is `1 - exp(-dt * EASE)` a frame — frame-rate independent, and
 * drawing nothing from `Math.random`. It allocates nothing per frame (each
 * theme's colours are built once), and once every value is within a hair of
 * its target it snaps there and does no more work. The one draw this file causes is
 * `say()`'s own pick of which line to speak (`Subtitles.ts`, as every `say`
 * has always picked), once on the first entry into each zone that has a
 * line: three in a whole prologue, none standing still or coming back —
 * `tests/world/zones.test.ts` counts them. On a level with no zones `zoneTick`
 * returns on its first line and `enterZones` touches nothing, so the other
 * seven levels, and the two trace fixtures recorded on them, cannot see it.
 */

/** How fast fog and light ease toward the zone the player is in, per second. ~1.5 s to settle. */
export const EASE = 2.2;

const zs = { cur: -1, seen: new Set<number>() };

/** Closer than this — a quarter of one 8-bit step in a channel, or 1e-4 of fog density — and the ease snaps to its target, exactly, and stops. */
const EPS_C = 1 / 1024, EPS_D = 1e-4;
const far = (a: THREE.Color, b: THREE.Color): boolean =>
  Math.abs(a.r - b.r) > EPS_C || Math.abs(a.g - b.g) > EPS_C || Math.abs(a.b - b.b) > EPS_C;
const off = (a: THREE.Color, b: THREE.Color): boolean => a.r !== b.r || a.g !== b.g || a.b !== b.b;

/** A theme's fog and ambient colours, built once per theme — `step` runs every frame and allocates nothing. */
const palette = new WeakMap<ZoneTheme, { fog: THREE.Color; amb: THREE.Color }>();
function colours(t: ZoneTheme): { fog: THREE.Color; amb: THREE.Color } {
  let c = palette.get(t);
  if (!c) palette.set(t, c = { fog: new THREE.Color(t.fog), amb: new THREE.Color(t.amb) });
  return c;
}

/** The look a level starts with: the spawn cell's zone on a zoned level, else the level's own definition. */
export function levelLook(def: LevelDef, L: BuiltLevel): LevelDef | ZoneTheme {
  if (!L.zones) return def;
  for (let z = 0; z < L.H; z++) for (let x = 0; x < L.W; x++)
    if (L.g[z][x] === "P") return L.zones.themes[L.zones.map[z][x]] || def;
  return def;
}

/** The index of the zone the player is standing in, or -1. */
export function currentZone(): number { return zs.cur; }

/** The room tone of the zone the player is standing in (`ZoneBed.ts`), or null — always null on an unzoned level. */
export function currentBed(): "hell" | "yard" | null {
  const t = world.zones && zs.cur >= 0 ? world.zones.themes[zs.cur] : null;
  return (t && t.bed) || null;
}

/** Called once by `loadLevel`, after the player is placed: the start zone, snapped, silent. */
export function enterZones(): void {
  zs.cur = -1; zs.seen.clear();
  if (world.zones) step(0, true);
}

/** Every gameplay frame, from `src/core/Loop.ts`. */
export function zoneTick(dt: number): void {
  if (!world.zones) return;
  step(dt, false);
}

function step(dt: number, snap: boolean): void {
  const zm = world.zones!;
  const row = zm.map[player.pz / CELL | 0];
  const i = row ? row[player.px / CELL | 0] : undefined;
  if (i !== undefined && zm.themes[i] && i !== zs.cur) {
    zs.cur = i;
    const t = zm.themes[i];
    setRoom(roomFor(t));
    if (!zs.seen.has(i)) { zs.seen.add(i); if (t.line && !snap) say(t.line, true); }
  }
  if (zs.cur < 0) return;
  const t = zm.themes[zs.cur];
  const to = colours(t);
  const scene = renderState.scene as THREE.Scene;
  const fog = scene.fog as THREE.FogExp2 | null;
  const bg = scene.background instanceof THREE.Color ? scene.background : null;
  const amb = renderState.ambLight;
  const fogD = t.fogD * 1.5, ambI = t.ambI * 0.42, dark = ambienceState.darkT > 0;
  // settled — every value exactly on its target — nothing to ease, so nothing to do: these comparisons are the whole cost of a frame
  if (!snap && !(fog && (off(fog.color, to.fog) || fogD !== fog.density)) && !(bg && off(bg, to.fog)) &&
      !(amb && (off(amb.color, to.amb) || (!dark && ambI !== amb.intensity)))) return;
  const k = snap ? 1 : 1 - Math.exp(-dt * EASE);
  const settle = (c: THREE.Color, target: THREE.Color): void => { if (far(c, target)) c.lerp(target, k); else c.copy(target); };
  if (fog) { settle(fog.color, to.fog); fog.density = Math.abs(fogD - fog.density) > EPS_D ? fog.density + (fogD - fog.density) * k : fogD; }
  if (bg) settle(bg, to.fog);
  if (amb) {
    settle(amb.color, to.amb);
    if (!dark) amb.intensity = Math.abs(ambI - amb.intensity) > EPS_D ? amb.intensity + (ambI - amb.intensity) * k : ambI;
  }
}
