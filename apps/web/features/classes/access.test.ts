import { describe, expect, it } from "vitest";

import { canAccessMaterial, canShowStudentModuleContent } from "./access";

describe("class access rules", () => {
  it("allows students to open material only from published and unlocked modules", () => {
    expect(
      canAccessMaterial({
        classStatus: "published",
        isClassMember: true,
        isClassOwner: false,
        moduleIsLocked: false,
        profileRole: "mahasiswa",
      }),
    ).toBe(true);

    expect(
      canAccessMaterial({
        classStatus: "published",
        isClassMember: true,
        isClassOwner: false,
        moduleIsLocked: true,
        profileRole: "mahasiswa",
      }),
    ).toBe(false);
  });

  it("blocks students from material when a class is draft or archived", () => {
    for (const classStatus of ["draft", "archived"] as const) {
      expect(
        canAccessMaterial({
          classStatus,
          isClassMember: true,
          isClassOwner: false,
          moduleIsLocked: false,
          profileRole: "mahasiswa",
        }),
      ).toBe(false);
    }
  });

  it("keeps lecturers and admins able to manage material in locked or archived classes", () => {
    expect(
      canAccessMaterial({
        classStatus: "archived",
        isClassMember: false,
        isClassOwner: true,
        moduleIsLocked: true,
        profileRole: "dosen",
      }),
    ).toBe(true);

    expect(
      canAccessMaterial({
        classStatus: "draft",
        isClassMember: false,
        isClassOwner: false,
        moduleIsLocked: true,
        profileRole: "admin",
      }),
    ).toBe(true);
  });

  it("uses the same visibility rule for student module content", () => {
    expect(
      canShowStudentModuleContent({
        classStatus: "published",
        moduleIsLocked: false,
      }),
    ).toBe(true);

    expect(
      canShowStudentModuleContent({
        classStatus: "published",
        moduleIsLocked: true,
      }),
    ).toBe(false);
  });
});
