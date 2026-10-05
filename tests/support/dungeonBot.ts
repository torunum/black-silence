import type { BotEnemy, BotEvent, BotItem } from "./prologueBot";

/**
 * A PLAYER FOR THE DUNGEON (deeper-levels plan, Task 3) — the same kind of player as `prologueBot.ts`: not a good one, one who moves, shoots and
 * kicks, and plays through the game's own inputs (keys, mouse moves, clicks), reading only what a player can see. It differs in what the
 * level asks of it:
 *
 *  - **It follows a route it is handed** (cell centres, from the structure analysis' walk with the props and masses as walls), through
 *    doors (it taps E when a door is within reach on the route ahead, and the red key opens the gate it has found) to the exit's door.
 *  - **It picks things up**: health when it is hurt, bullets when it is low, the weapons it walks past (it holds the shotgun for what is close,
 *    the pistol otherwise: 34 a bullet is the thrifty one), within a few steps of the route and with a line of sight to them.
 *  - **It fights what it sees** as the prologue's bot does: the nearest monster in front of it within 14 m with a line of sight (or one at
 *    3 m, or any once it has just been hit), after a short reaction, turning at a human hand's speed, aiming with a wobble, reloading when
 *    empty and kicking when one is within 2 m. It presses on at what stands in its way and holds still for what does not. It never
 *    strafes, dodges or uses cover.
 *
 * The state it reads is handed in (`DungeonEyes`), so the same bot runs in vitest on the imported modules and in the Browser pane on the live ones.
 */

export interface DungeonEyes {
  player: { px: number; pz: number; pyy: number };
  input: { yaw: number; pitch: number };
  S: { hp: number; armor: number; cur: number; mag: number[]; ammo: Record<string, number>; kickCd: number; dead: boolean; won: boolean; key: boolean; weapons: boolean[] };
  world: { enemies: readonly BotEnemy[]; items: readonly BotItem[] };
  los: (x1: number, z1: number, x2: number, z2: number) => boolean;
  weaponAmmo: (cur: number) => string;
}

/** One point of the route, in world units, with the cell kind there (`+` and `D` are doors). */
export interface RoutePoint { x: number; z: number; ch: string; stage: string }

const SENS = .0022, SIGHT = 14, CONE = 70 * Math.PI / 180;
export const DUNGEON_SKILL = {
  usual: { turn: .08, react: 15, wobble: .35 },
  poor: { turn: .03, react: 42, wobble: 2 },
} as const;
const wrap = (a: number): number => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

export class DungeonBot {
  wp = 0;
  frame = 0;
  firing = false;
  keys = new Set<string>();
  kicks = 0;
  seen = 0;
  lastHp = 100;
  hitT = 0;
  lowest = 100;
  detour: BotItem | null = null;
  log: string[] = [];
  /** Where it was and when, to notice that it is stuck. */
  anchor = { x: 0, z: 0, f: 0 };
  stuck = 0;
  /** Frames left in which it takes no notice of what it sees: a monster it cannot reach (round a pillar) is not worth standing at. */
  ignore = 0;
  /** hp on reaching each stage, in the order met. */
  stages: Array<{ stage: string; frame: number; hp: number; armor: number }> = [];
  constructor(private eyes: DungeonEyes, private route: readonly RoutePoint[], private skill: { turn: number; react: number; wobble: number } = DUNGEON_SKILL.usual) {}

  private key(code: string, down: boolean, out: BotEvent[]): void {
    if (down === this.keys.has(code)) return;
    if (down) this.keys.add(code); else this.keys.delete(code);
    out.push({ kind: "key", type: down ? "keydown" : "keyup", code });
  }

  private turnTo(yaw: number, pitch: number, out: BotEvent[]): number {
    const { input } = this.eyes, T = this.skill.turn;
    const dy = wrap(yaw - input.yaw), dp = pitch - input.pitch;
    const mx = -Math.max(-T, Math.min(T, dy)) / SENS, my = -Math.max(-T / 2, Math.min(T / 2, dp)) / SENS;
    if (Math.abs(mx) > .5 || Math.abs(my) > .5) out.push({ kind: "move", movementX: Math.round(mx), movementY: Math.round(my) });
    return Math.abs(dy);
  }

