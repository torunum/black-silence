import { ENEMY_DEFS } from "../../enemies/EnemyDefs";
import { WEAPON_STATS } from "../../weapons/definitions";
import { classifyGlyph, ITEM_KIND } from "../density";
import { chAt, isFloor, type Terrain } from "./walk";
import type { Region } from "./regions";

/**
 * THE NUMBERS A LEVEL IS DESIGNED BY (deeper-levels plan, Task 2): vertical structure, and what each fight is
 * worth against what the player can have found by then. Pure, over a `Terrain` and the regions of `regions.ts`.
 */

/** Distinct floor heights and the boundaries between constant-height patches. */
export function verticality(t: Terrain): { heights: number; transitions: number } {
  const q = (h: number): number => Math.round(h * 20), N = t.W * t.H;
  const floor = (c: number): boolean => { const ch = chAt(t, c); return ch !== undefined && !"#WI".includes(ch) && ch !== "S"; };
  const patch = new Int32Array(N).fill(-1), heights = new Set<number>();
  let n = 0;
  for (let c = 0; c < N; c++) {
    if (!floor(c) || patch[c] >= 0) continue;
    const h = q(t.floor[c]), stack = [c];
    heights.add(h); patch[c] = n;
    while (stack.length) {
      const s = stack.pop()!, x = s % t.W, z = Math.floor(s / t.W);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= t.W || nz >= t.H) continue;
        const m = nz * t.W + nx;
        if (patch[m] < 0 && floor(m) && q(t.floor[m]) === h) { patch[m] = n; stack.push(m); }
      }
    }
    n++;
  }
  const pairs = new Set<string>();
  for (let c = 0; c < N; c++) {
    if (patch[c] < 0) continue;
    for (const m of [c + 1, c + t.W]) {
      if (m >= N || patch[m] < 0 || patch[m] === patch[c] || (m === c + 1 && m % t.W === 0)) continue;
      pairs.add(patch[c] < patch[m] ? `${patch[c]},${patch[m]}` : `${patch[m]},${patch[c]}`);
    }
  }
  return { heights: heights.size, transitions: pairs.size };
}

/**
 * What a pickup is worth. The amounts mirror `itemsTick` (`src/player/Interact.ts`) and are pinned to it by a test
 * that reads the source: ammunition by kind, health +25 (only below 100), armour +50.
 */
export const AMMO_AMOUNT: Readonly<Record<string, number>> = { bullets: 18, shells: 6, slugs: 4, crosses: 3, nails: 40, souls: 3 };
export const HEALTH_AMOUNT = 25, ARMOUR_AMOUNT = 50;
/** What the player walks in with (`State.ts`): 60 bullets for the flare pistol. */
export const START_AMMO: Readonly<Record<string, number>> = { bullets: 60 };
/** A shot that lands is rare enough: half of the damage on paper is what a supply of ammunition is worth. */
export const HIT_RATE = 0.5;

/** The damage one unit of each ammunition does, of the first weapon (in slot order, which a player owns first) that fires it, pellets and all. */
export const DAMAGE_PER_AMMO: Readonly<Record<string, number>> = (() => {
  const out: Record<string, number> = {};
  for (const w of WEAPON_STATS) if (!(w.ammo in out)) out[w.ammo] = w.dmg * w.pellets;
  return out;
})();

/** The ammunition kind a pickup glyph is, or null. */
export function ammoKind(ch: string): string | null {
  const k = ITEM_KIND[ch];
  return k && k in AMMO_AMOUNT ? k : null;
}

/** Damage a pile of ammunition is worth. */
export const potential = (ammo: Readonly<Record<string, number>>): number =>
  Object.entries(ammo).reduce((n, [k, v]) => n + v * (DAMAGE_PER_AMMO[k] ?? 0) * HIT_RATE, 0);

