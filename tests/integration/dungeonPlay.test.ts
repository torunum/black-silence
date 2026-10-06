// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { runTrace, type InputEvent } from "./gameplayTrace";
import { DungeonBot, DUNGEON_SKILL, type DungeonEyes, type RoutePoint } from "../support/dungeonBot";
import { LEVELS } from "../../src/world/levels/index";
import { massBlocked } from "../../src/world/decor/place";
import { analyse } from "../../src/world/structure/analyse";
import { cellOf, idx, terrainOf, walk } from "../../src/world/structure/walk";

/**
 * LEVEL 1, PLAYED (deeper-levels plan, Task 3: "write a headless scripted play from spawn to exit using real `playerTick`/enemy AI, on the
 * model of `tests/support/prologueBot.ts`. It must survive and win on several seeds").
 *
 * The real game (the chapter select, the seeded trace harness, real `playerTick`, real enemy AI, real weapons), played by `DungeonBot`
 * (`tests/support/dungeonBot.ts`) through the game's own inputs: it walks the way through the level the structure analysis found (the key
 * on the way, the iron gate, the hall, the Guardian, the exit's door), takes what it sees that it needs (health when hurt, bullets when low, the
 * weapons it passes, armour when it has none), turns to and shoots what it sees, kicks what reaches it, and never strafes, dodges or uses cover.
 *
 * The committed run is the **usual** player (`DUNGEON_SKILL.usual`: it reacts in a quarter of a second, turns at 4.8 rad/s, aims with a small wobble) on one
 * seed. `BOT_SKILL=poor` plays the prologue's poor player (slow to react, slow to turn, a wide aim) and `BOT_SEED=n` replays under another seed (the elite rolls and
 * the monsters' choices change); the task's report lists both players under several seeds, honestly: the Guardian kills a bot that never strafes about one run in five. `BOT_LOG=1 npx vitest run tests/integration/dungeonPlay.test.ts` prints the run's numbers (the ending, the
 * health on reaching each stage, the lowest health, the bot's log). The run stops the frame the bot wins or dies.
 */

const SEED = Number(process.env.BOT_SEED ?? 20261005);
const SKILL_NAME = (process.env.BOT_SKILL ?? "usual") as keyof typeof DUNGEON_SKILL;
const FRAMES = Number(process.env.BOT_FRAMES ?? 60 * 600);   // ten minutes of game

/** Where in the level a cell is, for the report: the order is the order they are checked in. */
const STAGES: Array<[string, (x: number, z: number) => boolean]> = [
  ["the cell", (x, z) => x <= 7 && z <= 7],
  ["the cell block", (x, z) => x <= 28 && z <= 8],
  ["the undercroft", (x, z) => x <= 17 && z >= 9 && z <= 24],
  ["the warden's way", (x, z) => x >= 28 && x <= 33 && z >= 9],
  ["the guard room", (x, z) => x >= 29 && x <= 44 && z <= 12],
  ["the stair", (x, z) => x >= 35 && x <= 37 && z >= 12 && z <= 17],
  ["the great hall", (x, z) => x >= 24 && x <= 42 && z >= 18 && z <= 31],
  ["the gate", (x, z) => x >= 43 && x <= 44 && z >= 20 && z <= 28],
  ["the armoury", (x, z) => x >= 45 && x <= 53 && z >= 18 && z <= 27],
  ["the ward", (x, z) => x >= 44 && z >= 28],
  ["the way out", (x, z) => x <= 43 && z >= 32],
];
const stageOf = (x: number, z: number): string => (STAGES.find(([, f]) => f(x, z)) ?? ["?"])[0];

let bot: DungeonBot;
let end = { dead: false, won: false, hp: 0, armor: 0, frame: 0, killed: 0, total: 0, guardian: false };

