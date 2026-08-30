// @vitest-environment jsdom
import { beforeAll, afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { installDomStubs, loadGameHtml } from "../support/domStubs";
import { recordingAudioContext, type AudioEvent } from "../support/recordingAudio";
import type { world as World } from "../../src/world/WorldState";
import type { player as Player } from "../../src/player/PlayerState";
import type { enemyTick as EnemyTick } from "../../src/enemies/ai/Behaviors";
import type { itemsTick as ItemsTick } from "../../src/player/Interact";
import type { spawnEnemy as SpawnEnemy } from "../../src/world/LevelLoader";
import type { addSprite as AddSprite } from "../../src/render/RenderCore";
import type { ITEMTEX as ItemTex } from "../../src/render/ItemTextures";
import type { emitHere as EmitHere } from "../../src/audio/AudioEngine";

/**
 * Plan 1 Task 4 — proves the *callers* Task 4 touched hand `at()` the right
 * world position, not just that Task 3's panner mechanism works (that's
 * `tests/audio/positional.test.ts`'s job, and it stays green here unedited).
 * Follows `tests/integration/schedulerWiring.test.ts`'s shape: boot the real
 * game through `src/main`, click NEW GAME, then drive a real production
 * function (not a copy of it) and read the graph `masterBus()` actually
 * built, via `tests/support/recordingAudio.ts` — the same recorder
 * `tests/audio/positional.test.ts` and `tests/behavior/audio.test.ts` use.
 *
 * `globalThis.AudioContext` is swapped for the recording one *before* the
 * NEW GAME click, since that's what triggers `audioInit()` (inside
 * `startGame`, `src/core/Boot.ts`) — installDomStubs()'s own AudioContext
 * stub only guarantees "doesn't throw," not "observable," so it has to be
 * overridden here the same way `tests/audio/positional.test.ts` does for
 * `AudioEngine.ts` directly.
 *
 * ## Why the grid gets overwritten after boot
 *
 * NEW GAME loads level 0 (the prologue — zero enemies, confirmed by
 * `tests/integration/combatTrace.test.ts`'s own header), which is exactly
 * what makes it safe to drop a synthetic enemy into `world.enemies` here
 * without a real one already occupying the slot. But the prologue's actual
 * wall layout is not this file's concern — `los()`/`solidAt()` are already
 * covered elsewhere, and this file only needs a sightline it can reason
 * about by construction. So immediately after boot, `world.grid` is
 * replaced with a large all-open floor, `world.wallSegs` is emptied, and
 * `world.heightMap` is cleared to `null` (so `floorHeightAt` — and every
 * enemy's `fy` — is a deterministic 0). That is the only thing this file
 * changes about the booted level; everything else (scene, textures,
 * `ITEMTEX`, `audioInit()`'s graph) is exactly what `startGame(0)` built.
 *
 * ## The enemy under test
 *
 * `"w"` (`src/enemies/EnemyDefs.ts`) is the one archetype with none of
 * `range`/`scream`/`charger`/`fling`/`slam`/`lunge`/`dodge`/`charge` set —
 * picked so `enemyTick`'s very first call fires exactly one positioned
 * sound (the first-sighting `snarl`, Behaviors.ts's `if(!e.aware){...}`
 * branch) and nothing else: the player is placed 5 units away, far enough
 * that the `dist<1.55` melee branch can't also fire (which would still be
 * *correctly* positioned, just a second panner this file would then have to
 * tell apart from the one actually under test) and close enough that
 * `los()`/`dist<22` are trivially satisfied on the open floor above.
 *
 * ## Height convention under test
 *
 * Every positioned enemy sound Task 4 added uses `e.h*.6+(e.fy||0)` — chest/
 * head height above the enemy's own floor offset, the same expression the
 * brief's own `snarl` example and this codebase's existing `e.h*.6`
 * sparks-position convention (`src/enemies/Damage.ts`'s shield block) use.
 * `fy` is pinned to 0 above, so the expected height collapses to `e.h*.6`.
 */

const rafQueue: FrameRequestCallback[] = [];
let events: AudioEvent[];

let world: typeof World;
let player: typeof Player;
let enemyTick: typeof EnemyTick;
let itemsTick: typeof ItemsTick;
let spawnEnemy: typeof SpawnEnemy;
let addSprite: typeof AddSprite;
let ITEMTEX: typeof ItemTex;
let emitHere: typeof EmitHere;

beforeAll(async () => {
  installDomStubs();
  loadGameHtml();
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafQueue.push(cb);
    return rafQueue.length;
  };
  // jsdom implements neither, and startGame calls the first on the canvas.
  (HTMLElement.prototype as unknown as { requestPointerLock: () => void }).requestPointerLock = () => {};

  const rec = recordingAudioContext();
  events = rec.events;
  function Ctor(): unknown {
    return rec.ctx;
  }
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = Ctor as unknown as new () => unknown;

  // Dynamic, not top-of-file, imports: several of these modules (transitively,
  // e.g. src/ui/HudMessages.ts) capture document.getElementById(...) at their
  // own module scope the moment they're first evaluated. A static top-of-file
  // import would evaluate that before installDomStubs()/loadGameHtml() above
  // ever run, crashing on a null element — the same ordering hazard
  // tests/integration/contextWiring.test.ts's own header documents.
  ({ world } = await import("../../src/world/WorldState"));
  ({ player } = await import("../../src/player/PlayerState"));
  ({ enemyTick } = await import("../../src/enemies/ai/Behaviors"));
  ({ itemsTick } = await import("../../src/player/Interact"));
  ({ spawnEnemy } = await import("../../src/world/LevelLoader"));
  ({ addSprite } = await import("../../src/render/RenderCore"));
  ({ ITEMTEX } = await import("../../src/render/ItemTextures"));
  ({ emitHere } = await import("../../src/audio/AudioEngine"));

  await import("../../src/main");

  const newGame = [...document.querySelectorAll(".mbtn")].find((b) => b.textContent?.includes("NEW GAME"));
  if (!newGame) throw new Error("the NEW GAME menu row is gone — this file drives the game through it");
  (newGame as HTMLElement).click();

  world.grid = Array.from({ length: 30 }, () => Array(30).fill("."));
  world.GW = 30;
  world.GH = 30;
  world.heightMap = null;
  world.wallSegs = [];
});

