// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { audioInit, getMasterVolume, isReady, setMasterVolume } from "../../src/audio/AudioEngine";
import { save } from "../../src/save/SaveGame";

const KEY = "blacksilence.save";

describe("AudioEngine", () => {
  beforeEach(() => {
    installDomStubs();
    localStorage.clear();
    save.masterVolume = 0.5;
  });

  it("starts at the reference's default volume", () => {
    expect(getMasterVolume()).toBe(0.5);
  });

  it("stores volume changes made before the graph exists", () => {
    setMasterVolume(0.25);
    expect(getMasterVolume()).toBe(0.25);
    setMasterVolume(0.5);
  });

  it("reports ready only after audioInit", () => {
    audioInit();
    expect(isReady()).toBe(true);
  });

  // Phase 1 Task 2: setMasterVolume is the only writer of save.masterVolume
  // — Task 1 added the field but nothing wrote it. This is the "stored"
  // half of "persisted, not just applied"; tests/ui/Menus.test.ts covers the
  // other half — a loaded value actually reaching the gain node.
  it("writes the new volume through to save.masterVolume and flushes it to storage", () => {
    setMasterVolume(0.73);
    expect(save.masterVolume).toBe(0.73);
    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored.masterVolume).toBe(0.73);
    setMasterVolume(0.5);
  });
});
