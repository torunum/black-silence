/**
 * A PLAYER FOR THE PROLOGUE — not a good one: one who moves, shoots and
 * kicks, and does not try hard (the prologue plan's Task 3: "a player who
 * moves, shoots and kicks gets through on a first try without trying
 * hard"). It plays through the game's own inputs — keys, mouse moves,
 * clicks — reading only what a player can see: where it is, which way it
 * faces, its health and ammo, and the monsters in its line of sight.
 *
 * - **Walks the route**: grave -> mausoleum -> crypt stair -> hell's west
 *   bank -> the bridge -> the east bank -> the field of pyres -> the throne
 *   hall -> the climb -> the exit. When hurt
 *   below 55 it detours to the nearest health it has seen on the way.
 * - **Fights what it sees**: the nearest monster within 14 m in line of
 *   sight *and in front of it* (a 70-degree cone either side), or one it
 *   bumps into (3 m), or anything once it has just been hit — so a monster
 *   coming from behind gets a free swing. It reacts after a third of a
 *   second, turns at a human hand's speed (3.6 rad/s, no flicks), aims with
 *   a wobble, holds fire once roughly on target, reloads when empty, kicks
 *   when one is within 2 m and the kick is ready, and backs off a step when
 *   something is on top of it. It presses on at a monster standing in its way
 *   (walking at it while it shoots) and holds still for one off to the side.
 *   It never strafes, dodges or uses cover.
 *
 * The state it reads is handed in (`BotEyes`), so the same bot runs in
 * vitest on the imported modules and in the Browser pane on the live ones.
 */

export interface BotEnemy { x: number; z: number; h: number; fy?: number; dead: boolean; gone?: boolean; key: string }
export interface BotItem { kind: string; x: number; z: number; taken?: boolean }
export interface BotEyes {
  player: { px: number; pz: number; pyy: number };
  input: { yaw: number; pitch: number };
  S: { hp: number; cur: number; mag: number[]; ammo: Record<string, number>; kickCd: number; dead: boolean; won: boolean };
  world: { enemies: readonly BotEnemy[]; items: readonly BotItem[] };
  los: (x1: number, z1: number, x2: number, z2: number) => boolean;
  weaponAmmo: (cur: number) => string;
}

export type BotEvent =
  | { kind: "key"; type: "keydown" | "keyup"; code: string }
  | { kind: "button"; type: "mousedown" | "mouseup"; button: number }
  | { kind: "move"; movementX: number; movementY: number }
  | { kind: "pointerlock"; locked: boolean };

/**
 * The route, in world units (a cell is 2): the centre of the corridor at each turn. It ends at the exit's door, not the exit cell:
 * the door stands in the landing's north wall, and walking into it (within 0.7 of it) is what opens it (`src/world/Transition.ts`).
 * Since the prologue grew (2026-10-22): over the pit's bridge, through the cleft in the east bank into the field of pyres, over the
 * river's bridge, down the passage into the throne hall, over the moat's north bridge onto the island and off it by the east one,
 * out of the hall and up the long climb to the landing.
 */
export const ROUTE: ReadonlyArray<readonly [number, number, string]> = [
  [20, 13, "churchyard"], [20, 17, "mausoleum door"], [20, 22, "crypt"], [20, 37, "stair foot"],
  [19, 44, "west bank"], [19, 50, "west bank"], [21, 53, "bridge"], [37, 53, "bridge's far end"],
  [49, 49, "east bank"], [55, 45, "the cleft"], [63, 45, "the cleft's end"],
  [81, 51, "the field"], [81, 58, "the river's bridge"], [81, 65, "over the river"], [80, 83, "the passage down"],
  [80, 91, "the throne hall"], [70, 93, "the moat's north bridge"], [70, 101, "the island"], [83, 106, "the island's east side"],
  [93, 106, "the east bridge"], [105, 105, "out of the hall"], [113, 105, "the climb's foot"], [113, 61, "the climb"],
  [113, 33, "the climb's head"], [107, 23, "landing"], [107, 16.6, "exit"],
];

