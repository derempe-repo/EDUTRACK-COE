import { describe, expect, it } from "vitest";

import {
  canReviewSubmission,
  canSubmitAssignment,
  canViewAssignment,
  progressStatusFromSubmission,
} from "./access";

describe("assignment access rules", () => {
  it("allows enrolled students to view and submit active assignments in published unlocked modules", () => {
    const input = {
      assignmentIsActive: true,
      classStatus: "published" as const,
      isClassMember: true,
      isClassOwner: false,
      moduleIsLocked: false,
      profileRole: "mahasiswa" as const,
    };

    expect(canViewAssignment(input)).toBe(true);
    expect(canSubmitAssignment(input)).toBe(true);
  });

  it("blocks students from draft, archived, inactive, or locked assignment contexts", () => {
    const base = {
      assignmentIsActive: true,
      classStatus: "published" as const,
      isClassMember: true,
      isClassOwner: false,
      moduleIsLocked: false,
      profileRole: "mahasiswa" as const,
    };

    expect(canSubmitAssignment({ ...base, classStatus: "draft" })).toBe(false);
    expect(canSubmitAssignment({ ...base, classStatus: "archived" })).toBe(false);
    expect(canSubmitAssignment({ ...base, assignmentIsActive: false })).toBe(false);
    expect(canSubmitAssignment({ ...base, moduleIsLocked: true })).toBe(false);
  });

  it("allows class owners and admins to review submissions", () => {
    expect(canReviewSubmission({ isClassOwner: true, profileRole: "dosen" })).toBe(true);
    expect(canReviewSubmission({ isClassOwner: false, profileRole: "admin" })).toBe(true);
    expect(canReviewSubmission({ isClassOwner: false, profileRole: "mahasiswa" })).toBe(false);
  });

  it("maps submission status to progress status", () => {
    expect(progressStatusFromSubmission("accepted")).toBe("verified");
    expect(progressStatusFromSubmission("rejected")).toBe("failed");
    expect(progressStatusFromSubmission("resubmit_allowed")).toBe("in_progress");
    expect(progressStatusFromSubmission("submitted")).toBe("submitted");
    expect(progressStatusFromSubmission("locked")).toBe("locked");
  });
});
