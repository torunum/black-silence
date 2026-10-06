// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { runTrace, type InputEvent } from "./gameplayTrace";
import { DungeonBot, DUNGEON_SKILL, type DungeonEyes, type RoutePoint } from "../support/dungeonBot";
import { LEVELS } from "../../src/world/levels/index";
import { massBlocked } from "../../src/world/decor/place";
import { analyse } from "../../src/world/structure/analyse";
import { cellOf, idx, terrainOf, walk } from "../../src/world/structure/walk";

/**
 * LEVEL 2, PLAYED (deeper-levels plan, Task 4: "spawn -> priest -> exit, several seeds, wins"). The same player as `dungeonPlay.test.ts` (`DungeonBot`: the real game, the
 * real `playerTick`, the real enemy AI and weapons, played through the game's own inputs; it never strafes, dodges or uses cover) on the church: it walks the way the structure
 * analysis found, which goes up the bell tower for the red key, back down to the grand doors, through the nave, down into the crypt past the Guardian, up into the sacristy and
 * along the passage into the chancel, to the Corrupted Priest and, once he is dead, to the exit's door.
 *
 * A player arrives at level 2 from level 1, so it is given what level 1 gave it: the shotgun and the combat rifle (the guard room's and the armoury's), a few shells. It starts
 * level 2 on the pistol as the game does. `BOT_SKILL=poor` and `BOT_SEED=n` replay under the prologue's poor player and another seed; the task's report lists them, honestly.
 * `BOT_LOG=1 npx vitest run tests/integration/churchPlay.test.ts` prints the run's numbers.
 */

const SEED = Number(process.env.BOT_SEED ?? 20261006);
const SKILL_NAME = (process.env.BOT_SKILL ?? "usual") as keyof typeof DUNGEON_SKILL;
const FRAMES = Number(process.env.BOT_FRAMES ?? 60 * 900);   // a quarter of an hour of game

/** Where in the church a cell is, for the report: the order is the order they are checked in. */
const STAGES: Array<[string, (x: number, z: number) => boolean]> = [
  ["the chancel", (x, z) => x >= 14 && x <= 24 && z <= 22],
  ["the sacristy", (x, z) => x >= 14 && x <= 24 && z >= 23 && z <= 33],
  ["the crypt", (x, z) => z >= 34 && x <= 35],
  ["the tower", (x, z) => x >= 52 && z <= 17],
  ["the nave", (x, z) => x >= 25 && x <= 53 && z >= 13 && z <= 36],
  ["the narthex", (x, z) => x >= 54],
];
const stageOf = (x: number, z: number): string => (STAGES.find(([, f]) => f(x, z)) ?? ["?"])[0];

let bot: DungeonBot;
let end = { dead: false, won: false, hp: 0, armor: 0, frame: 0, killed: 0, total: 0, priest: false, guardian: false };

