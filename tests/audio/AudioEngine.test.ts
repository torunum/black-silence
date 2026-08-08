// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { installDomStubs } from "../support/domStubs";
import { audioInit, getMasterVolume, isReady, setMasterVolume } from "../../src/audio/AudioEngine";

describe("AudioEngine", () => {
  beforeEach(() => installDomStubs());

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
});
