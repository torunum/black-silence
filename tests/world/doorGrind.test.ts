// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { world } from "../../src/world/WorldState";
import { DOOR_SINK_SECONDS, WALLH } from "../../src/world/Grid";
import { envEnd } from "../../src/audio/Layers";
import { doorDesign } from "../../src/audio/sounds/doors";

/**
 * THE DOOR GRINDS FOR AS LONG AS IT MOVES — player feedback round 2 Task 5
 * (`docs/superpowers/plans/2026-09-26-player-feedback-2-sound.md`): "a stone
 * door sinking gets a grinding scrape over the door's real sink duration,
 * then a settling thud".
 *
 * The sink is `src/player/Interact.ts`'s `doorTick` (which keeps its own
 * literal speed: Task 5 changed no gameplay line). The sound reads
 * `DOOR_SINK_SECONDS` from `src/world/Grid.ts`. This runs the real
 * `doorTick` on a door until it comes to rest and checks the two agree — so
 * a change to either one alone turns this red.
 */

let doorTick: (dt: number) => void;
beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  ({ doorTick } = await import("../../src/player/Interact"));
});

/** Seconds of game time the real doorTick takes to sink an opened door until it stops moving, at `dt` a frame. */
function sinkTime(dt: number): number {
  const mesh = { position: { y: WALLH / 2 } };
  (world as { doors: Record<string, unknown> }).doors = { "1,1": { mesh, open: true } };
  let t = 0, last = mesh.position.y;
  for (let i = 0; i < 100000; i++) {
    doorTick(dt);
    if (mesh.position.y === last) break;
    last = mesh.position.y;
    t += dt;
  }
  world.doors = {};
  return t;
}

describe("the stone door's grind lasts exactly as long as the door sinks", () => {
  it.each([1 / 60, 1 / 120, 1 / 240])("at dt %s: doorTick comes to rest within one frame of DOOR_SINK_SECONDS", (dt) => {
    expect(Math.abs(sinkTime(dt) - DOOR_SINK_SECONDS)).toBeLessThanOrEqual(dt + 1e-9);
  });

  it.each(["stone", "secret", "gate"] as const)("the %s door's grind ends, and its settle lands, at DOOR_SINK_SECONDS", (kind) => {
    const d = doorDesign(kind);
    const ends = d.filter((l) => (l.at ?? 0) === 0 && envEnd(l.env) > 0.5).map((l) => envEnd(l.env));
    expect(ends.length).toBeGreaterThanOrEqual(4);
    for (const e of ends) expect(e).toBeCloseTo(DOOR_SINK_SECONDS, 9);
    expect(d.filter((l) => l.at === DOOR_SINK_SECONDS).length).toBeGreaterThanOrEqual(2);
  });
});