/** Out of the fire, if it falls in: to the nearest stair out, and back onto the route at `wp`. */
const FIRE_EXITS: ReadonlyArray<{ path: ReadonlyArray<readonly [number, number]>; wp: number }> = [
  { path: [[35, 47], [35, 38.6], [38.5, 38.6]], wp: 8 },              // the pit, up the steps along its east wall, north half
  { path: [[35, 61], [35, 69.4], [38.5, 69.4]], wp: 8 },              //   and south half
  { path: [[65, 57], [65, 53]], wp: 12 },                             // the river, up its west end
  { path: [[95, 57], [95, 53]], wp: 12 },                             //   and its east end
  { path: [[57, 121], [49, 121], [45, 93]], wp: 16 },                 // the moat, up its south-west stair and round the hall
  { path: [[85, 95], [93, 95], [80, 91]], wp: 16 },                   //   and its north-east stair
];

const SENS = .0022, SIGHT = 14, CONE = 70 * Math.PI / 180;

/**
 * How good a player it is. `usual` is the one the test holds to; `poor` is
 * slower to react (0.7 s), turns at half the speed and aims twice as badly
 * — the task's report plays both.
 */
export const SKILL = {
  usual: { turn: .06, react: 20, wobble: 1 },
  poor: { turn: .03, react: 42, wobble: 2 },
} as const;
const wrap = (a: number): number => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

export class PrologueBot {
  wp = 0;
  frame = 0;
  firing = false;
  keys = new Set<string>();
  kicks = 0;
  shotsHeld = 0;
  detour: BotItem | null = null;
  /** Climbing out of the pit: the steps' waypoints left to walk. */
  escape: Array<readonly [number, number]> = [];
  /** Where the route picks up again once out of the fire. */
  rejoin = 0;
  falls = 0;
  log: string[] = [];
  lowest = 100;
  /** Frames the current target has been seen for — it reacts after `REACT`. */
  seen = 0;
  lastHp = 100;
  hitT = 0;
  constructor(private eyes: BotEyes, private skill: { turn: number; react: number; wobble: number } = SKILL.usual) {}

  private key(code: string, down: boolean, out: BotEvent[]): void {
    if (down === this.keys.has(code)) return;
    if (down) this.keys.add(code); else this.keys.delete(code);
    out.push({ kind: "key", type: down ? "keydown" : "keyup", code });
  }

  private turnTo(yaw: number, pitch: number, out: BotEvent[]): number {
    const { input } = this.eyes;
    const dy = wrap(yaw - input.yaw), dp = pitch - input.pitch;
    // a hand on a mouse: at most 0.06 rad a frame (3.6 rad/s), and no flicks
    const T = this.skill.turn;
    const mx = -Math.max(-T, Math.min(T, dy)) / SENS, my = -Math.max(-T / 2, Math.min(T / 2, dp)) / SENS;
    if (Math.abs(mx) > .5 || Math.abs(my) > .5) out.push({ kind: "move", movementX: Math.round(mx), movementY: Math.round(my) });
    return Math.abs(dy);
  }

  /** The nearest monster it can see and should deal with. */
  private target(): BotEnemy | null {
    const { player, world, los } = this.eyes;
    let best: BotEnemy | null = null, bd = SIGHT;
    for (const e of world.enemies) {
      if (e.dead || e.gone) continue;
      const dx = e.x - player.px, dz = e.z - player.pz, d = Math.hypot(dx, dz);
      const ahead = Math.abs(wrap(Math.atan2(-dx, -dz) - this.eyes.input.yaw)) < CONE;
      if (d < bd && (ahead || d < 3 || this.hitT > 0) && los(player.px, player.pz, e.x, e.z)) { bd = d; best = e; }
    }
    return best;
  }

