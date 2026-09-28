// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { runTrace, type InputEvent } from "./gameplayTrace";
import { PrologueBot, ROUTE, SKILL, type BotEyes } from "../support/prologueBot";

/**
 * THE PROLOGUE, PLAYED — the prologue plan's Task 3: "a player who moves,
 * shoots and kicks gets through on a first try without trying hard".
 *
 * The real game (NEW GAME through the menu, the seeded trace harness, real
 * `playerTick`, real enemy AI, real weapons), played by `PrologueBot`
 * (`tests/support/prologueBot.ts`) through the game's own inputs: it walks
 * the route from the grave to the exit, turns to and shoots what it sees,
 * kicks what reaches it, backs off a step, and detours for health when
 * hurt. It never strafes, dodges or uses cover — the "not trying hard".
 *
 * The committed run is the **poor** player (`SKILL.poor`: slow to react,
 * slow to turn, a wide aim) — the one the target is about. `BOT_SKILL=usual`
 * plays a steadier one, and `BOT_SEED=n` replays under another seed (the
 * elite rolls and the monsters' choices change); the task's report lists
 * both players under five seeds each.
 */

const SEED = Number(process.env.BOT_SEED ?? 20260928);
const SKILL_NAME = (process.env.BOT_SKILL ?? "poor") as keyof typeof SKILL;
const FRAMES = 60 * 150;   // two and a half minutes of game

let bot: PrologueBot;
const stages: Array<{ frame: number; zone: string; hp: number }> = [];
let end = { dead: false, won: false, hp: 0, frame: 0, level: 0, killed: 0, total: 0 };

beforeAll(async () => {
  let eyes: BotEyes | null = null;
  let S: typeof import("../../src/core/State").S;
  let zoneOf: () => string = () => "";
  let finished = false;
  await runTrace({
    seed: SEED, frames: FRAMES, dtMs: 1000 / 60, input: [], every: 600,
    prepare: async () => {
      const { player } = await import("../../src/player/PlayerState");
      const { input } = await import("../../src/player/Input");
      ({ S } = await import("../../src/core/State"));
      const { world } = await import("../../src/world/WorldState");
      const { los } = await import("../../src/enemies/ai/Perception");
      const { WEAPONS } = await import("../../src/weapons/WeaponState");
      const { currentZone } = await import("../../src/world/Zones");
      eyes = {
        player, input, S: S as unknown as BotEyes["S"],
        world: world as unknown as BotEyes["world"], los, weaponAmmo: (c) => WEAPONS[c].ammo,
      };
      zoneOf = () => (world.zones && currentZone() >= 0 ? world.zones.themes[currentZone()].id : "");
      bot = new PrologueBot(eyes, SKILL[SKILL_NAME]);
    },
    drive: (frame): InputEvent[] => {
      if (finished) return [];
      const z = zoneOf();
      if (z && (!stages.length || stages[stages.length - 1].zone !== z)) stages.push({ frame, zone: z, hp: S.hp });
      if (S.dead || S.won) {
        finished = true;
        const W = eyes!.world.enemies;
        end = { dead: S.dead, won: S.won, hp: S.hp, frame, level: S.level as unknown as number, killed: W.filter((e) => e.dead).length, total: W.length };
        return [];
      }
      return bot.step(frame).map((e) => ({ ...e, frame }) as InputEvent);
    },
  });
  if (!finished) {
    const p = eyes!.player;
    bot.log.push(`stuck at ${p.px.toFixed(1)},${p.pz.toFixed(1)} y ${p.pyy.toFixed(2)} wp ${bot.wp} seen ${bot.seen}; alive: ${eyes!.world.enemies.filter((e) => !e.dead).map((e) => `${e.key}@${e.x.toFixed(1)},${e.z.toFixed(1)} fy ${(e.fy || 0).toFixed(1)}`).join(" ")}`);
  }
  if (!finished) end = { dead: S!.dead, won: S!.won, hp: S!.hp, frame: FRAMES, level: 0, killed: eyes!.world.enemies.filter((e) => e.dead).length, total: eyes!.world.enemies.length };
  // eslint-disable-next-line no-console
  console.log(`seed ${SEED} ${SKILL_NAME}: ${JSON.stringify(end)}\n  stages ${JSON.stringify(stages)}\n  lowest hp ${bot.lowest}, kicks ${bot.kicks}\n  ${bot.log.join("\n  ")}`);
}, 300_000);

describe(`a player who moves, shoots and kicks — seed ${SEED}`, () => {
  it("gets from the grave to the exit alive, on the first try", () => {
    expect(end.dead, "died").toBe(false);
    expect(end.won, `did not reach the exit (last waypoint ${ROUTE[bot.wp][2]})`).toBe(true);
  });

  it("passes through every zone in order: churchyard, crypt, hell, the climb", () => {
    const order = stages.map((s) => s.zone).filter((z, i, a) => a.indexOf(z) === i);
    expect(order).toEqual(["churchyard", "crypt", "hell", "climb"]);
  });

  // (the steadier player shoots everything before it lands a blow — the report lists that too, so this holds the poor one to it)
  it.skipIf(SKILL_NAME !== "poor")("is made to fight for it — hell hurts, and it kicks at least once", () => {
    expect(bot.lowest).toBeLessThan(100);
    expect(bot.kicks).toBeGreaterThan(0);
  });

  it("is not a close thing: it never falls below a quarter of its health", () => {
    expect(bot.lowest).toBeGreaterThanOrEqual(25);
  });
});
