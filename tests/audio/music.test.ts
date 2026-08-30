// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { audioInit } from "../../src/audio/AudioEngine";
import { world } from "../../src/world/WorldState";
import {
  musicTick,
  stopMusic,
  musicLayer,
  MUSIC_FADE_SECONDS,
  MUSIC_DWELL_SECONDS,
} from "../../src/audio/Music";

/**
 * Plan 1 Task 5's own tests: the adaptive-music state machine
 * (`src/audio/Music.ts`'s `musicTick`/`stopMusic`/`musicLayer`).
 *
 * Most of these are pure state-machine assertions (brief, Step 4) — they
 * drive `musicTick` directly with a fake `world.enemies` and read the
 * result back through `musicLayer()`, no audio graph involved. A handful
 * (the last two `describe` blocks) prove the boss layer's one real audio
 * effect — `Ambient.ts`'s `setInterval` pulse — actually starts and stops
 * when the state machine says it should, via `installDomStubs()` (for a
 * working, if fake, `AudioContext`) plus spies on the real
 * `setInterval`/`clearInterval` (Ambient.ts's pulse is the codebase's only
 * `setInterval`, so nothing else in this file can produce a false positive
 * on those spies).
 *
 * `audioInit()` is called once, in `beforeAll`: `ctx()` (`AudioEngine.ts`)
 * must be non-null before `startBossMusic()` will do anything (its own
 * `if(!ctx()||bossPulse)return;` guard), and every `it()` in this file
 * shares the same module state (vitest does not reset modules between
 * tests in one file — the same fact `positional.test.ts`'s own doc comment
 * notes for `pendingPos`), so calling it once up front is enough.
 *
 * `afterEach` resets both `Music.ts`'s module state (`stopMusic()`) and
 * `world.enemies` — the latter is real, shared, mutable module state
 * (`src/world/WorldState.ts`), not a fixture this file owns, so a boss left
 * behind by one test would otherwise leak into the next one's "nothing is
 * aware and no boss is live" assumption.
 */

function bossEnemy(overrides: { dead?: boolean; dormant?: boolean } = {}): Record<string, unknown> {
  return { boss: true, dead: false, dormant: false, ...overrides };
}

beforeAll(() => {
  installDomStubs();
  audioInit();
});

afterEach(() => {
  stopMusic();
  world.enemies = [];
});