  private target(): BotEnemy | null {
    const { player, world, los } = this.eyes;
    let best: BotEnemy | null = null, bd = SIGHT;
    for (const e of world.enemies) {
      if (e.dead || e.gone) continue;
      const dx = e.x - player.px, dz = e.z - player.pz, d = Math.hypot(dx, dz);
      const ahead = Math.abs(wrap(Math.atan2(-dx, -dz) - this.eyes.input.yaw)) < CONE;
      if (d < bd && (ahead || d < 3 || this.hitT > 0) && los(player.px, player.pz, e.x, e.z) && Math.abs((e.fy || 0) - (player.pyy - 1)) < 2.2) { bd = d; best = e; }
    }
    return best;
  }

  /** What it wants to go and pick up: health when hurt, bullets when low, a weapon it does not have; the nearest it can see. */
  private wanted(): BotItem | null {
    const { player, S, world, los } = this.eyes;
    const bullets = S.ammo.bullets + S.mag[S.cur] * (this.eyes.weaponAmmo(S.cur) === "bullets" ? 1 : 0);
    let best: BotItem | null = null, bd = 16;
    for (const it of world.items) {
      if (it.taken) continue;
      const need = (it.kind === "health" && S.hp < 62) || (it.kind === "bullets" && bullets < 70) || (it.kind === "shells" && S.weapons[1] && S.ammo.shells < 6)
        || (it.kind === "armor" && S.armor < 25) || (/^w\d$/.test(it.kind) && !S.weapons[+it.kind[1]]);
      if (!need) continue;
      const d = Math.hypot(it.x - player.px, it.z - player.pz);
      if (d < bd && los(player.px, player.pz, it.x, it.z)) { bd = d; best = it; }
    }
    return best;
  }

