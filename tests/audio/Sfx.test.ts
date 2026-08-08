// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { bang, blip, boom, click } from "../../src/audio/Sfx";

// Deliberately its own file, not a second describe block alongside
// AudioEngine.test.ts: Vitest gives each test *file* its own module
// registry (the default isolate: true), but within one file every describe
// shares the same imported AudioEngine module instance. AudioEngine.test.ts
// calls audioInit(), which would leave AC non-null for any later describe
// in that same file — defeating the point of this test, which is that
// these functions are no-ops when the graph has never been built.
describe("Sfx before audioInit", () => {
  beforeEach(() => installDomStubs());

  it("every sound function is a silent no-op, never a throw", () => {
    // The game calls these on paths that can run before the user has
    // interacted, and relies on them doing nothing rather than crashing.
    expect(() => blip(440, 0.1, "sine", 0.2)).not.toThrow();
    expect(() => bang(0.1, 0.3, 1000)).not.toThrow();
    expect(() => click(0.2)).not.toThrow();
    expect(() => boom(1)).not.toThrow();
  });
});
