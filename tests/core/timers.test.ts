import { describe, expect, it, vi } from "vitest";
import { after, clearAllTimers } from "../../src/core/Timers";

describe("Timers.after", () => {
  it("fires normally when nothing cancels it", () => {
    vi.useFakeTimers();
    let fired = 0;
    after(() => fired++, 100);
    vi.advanceTimersByTime(150);
    expect(fired).toBe(1);
    vi.useRealTimers();
  });

  it("does not fire once clearAllTimers has run", () => {
    vi.useFakeTimers();
    let fired = 0;
    after(() => fired++, 100);
    clearAllTimers();
    vi.advanceTimersByTime(1000);
    expect(fired).toBe(0);
    vi.useRealTimers();
  });

  it("forgets a timer that has already fired, so a later clear is a no-op", () => {
    vi.useFakeTimers();
    let fired = 0;
    after(() => fired++, 10);
    vi.advanceTimersByTime(50);
    clearAllTimers();
    vi.advanceTimersByTime(1000);
    expect(fired).toBe(1);
    vi.useRealTimers();
  });
});
