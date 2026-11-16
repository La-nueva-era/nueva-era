import { describe, expect, it } from "vitest";
import { formatTime, stanzaAt } from "./sync.ts";

describe("stanzaAt", () => {
  const times = [0, 12, null, 40];

  it("is -1 before the first timed stanza", () => {
    expect(stanzaAt([5, 12], 3)).toBe(-1);
  });

  it("finds the stanza that has started", () => {
    expect(stanzaAt(times, 0)).toBe(0);
    expect(stanzaAt(times, 11.9)).toBe(0);
    expect(stanzaAt(times, 12)).toBe(1);
    expect(stanzaAt(times, 300)).toBe(3);
  });

  it("skips stanzas without a time", () => {
    expect(stanzaAt(times, 39)).toBe(1);
  });

  it("is -1 when no stanza is timed", () => {
    expect(stanzaAt([null, null], 20)).toBe(-1);
    expect(stanzaAt([], 20)).toBe(-1);
  });
});

describe("formatTime", () => {
  it("writes minutes and two-digit seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(75.9)).toBe("1:15");
    expect(formatTime(762)).toBe("12:42");
  });

  it("never goes below zero", () => {
    expect(formatTime(-4)).toBe("0:00");
  });
});