beforeAll(async () => {
  const L = LEVELS[2].build();
  // the way: the structure analysis' walk, with the props (pews, crates) and the masses as walls, since the player cannot walk through them
  const t0 = terrainOf(L, massBlocked(L.decor));
  const props = new Set<number>();
  L.g.forEach((row, z) => row.forEach((c, x) => { if ("xOTCFVvp".includes(c)) props.add(idx(t0, x, z)); }));
  const s = analyse(L);
  const start = idx(t0, s.spawn!.x, s.spawn!.z), boss = idx(t0, 19, 18), exit = idx(t0, s.exit.x, s.exit.z);
  const through = walk(t0, start, { secrets: "none", waypoints: [boss, exit], extraBlocked: props });
  if (!through.route) throw new Error("level 2 has no way through with its props as walls");
  const route: RoutePoint[] = through.route.map((c) => { const p = cellOf(t0, c); return { x: (p.x + .5) * 2, z: (p.z + .5) * 2, ch: L.g[p.z][p.x], stage: stageOf(p.x, p.z) }; });

  let eyes: DungeonEyes | null = null;
  let S: typeof import("../../src/core/State").S;
  let finished = false;
  const conclude = (frame: number): void => {
    finished = true;
    const W = eyes!.world.enemies;
    end = { dead: S.dead, won: S.won, hp: S.hp, armor: S.armor, frame, killed: W.filter((e) => e.dead).length, total: W.length, priest: W.some((e) => e.key === "Q" && e.dead), guardian: W.some((e) => e.key === "U" && e.dead) };
  };
  await runTrace({
    seed: SEED, frames: FRAMES, dtMs: 1000 / 60, input: [], every: 600, level: 2,
    prepare: async () => {
      const { player } = await import("../../src/player/PlayerState");
      const { input } = await import("../../src/player/Input");
      ({ S } = await import("../../src/core/State"));
      const { world } = await import("../../src/world/WorldState");
      const { los } = await import("../../src/enemies/ai/Perception");
      const { WEAPONS } = await import("../../src/weapons/WeaponState");
      const { doors } = await import("../../src/world/ExitDoor");
      // what level 1 gave: the shotgun and the combat rifle, and a few shells
      S.weapons[1] = true; S.weapons[2] = true; S.ammo.shells = 12; S.mag[1] = 5; S.mag[2] = 24;
      eyes = { player, input, S: S as unknown as DungeonEyes["S"], world: world as unknown as DungeonEyes["world"], los, weaponAmmo: (c) => WEAPONS[c].ammo };
      // the way ends at the exit's door: walking into it (E at it as well) opens it
      const d = doors.exit!;
      route.push({ x: d.x + d.nx * .35, z: d.z + d.nz * .35, ch: ".", stage: "the way out" });
      bot = new DungeonBot(eyes, route, DUNGEON_SKILL[SKILL_NAME], "Q", route.length - 2, "the sacristy");   // the Priest must die before the door (it goes after him if he is not where he was), and it tops up in the sacristy first
    },
    drive: (frame): InputEvent[] => (finished ? [] : bot.step(frame).map((e) => ({ ...e, frame }) as InputEvent)),
    until: (frame) => {
      if (!finished && frame % 300 === 0) { const q = eyes!.world.enemies.find((e) => e.key === "Q") as unknown as { dormant: boolean; phase: number; hp: number; x: number; z: number; dead: boolean } | undefined; if (q) bot.log.push(`f${frame}: Q ${q.dormant ? "asleep" : "awake"} phase ${q.phase} hp ${Math.round(q.hp)} at ${(q.x / 2).toFixed(1)},${(q.z / 2).toFixed(1)}${q.dead ? " DEAD" : ""}`); }
      if (!finished && (S.dead || S.won)) conclude(frame);
      return finished;
    },
  });
  if (!finished) end = { dead: S!.dead, won: S!.won, hp: S!.hp, armor: S!.armor, frame: FRAMES, killed: eyes!.world.enemies.filter((e) => e.dead).length, total: eyes!.world.enemies.length, priest: eyes!.world.enemies.some((e) => e.key === "Q" && e.dead), guardian: eyes!.world.enemies.some((e) => e.key === "U" && e.dead) };
  if (!end.won) { const p = eyes!.player; const SS = eyes!.S; bot.log.push(`state: hp ${SS.hp} ammo ${JSON.stringify(SS.ammo)} mag ${SS.mag.join()} cur ${SS.cur} weapons ${SS.weapons.map((w) => (w ? 1 : 0)).join("")} keys ${[...bot.keys].join()} firing ${bot.firing} yaw ${eyes!.input.yaw.toFixed(2)}`); bot.log.push(`stopped at ${(p.px / 2).toFixed(1)},${(p.pz / 2).toFixed(1)} wp ${bot.wp}/${route.length}; alive: ${eyes!.world.enemies.filter((e) => !e.dead).map((e) => `${e.key}@${(e.x / 2).toFixed(0)},${(e.z / 2).toFixed(0)}`).join(" ")}`); }
  // eslint-disable-next-line no-console
  if (process.env.BOT_LOG) console.log(`seed ${SEED} ${SKILL_NAME}: ${JSON.stringify(end)}\n  stages ${JSON.stringify(bot.stages)}\n  lowest hp ${bot.lowest}, kicks ${bot.kicks}\n  ${bot.log.join("\n  ")}`);
}, 1_200_000);

describe(`a player who moves, shoots and kicks, through level 2 — seed ${SEED}`, () => {
  it("gets from the spawn to the exit alive, on the first try", () => {
    expect(end.dead, `died (the log: ${bot.log.slice(-4).join(" | ")})`).toBe(false);
    expect(end.won, `did not reach the exit (waypoint ${bot.wp}; ${bot.log.slice(-4).join(" | ")})`).toBe(true);
  });

  it("goes through every part of the church in the order the way leads: the tower for the key, the nave, the crypt, the sacristy, the chancel", () => {
    const order = bot.stages.map((x) => x.stage).filter((z, i, a) => a.indexOf(z) === i);
    for (const stage of ["the tower", "the nave", "the crypt", "the sacristy", "the chancel"]) expect(order, stage).toContain(stage);
    expect(order.indexOf("the tower")).toBeLessThan(order.indexOf("the nave"));
    expect(order.indexOf("the nave")).toBeLessThan(order.indexOf("the crypt"));
    expect(order.indexOf("the crypt")).toBeLessThan(order.indexOf("the sacristy"));
    expect(order.indexOf("the sacristy")).toBeLessThan(order.indexOf("the chancel"));
  });

  it("kills the Priest: the exit's door will not open for a player who has not", () => {
    expect(end.priest, "the Priest is dead").toBe(true);
    expect(end.killed, "enemies killed").toBeGreaterThanOrEqual(10);
  });

  it("is made to fight for it: it is hurt on the way, and it kicks at least once", () => {
    expect(bot.lowest).toBeLessThan(100);
    expect(bot.kicks).toBeGreaterThan(0);
  });
});