  /** One frame of play: the events to deliver. */
  step(frame: number): BotEvent[] {
    this.frame = frame;
    const out: BotEvent[] = [];
    const { player, S } = this.eyes;
    if (frame === 2) out.push({ kind: "pointerlock", locked: true });
    if (S.dead || S.won) { this.key("KeyW", false, out); this.key("KeyS", false, out); if (this.firing) { out.push({ kind: "button", type: "mouseup", button: 0 }); this.firing = false; } return out; }
    this.lowest = Math.min(this.lowest, S.hp);
    if (S.hp < this.lastHp) this.hitT = 45;
    this.lastHp = S.hp; this.hitT--;
    // the weapon for the moment: the shotgun for what is close (shells permitting), else the pistol (34 a bullet: the thrifty one), the rifle only when bullets are plenty
    {
      const near = this.target();
      const has = (w: number): boolean => S.weapons[w] && (S.ammo[this.eyes.weaponAmmo(w)] > 0 || S.mag[w] > 0);
      const closeBy = !!near && Math.hypot(near.x - player.px, near.z - player.pz) < 6;
      const want = closeBy && has(1) ? 1 : has(0) ? 0 : has(2) ? 2 : has(1) ? 1 : 0;
      const boss = !!near && near.key === "U" && has(2);   // the Guardian: the rifle's rate is what a long fight wants
      const plenty = boss || (S.ammo.bullets > 150 && has(2) && !closeBy) ? 2 : want;
      if (S.cur !== plenty && frame % 20 === 0 && !this.firing) out.push({ kind: "key", type: "keydown", code: `Digit${plenty + 1}` }, { kind: "key", type: "keyup", code: `Digit${plenty + 1}` });
    }
    this.ignore--;
    const t = this.ignore > 0 ? null : this.target();
    this.seen = t ? this.seen + 1 : 0;
    let wantFire = false;
    const gate = this.route[Math.min(this.wp, this.route.length - 1)];
    const engaged = !!t && this.seen > this.skill.react;
    if (engaged && t) {
      const dx = t.x - player.px, dz = t.z - player.pz, d = Math.hypot(dx, dz);
      const aimY = (t.fy || 0) + t.h * .5 - player.pyy;
      const wobble = (.045 * Math.sin(frame * .21) + .025 * Math.sin(frame * .57)) * this.skill.wobble;
      const off = this.turnTo(Math.atan2(-dx, -dz) + wobble, Math.atan2(aimY, d), out);
      const onWay = Math.abs(wrap(Math.atan2(-(gate.x - player.px), -(gate.z - player.pz)) - Math.atan2(-dx, -dz))) < Math.PI / 2;
      this.key("KeyW", onWay && d > 2.2, out);
      this.key("KeyS", d < 1.4, out);
      const empty = S.mag[S.cur] <= 0;
      if (empty && S.ammo[this.eyes.weaponAmmo(S.cur)] > 0 && frame % 20 === 0) out.push({ kind: "key", type: "keydown", code: "KeyR" }, { kind: "key", type: "keyup", code: "KeyR" });
      wantFire = off < .045 && !empty && d < 11;
      if (d < 2 && S.kickCd <= 0 && off < .3) { out.push({ kind: "button", type: "mousedown", button: 2 }, { kind: "button", type: "mouseup", button: 2 }); this.kicks++; }
    } else {
      this.key("KeyS", false, out);
      // reload a mostly empty magazine while nothing is in sight
      if (S.mag[S.cur] <= 1 && S.ammo[this.eyes.weaponAmmo(S.cur)] > 0 && frame % 40 === 0) out.push({ kind: "key", type: "keydown", code: "KeyR" }, { kind: "key", type: "keyup", code: "KeyR" });
      if (!this.detour) { const w = this.wanted(); if (w) { this.detour = w; this.log.push(`f${frame}: detour for ${w.kind} at hp ${S.hp}`); } }
      if (this.detour && (this.detour.taken || Math.hypot(this.detour.x - player.px, this.detour.z - player.pz) > 20)) this.detour = null;
      const goal = this.detour ? { x: this.detour.x, z: this.detour.z } : gate;
      const dx = goal.x - player.px, dz = goal.z - player.pz, d = Math.hypot(dx, dz);
      if (!this.detour && d < .95 && this.wp < this.route.length - 1) {
        this.wp++;
        const st = this.route[this.wp].stage;
        if (!this.stages.length || this.stages[this.stages.length - 1].stage !== st) { this.stages.push({ stage: st, frame, hp: S.hp, armor: S.armor }); this.log.push(`f${frame}: ${st} at hp ${S.hp}/${Math.round(S.armor)}`); }
      }
      const off = this.turnTo(Math.atan2(-dx, -dz), 0, out);
      this.key("KeyW", off < .5, out);
      // a door within reach on the way: knock (E), the key opens the gate
      if (frame % 14 === 0) for (let k = this.wp; k < Math.min(this.route.length, this.wp + 4); k++) {
        const p = this.route[k];
        if ((p.ch === "+" || p.ch === "D") && Math.hypot(p.x - player.px, p.z - player.pz) < 3) { out.push({ kind: "key", type: "keydown", code: "KeyE" }, { kind: "key", type: "keyup", code: "KeyE" }); break; }
      }
      // the exit's door: E at it as well
      if (frame % 14 === 7 && this.wp >= this.route.length - 2) out.push({ kind: "key", type: "keydown", code: "KeyE" }, { kind: "key", type: "keyup", code: "KeyE" });
    }
    // stuck: not 1.2 m from where it was 3 s ago while it wanted to walk
    if (frame - this.anchor.f >= 180) {
      if (Math.hypot(player.px - this.anchor.x, player.pz - this.anchor.z) < 1.2 && !(t && this.firing)) { this.ignore = 150; this.stuck++; this.log.push(`f${frame}: stuck at ${(player.px / 2).toFixed(1)},${(player.pz / 2).toFixed(1)} wp ${this.wp}`); if (this.stuck % 2 === 0 && this.wp < this.route.length - 1) this.wp++; this.detour = null; }
      this.anchor = { x: player.px, z: player.pz, f: frame };
    }
    if (wantFire !== this.firing) { out.push({ kind: "button", type: wantFire ? "mousedown" : "mouseup", button: 0 }); this.firing = wantFire; }
    return out;
  }
}
