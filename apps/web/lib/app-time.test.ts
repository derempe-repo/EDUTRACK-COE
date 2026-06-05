import { describe, expect, it } from "vitest";

import { formatAppDateTime, formatAppDateTimeInput, parseAppDateTimeInput } from "./app-time";

describe("app time helpers", () => {
  it("formats dates in Asia/Makassar time", () => {
    const date = new Date("2026-06-05T01:00:00.000Z");

    expect(formatAppDateTime(date)).toContain("09.00");
    expect(formatAppDateTimeInput(date)).toBe("2026-06-05T09:00");
  });

  it("parses datetime-local values as Asia/Makassar time", () => {
    const date = parseAppDateTimeInput("2026-06-05T09:00");

    expect(date?.toISOString()).toBe("2026-06-05T01:00:00.000Z");
  });
});
