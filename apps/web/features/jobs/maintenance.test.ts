import { describe, expect, it } from "vitest";

import { isMaintenanceJobAuthorized, readPositiveIntegerSetting } from "./maintenance-auth";

describe("maintenance job auth", () => {
  it("accepts bearer or x-job-secret when a secret is configured", () => {
    expect(
      isMaintenanceJobAuthorized({
        authorizationHeader: "Bearer secret-123",
        configuredSecret: "secret-123",
        dryRun: false,
        nodeEnv: "production",
        secretHeader: null,
      }),
    ).toBe(true);
    expect(
      isMaintenanceJobAuthorized({
        authorizationHeader: null,
        configuredSecret: "secret-123",
        dryRun: false,
        nodeEnv: "production",
        secretHeader: "secret-123",
      }),
    ).toBe(true);
  });

  it("rejects production requests without the configured secret", () => {
    expect(
      isMaintenanceJobAuthorized({
        authorizationHeader: null,
        configuredSecret: undefined,
        dryRun: true,
        nodeEnv: "production",
        secretHeader: null,
      }),
    ).toBe(false);
  });

  it("allows local dry-run without a secret", () => {
    expect(
      isMaintenanceJobAuthorized({
        authorizationHeader: null,
        configuredSecret: undefined,
        dryRun: true,
        nodeEnv: "development",
        secretHeader: null,
      }),
    ).toBe(true);
  });
});

describe("readPositiveIntegerSetting", () => {
  it("uses positive integer values", () => {
    expect(readPositiveIntegerSetting(30, 90)).toBe(30);
  });

  it("falls back for invalid values", () => {
    expect(readPositiveIntegerSetting("30", 90)).toBe(90);
    expect(readPositiveIntegerSetting(0, 90)).toBe(90);
    expect(readPositiveIntegerSetting(2.5, 90)).toBe(90);
  });
});