describe("musicTick — layer selection (pure state machine, no audio)", () => {
  it("stays in exploration when nothing is aware and no boss is live", () => {
    musicTick(0.1, false);
    expect(musicLayer()).toBe("exploration");
  });

  it("moves exploration -> combat the moment anyAware becomes true", () => {
    musicTick(0.1, true);
    expect(musicLayer()).toBe("combat");
  });

  it("combat -> boss when a live, non-dormant boss exists", () => {
    musicTick(0.1, true); // exploration -> combat
    expect(musicLayer()).toBe("combat");
    world.enemies = [bossEnemy()];
    musicTick(0.1, true); // combat -> boss
    expect(musicLayer()).toBe("boss");
  });

  // Defeated only by desiredLayer() checking anyAware before the boss (or
  // not checking the boss at all) — this is the "invert the precedence"
  // mutation the brief calls out. combat -> boss above alone would not
  // catch it, since a swapped check order still lands on "boss" once
  // "combat" already lost the earlier race; this test starts already
  // aware, with the boss appearing on the very tick both are evaluated.
  it("boss beats combat even on the same tick anyAware is also true", () => {
    world.enemies = [bossEnemy()];
    musicTick(0.1, true);
    expect(musicLayer()).toBe("boss");
  });

  it("a dormant boss does not trigger boss music", () => {
    world.enemies = [bossEnemy({ dormant: true })];
    musicTick(0.1, false);
    expect(musicLayer()).toBe("exploration");
    musicTick(0.1, true);
    expect(musicLayer()).toBe("combat"); // anyAware still governs once the boss is excluded
  });

  // Boss transitions bypass dwell entirely (see the module doc comment's
  // "bossInvolved" paragraph) — a boss dying must not wait out a stale
  // dwell from an unrelated skirmish, so this needs no dwell-clearing step.
  it("boss -> exploration when it dies", () => {
    world.enemies = [bossEnemy()];
    musicTick(0.1, false); // exploration -> boss
    expect(musicLayer()).toBe("boss");

    (world.enemies[0] as { dead: boolean }).dead = true;
    musicTick(0.1, false);
    expect(musicLayer()).toBe("exploration");
  });

  // The brief's "no flapping" property. Defeated by removing the dwell gate
  // (or by any change that lets desired!==active swap on every tick) —
  // without it this test's final assertion sees "exploration", not "combat".
  it("no flapping: anyAware toggling within the dwell window does not swap layers", () => {
    musicTick(0.1, true); // exploration -> combat, dwell armed for MUSIC_DWELL_SECONDS
    expect(musicLayer()).toBe("combat");

    let elapsed = 0.1;
    let aware = false;
    while (elapsed < MUSIC_DWELL_SECONDS - 0.2) {
      musicTick(0.2, aware);
      elapsed += 0.2;
      aware = !aware;
      expect(musicLayer()).toBe("combat"); // must hold every step, not just at the end
    }
  });

  // A boss transition always bypasses dwell (see "boss beats combat" above),
  // so re-entering "boss" right after stopMusic() would pass even if
  // stopMusic() left a stale dwellRemaining behind — that check would be
  // exactly the "assertion satisfiable in a state the game reaches anyway"
  // trap. This test instead re-enters through the one pair dwell actually
  // gates, exploration<->combat, which only stays immediate if stopMusic()
  // really zeroed dwellRemaining.
  it("stopMusic() resets state so a later exploration<->combat transition is not blocked by a stale dwell", () => {
    musicTick(0.1, true); // exploration -> combat, dwell armed for MUSIC_DWELL_SECONDS
    stopMusic();
    expect(musicLayer()).toBe("exploration");

    musicTick(0.1, true); // must be immediate — a leftover dwell would block this
    expect(musicLayer()).toBe("combat");
  });
});

describe("musicTick — the boss layer's real audio effect", () => {
  it("entering boss starts Ambient.ts's setInterval pulse", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    try {
      world.enemies = [bossEnemy()];
      musicTick(0.1, false);
      expect(musicLayer()).toBe("boss");
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    } finally {
      setIntervalSpy.mockRestore();
    }
  });

  it("a dormant boss never starts the pulse", () => {
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    try {
      world.enemies = [bossEnemy({ dormant: true })];
      musicTick(0.1, true);
      expect(musicLayer()).toBe("combat");
      expect(setIntervalSpy).not.toHaveBeenCalled();
    } finally {
      setIntervalSpy.mockRestore();
    }
  });

  it("leaving boss keeps the pulse alive through the fade, then stops it", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    try {
      world.enemies = [bossEnemy()];
      musicTick(0.1, false); // exploration -> boss
      (world.enemies[0] as { dead: boolean }).dead = true;

      musicTick(0.1, false); // boss -> exploration; schedules the fade-out (which this same
      // tick's dt already nudges once — see musicTick's own fade check running
      // right after enter()), does not stop yet
      expect(musicLayer()).toBe("exploration");
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      musicTick(MUSIC_FADE_SECONDS - 0.1 - 0.05, false); // still short of the fade completing
      expect(clearIntervalSpy).not.toHaveBeenCalled();

      musicTick(0.2, false); // pushes cumulative elapsed past MUSIC_FADE_SECONDS
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    } finally {
      clearIntervalSpy.mockRestore();
    }
  });

  // stopMusic() (death/win/level-load) is a decisive cut, not a fade — see
  // the module doc comment. Defeated by routing stopMusic() through the
  // same fadeOutRemaining path enter() uses: this test's clearIntervalSpy
  // assertion would then fail (still 0 immediately after stopMusic()).
  it("stopMusic() stops the pulse immediately, without waiting for the fade", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    try {
      world.enemies = [bossEnemy()];
      musicTick(0.1, false);
      expect(musicLayer()).toBe("boss");

      stopMusic();
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
      expect(musicLayer()).toBe("exploration");
    } finally {
      clearIntervalSpy.mockRestore();
    }
  });
});
