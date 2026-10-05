// @vitest-environment jsdom
import { it } from "vitest";
import { runTrace, buildTextureIndex, type InputEvent } from "./gameplayTrace";
import { S } from "../../src/core/State";

const SENS = 0.0022;
const REV = (2 * Math.PI) / SENS;
const P = JSON.parse(process.env.PROBE ?? "{}") as Record<string, number>;
const WALK_END = P.walkEnd ?? 400;
const TOTAL = P.total ?? 1500;
const SWEEP_START = P.sweepStart ?? WALK_END + 20;
const SWEEP_STEP = P.sweepStep ?? 22;
const SWEEP_USED = P.sweepUsed ?? 24;
const DENOM = P.denom ?? 130;
const TURN = P.turn ?? 0;   // extra yaw at the stop, fractions of a revolution

function script(): InputEvent[] {
  const s: InputEvent[] = [{ frame: 2, kind: "pointerlock", locked: true }];
  for (let i = 0; i < 8; i++) s.push({ frame: 5 + i * 5, kind: "move", movementX: -(Math.PI / 2) / SENS / 8, movementY: 0 });
  s.push({ frame: P.walkStart ?? 50, kind: "key", type: "keydown", code: "KeyW" });
  s.push({ frame: WALK_END, kind: "key", type: "keyup", code: "KeyW" });
  const amp = (P.amp ?? 4) * Math.PI / 180, lim = (P.lim ?? 30) * Math.PI / 180;
  let off = 0, dirn = 1;
  for (let i = 0; i < SWEEP_USED; i++) {
    const f = SWEEP_START + i * SWEEP_STEP;
    if (off + dirn * amp > lim || off + dirn * amp < -lim) dirn = -dirn;
    off += dirn * amp;
    s.push({ frame: f, kind: "move", movementX: -dirn * amp / SENS, movementY: 0 });
    s.push({ frame: f + 3, kind: "button", type: "mousedown", button: 0 });
    s.push({ frame: f + 15, kind: "button", type: "mouseup", button: 0 });
    if (i % 6 === 5) { s.push({ frame: f + 18, kind: "key", type: "keydown", code: "KeyR" }); s.push({ frame: f + 20, kind: "key", type: "keyup", code: "KeyR" }); }
  }
  return s;
}

it("probe", async () => {
  S.armor = 50;
  const log: string[] = [];
  let world: any, player: any, input: any, namer: any;
  const texs = new Set<string>();
  const trace = await runTrace({
    seed: 20260815, frames: TOTAL, dtMs: 1000 / 60, input: script(), every: 10, level: 1,
    prepare: async () => {
      ({ world } = await import("../../src/world/WorldState"));
      ({ player } = await import("../../src/player/PlayerState"));
      ({ input } = await import("../../src/player/Input"));
      namer = await buildTextureIndex();
    },
    drive: (frame) => {
      if (frame % 5 === 0) for (const e of world.enemies) { const m = e.sp?.material?.map; if (m) texs.add(namer(m)); }
      if (frame % 60 === 0) {
        const near = world.enemies.filter((e: any) => !e.dead).map((e: any) => ({ k: e.key, d: Math.hypot(e.x - player.px, e.z - player.pz), a: e.aware, dm: e.dormant, x: e.x / 2, z: e.z / 2 })).sort((a: any, b: any) => a.d - b.d).slice(0, 3);
        log.push(`f${frame} p(${(player.px / 2).toFixed(1)},${(player.pz / 2).toFixed(1)}) yaw ${input.yaw.toFixed(2)} hp ${S.hp} ar ${S.armor} kills ${S.kills} near ${near.map((n: any) => `${n.k}${n.d.toFixed(1)}${n.dm ? "d" : ""}${n.a ? "a" : ""}@${n.x.toFixed(0)},${n.z.toFixed(0)}`).join(" ")}`);
      }
    },
  });
  console.log(log.join("\n"));
  const hp = [...new Set(trace.map((f) => f.hud.hp))], subt = [...new Set(trace.map((f) => f.hud.subt))], msg = [...new Set(trace.map((f) => f.hud.msg))];
  console.log("hp", hp.join(" "), "\nsubt", subt, "\nmsg", msg, "\nkills", S.kills, "frames", trace.length, "scene", trace.map((f) => f.scene.count).join(","));
  console.log("textures", [...texs].sort().join(" "));
}, 120000);