afterEach(() => {
  // AudioEngine.ts's pendingPos persists across it()s in the same module
  // session (vitest doesn't reset modules between tests in one file) — see
  // tests/audio/positional.test.ts's own afterEach for the same reasoning.
  emitHere();
});

/** Every PannerNode created in `events` from `baseline` on, with its last-set positionX/Y/Z. */
function pannersSince(baseline: number): Array<{ id: string; x?: number; y?: number; z?: number }> {
  const slice = events.slice(baseline);
  const created = slice.filter((e) => e.kind === "create" && e.detail.type === "PannerNode");
  const valueOf = (id: string, prop: string) =>
    slice
      .filter((e) => e.kind === "param" && e.detail.node === id && e.detail.prop === prop)
      .at(-1)?.detail.value as number | undefined;
  return created.map((c) => {
    const id = c.detail.node as string;
    return { id, x: valueOf(id, "positionX"), y: valueOf(id, "positionY"), z: valueOf(id, "positionZ") };
  });
}

describe("Behaviors.ts's enemyTick positions the first-sighting snarl at the enemy, not the player", () => {
  it("carries this enemy's own x/z/height into the panner — not any other coordinate", () => {
    const ex = 10,
      ez = 3;
    const e = spawnEnemy("w", ex, ez) as unknown as { x: number; z: number; h: number; fy?: number; aware?: boolean };
    player.px = ex + 5;
    player.pz = ez; // dist 5: seen (los + dist<22), too far for the dist<1.55 melee branch to also fire
    expect(e.aware).toBe(false); // sanity: the branch under test only fires once, on first sighting

    const baseline = events.length;
    enemyTick(0.05);

    const panners = pannersSince(baseline);
    expect(panners.length, `expected exactly one panner (the snarl); got ${JSON.stringify(panners)}`).toBe(1);
    const [p] = panners;
    // Sabotage check (recorded in this task's report, not left in the tree):
    // swapping the e.x/e.z passed to Behaviors.ts's snarl at() call flips
    // these two expectations against each other and fails both, by name.
    expect(p.x).toBe(ex);
    expect(p.z).toBe(ez);
    expect(p.y).toBeCloseTo(e.h * 0.6, 5);

    const wiring = events.slice(baseline).find((ev) => ev.kind === "connect" && ev.detail.from === p.id);
    expect(wiring?.detail.to, "the panner must connect into a bus, not sit disconnected").toBeDefined();
  });
});

describe("Interact.ts's item pickup — a deliberate non-positional decision — creates no panner", () => {
  it("itemsTick's pickup blip/gurgle stay unpositioned even though the item has a world x/z", () => {
    const item = {
      kind: "bullets",
      x: player.px,
      z: player.pz,
      sp: addSprite(ITEMTEX.bullets as THREE.CanvasTexture, player.px, player.pz, 0.55, 0.55, 0.5),
      bob: 0,
    };
    world.items.push(item as unknown as Record<string, unknown>);

    const baseline = events.length;
    itemsTick(0.05);

    // The pickup really fired (nodes were created) — this isn't passing
    // vacuously because itemsTick silently did nothing.
    expect((item as unknown as { taken?: boolean }).taken).toBe(true);
    const anyCreated = events.slice(baseline).filter((ev) => ev.kind === "create");
    expect(anyCreated.length).toBeGreaterThan(0);

    expect(pannersSince(baseline)).toHaveLength(0);
  });
});