export interface Encounter {
  region: number;
  kind: Region["kind"];
  x0: number; z0: number; x1: number; z1: number;
  cells: number;
  enemies: number;
  /** Of them, bosses and minibosses (a boss in `ENEMY_DEFS`, or any enemy of 600 hp or more). */
  bosses: number;
  /** Hit points of the rank and file, and of bosses and minibosses, apart. */
  hp: number;
  bossHp: number;
  /** Damage the ammunition found before this region and inside it is worth, with what the player starts with. */
  supply: number;
  health: number;
  armour: number;
  /** `supply / (hp + bossHp)`; infinity when nothing stands there. */
  ratio: number;
  plate: boolean;
}

/**
 * For every region with an enemy in it: how many hit points stand in it, and what has been findable by the time the
 * player gets there. `dist` is the fewest steps to each cell with no secret opened; a pickup counts as *before* a
 * region if it is nearer the spawn than the region's nearest cell, and *inside* if it is in it. Pickups behind a
 * secret door (`dist` -1) are not counted: the way through a level is played without finding them. What an
 * enemy drops is not counted either, which makes a supply a little worse than a player's.
 */
export function encounters(t: Terrain, regions: readonly Region[], of: Int32Array, dist: Int32Array): Encounter[] {
  interface Item { c: number; ammo?: string; health: boolean; armour: boolean }
  const items: Item[] = [], foes: Array<{ c: number; ch: string }> = [], plates = new Set<number>();
  for (let c = 0; c < t.W * t.H; c++) {
    const ch = chAt(t, c);
    if (!ch || !isFloor(ch)) continue;
    const cls = classifyGlyph(ch);
    if (cls === "enemy") foes.push({ c, ch });
    else if (cls === "plate" && of[c] >= 0) plates.add(of[c]);
    else if (cls === "pickup" && dist[c] >= 0) {
      const k = ITEM_KIND[ch];
      items.push({ c, ammo: ammoKind(ch) ?? undefined, health: k === "health", armour: k === "armor" });
    }
  }
  const out: Encounter[] = [];
  const byRegion = new Map<number, Array<{ c: number; ch: string }>>();
  for (const f of foes) if (of[f.c] >= 0) (byRegion.get(of[f.c]) || byRegion.set(of[f.c], []).get(of[f.c])!).push(f);
  for (const [rid, list] of byRegion) {
    const r = regions[rid];
    const entry = Math.min(...r.cells.filter((c) => dist[c] >= 0).map((c) => dist[c]));
    if (!Number.isFinite(entry)) continue;   // behind a secret door: no way through the level goes there
    let hp = 0, bossHp = 0, bosses = 0;
    for (const f of list) { const d = ENEMY_DEFS[f.ch]; if (d.boss || d.hp >= 600) { bossHp += d.hp; bosses++; } else hp += d.hp; }
    const ammo: Record<string, number> = { ...START_AMMO };
    let health = 0, armour = 0;
    for (const it of items) {
      if (!(of[it.c] === rid || dist[it.c] < entry)) continue;
      if (it.ammo) ammo[it.ammo] = (ammo[it.ammo] || 0) + AMMO_AMOUNT[it.ammo];
      if (it.health) health += HEALTH_AMOUNT;
      if (it.armour) armour += ARMOUR_AMOUNT;
    }
    const supply = potential(ammo);
    out.push({
      region: rid, kind: r.kind, x0: r.x0, z0: r.z0, x1: r.x1, z1: r.z1, cells: r.cells.length, enemies: list.length, bosses, hp, bossHp,
      supply, health, armour, ratio: hp + bossHp ? supply / (hp + bossHp) : Infinity, plate: plates.has(rid),
    });
  }
  return out.sort((a, b) => a.z0 - b.z0 || a.x0 - b.x0);
}

/** An arena: a room of at least `ARENA_CELLS` cells with at least `ARENA_WEIGHT` of enemies in it, a boss counting `BOSS_WEIGHT`. */
export const ARENA_CELLS = 60, ARENA_WEIGHT = 8, BOSS_WEIGHT = 4;
export const isArena = (e: Encounter): boolean => e.kind === "room" && e.cells >= ARENA_CELLS && e.enemies - e.bosses + e.bosses * BOSS_WEIGHT >= ARENA_WEIGHT;