  /** One frame of play: the events to deliver. */
  step(frame: number): BotEvent[] {
    this.frame = frame;
    const out: BotEvent[] = [];
    const { player, S, world } = this.eyes;
    if (frame === 2) out.push({ kind: "pointerlock", locked: true });
    if (S.dead || S.won) { this.key("KeyW", false, out); this.key("KeyS", false, out); if (this.firing) { out.push({ kind: "button", type: "mouseup", button: 0 }); this.firing = false; } return out; }
    this.lowest = Math.min(this.lowest, S.hp);
    if (S.hp < this.lastHp) this.hitT = 45;   // hit: it looks round for what did it
    this.lastHp = S.hp; this.hitT--;
    const t = this.target();
    this.seen = t ? this.seen + 1 : 0;
    let wantFire = false;
    if (t && this.seen > this.skill.react) {
      const dx = t.x - player.px, dz = t.z - player.pz, d = Math.hypot(dx, dz);
      const aimY = (t.fy || 0) + t.h * .5 - player.pyy;
      const wobble = (.045 * Math.sin(frame * .21) + .025 * Math.sin(frame * .57)) * this.skill.wobble;
      const off = this.turnTo(Math.atan2(-dx, -dz) + wobble, Math.atan2(aimY, d), out);
      // it keeps going while it shoots — pressing on at what stands in its way, holding still for what does not
      const [gx, gz] = ROUTE[Math.min(this.wp, ROUTE.length - 1)];
      const onWay = Math.abs(wrap(Math.atan2(-(gx - player.px), -(gz - player.pz)) - Math.atan2(-dx, -dz))) < Math.PI / 2
        && Math.abs((t.fy || 0) - (player.pyy - 1)) < .5;   // not off a ledge after one below it
      this.key("KeyW", onWay && d > 2.2 && player.pyy > 1.5, out);
      this.key("KeyS", d < 1.4, out);   // something on top of it: a step back
      const w = this.eyes;
      const empty = S.mag[S.cur] <= 0;
      if (empty && S.ammo[w.weaponAmmo(S.cur)] > 0 && frame % 20 === 0) { out.push({ kind: "key", type: "keydown", code: "KeyR" }, { kind: "key", type: "keyup", code: "KeyR" }); }
      wantFire = off < .08 && !empty;
      if (d < 2 && S.kickCd <= 0 && off < .3) {
        out.push({ kind: "button", type: "mousedown", button: 2 }, { kind: "button", type: "mouseup", button: 2 });
        this.kicks++;
      }
    } else if (!t) {
      this.key("KeyS", false, out);
      // hurt: go for the nearest health seen on the way, if any is near
      if (S.hp < 55 && !this.detour) {
        let best: BotItem | null = null, bd = 18;
        for (const it of world.items) if (it.kind === "health" && !it.taken) {
          const d = Math.hypot(it.x - player.px, it.z - player.pz);
          if (d < bd && this.eyes.los(player.px, player.pz, it.x, it.z)) { bd = d; best = it; }
        }
        if (best) { this.detour = best; this.log.push(`f${frame}: detour for health at hp ${S.hp}`); }
      }
      if (this.detour && this.detour.taken) this.detour = null;
      // fell into the fire (its floor is 0; the banks are 2.1): walk to the nearest stair out
      if (player.pyy < 1.5 && !this.escape.length) {
        const exit = FIRE_EXITS.reduce((a, b) => Math.hypot(a.path[0][0] - player.px, a.path[0][1] - player.pz) < Math.hypot(b.path[0][0] - player.px, b.path[0][1] - player.pz) ? a : b);
        this.escape = [...exit.path]; this.rejoin = exit.wp; this.detour = null; this.falls++;
        this.log.push(`f${frame}: fell into the pit at hp ${S.hp}`);
      }
      const [gx, gz] = this.escape.length ? this.escape[0] : this.detour ? [this.detour.x, this.detour.z] : ROUTE[Math.min(this.wp, ROUTE.length - 1)];
      const dx = gx - player.px, dz = gz - player.pz, d = Math.hypot(dx, dz);
      if (this.escape.length) {
        if (d < .9) { this.escape.shift(); if (!this.escape.length) { this.wp = Math.max(this.wp, this.rejoin); this.log.push(`f${frame}: climbed out of the pit at hp ${S.hp}`); } }
      } else if (!this.detour && d < .9 && this.wp < ROUTE.length - 1) { this.wp++; this.log.push(`f${frame}: reached ${ROUTE[this.wp - 1][2]} at hp ${S.hp}`); }
      const off = this.turnTo(Math.atan2(-dx, -dz), 0, out);
      this.key("KeyW", off < .5, out);
    }
    if (wantFire !== this.firing) { out.push({ kind: "button", type: wantFire ? "mousedown" : "mouseup", button: 0 }); this.firing = wantFire; }
    if (this.firing) this.shotsHeld++;
    return out;
  }
}