beforeAll(async () => {
  const L = LEVELS[1].build();
  // the way: the structure analysis' walk, with the props (crates, barrels) and the masses as walls, since the player cannot walk through them
  const t0 = terrainOf(L, massBlocked(L.decor));
  const props = new Set<number>();
  L.g.forEach((row, z) => row.forEach((c, x) => { if ("xOTCFVvp".includes(c)) props.add(idx(t0, x, z)); }));
  const s = analyse(L);
  const start = idx(t0, s.spawn!.x, s.spawn!.z), exit = idx(t0, s.exit.x, s.exit.z);
  const through = walk(t0, start, { secrets: "none", waypoints: [exit], extraBlocked: props });
  if (!through.route) throw new Error("level 1 has no way through with its props as walls");
  const route: RoutePoint[] = through.route.map((c) => { const p = cellOf(t0, c); return { x: (p.x + .5) * 2, z: (p.z + .5) * 2, ch: L.g[p.z][p.x], stage: stageOf(p.x, p.z) }; });

  let eyes: DungeonEyes | null = null;
  let S: typeof import("../../src/core/State").S;
  let finished = false;
  const conclude = (frame: number): void => {
    finished = true;
    const W = eyes!.world.enemies;
    end = { dead: S.dead, won: S.won, hp: S.hp, armor: S.armor, frame, killed: W.filter((e) => e.dead).length, total: W.length, guardian: W.some((e) => e.key === "U" && e.dead) };
  };
  await runTrace({
    seed: SEED, frames: FRAMES, dtMs: 1000 / 60, input: [], every: 600, level: 1,
    prepare: async () => {
      const { player } = await import("../../src/player/PlayerState");
      const { input } = await import("../../src/player/Input");
      ({ S } = await import("../../src/core/State"));
      const { world } = await import("../../src/world/WorldState");
      const { los } = await import("../../src/enemies/ai/Perception");
      const { WEAPONS } = await import("../../src/weapons/WeaponState");
      const { doors } = await import("../../src/world/ExitDoor");
      eyes = { player, input, S: S as unknown as DungeonEyes["S"], world: world as unknown as DungeonEyes["world"], los, weaponAmmo: (c) => WEAPONS[c].ammo };
      // the way ends at the exit's door: walking into it (E at it as well) opens it
      const d = doors.exit!;
      route.push({ x: d.x + d.nx * .35, z: d.z + d.nz * .35, ch: ".", stage: "the way out" });
      bot = new DungeonBot(eyes, route, DUNGEON_SKILL[SKILL_NAME]);
    },
    drive: (frame): InputEvent[] => (finished ? [] : bot.step(frame).map((e) => ({ ...e, frame }) as InputEvent)),
    until: (frame) => { if (!finished && (S.dead || S.won)) conclude(frame); return finished; },
  });
  if (!finished) end = { dead: S!.dead, won: S!.won, hp: S!.hp, armor: S!.armor, frame: FRAMES, killed: eyes!.world.enemies.filter((e) => e.dead).length, total: eyes!.world.enemies.length, guardian: eyes!.world.enemies.some((e) => e.key === "U" && e.dead) };
  if (!end.won) { const p = eyes!.player; const SS = eyes!.S; bot.log.push(`state: shots ${(SS as unknown as {shots:number}).shots} hits ${(SS as unknown as {hitsLanded:number}).hitsLanded} hp ${SS.hp} ammo ${JSON.stringify(SS.ammo)} mag ${SS.mag.join()} cur ${SS.cur} weapons ${SS.weapons.map((w) => (w ? 1 : 0)).join("")} keys ${[...bot.keys].join()} firing ${bot.firing} yaw ${eyes!.input.yaw.toFixed(2)}`); bot.log.push(`stopped at ${(p.px / 2).toFixed(1)},${(p.pz / 2).toFixed(1)} wp ${bot.wp}/${route.length}; alive: ${eyes!.world.enemies.filter((e) => !e.dead).map((e) => `${e.key}@${(e.x / 2).toFixed(0)},${(e.z / 2).toFixed(0)}`).join(" ")}`); }
  // eslint-disable-next-line no-console
  if (process.env.BOT_LOG) console.log(`seed ${SEED} ${SKILL_NAME}: ${JSON.stringify(end)}\n  stages ${JSON.stringify(bot.stages)}\n  lowest hp ${bot.lowest}, kicks ${bot.kicks}\n  ${bot.log.join("\n  ")}`);
}, 900_000);

describe(`a player who moves, shoots and kicks, through level 1 — seed ${SEED}`, () => {
  it("gets from the spawn to the exit alive, on the first try", () => {
    expect(end.dead, `died (the log: ${bot.log.slice(-4).join(" | ")})`).toBe(false);
    expect(end.won, `did not reach the exit (waypoint ${bot.wp}; ${bot.log.slice(-4).join(" | ")})`).toBe(true);
  });

  it("goes through every part of the dungeon in the order the way leads: the cell block, the undercroft for the key, the guard room, the hall, the armoury, the ward, the way out", () => {
    const order = bot.stages.map((x) => x.stage).filter((z, i, a) => a.indexOf(z) === i);
    for (const stage of ["the cell block", "the undercroft", "the guard room", "the great hall", "the armoury", "the ward", "the way out"]) expect(order, stage).toContain(stage);
    expect(order.indexOf("the undercroft")).toBeLessThan(order.indexOf("the great hall"));
    expect(order.indexOf("the great hall")).toBeLessThan(order.indexOf("the armoury"));
    expect(order.indexOf("the armoury")).toBeLessThan(order.indexOf("the ward"));
  });

  it("kills the Guardian: the exit's door will not open for a player who has not", () => {
    expect(end.guardian, "the Guardian is dead").toBe(true);
    expect(end.killed, "enemies killed").toBeGreaterThanOrEqual(10);
  });

  it("is made to fight for it: it is hurt on the way, and it kicks at least once", () => {
    expect(bot.lowest).toBeLessThan(100);
    expect(bot.kicks).toBeGreaterThan(0);
  });
});
