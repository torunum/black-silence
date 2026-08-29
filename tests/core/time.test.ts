import { beforeEach, describe, expect, it } from "vitest";
import { schedule, tickScheduled, clearScheduled } from "../../src/core/Time";

describe("Time.schedule", () => {
  beforeEach(() => clearScheduled());

  it("fires after the delay has elapsed in scaled time", () => {
    let fired = 0;
    schedule(() => fired++, 0.11);
    tickScheduled(0.05); expect(fired).toBe(0);
    tickScheduled(0.05); expect(fired).toBe(0);
    tickScheduled(0.05); expect(fired).toBe(1);
  });

  it("does not fire while scaled time is stopped", () => {
    let fired = 0;
    schedule(() => fired++, 0.11);
    for (let i = 0; i < 100; i++) tickScheduled(0);
    expect(fired).toBe(0);
  });

  it("drops everything pending on clearScheduled", () => {
    let fired = 0;
    schedule(() => fired++, 0.01);
    clearScheduled();
    tickScheduled(1);
    expect(fired).toBe(0);
  });

  it("fires each callback exactly once", () => {
    let fired = 0;
    schedule(() => fired++, 0.05);
    tickScheduled(1); tickScheduled(1);
    expect(fired).toBe(1);
  });
});
