import { describe, expect, it } from "vitest";

import { canManageProfile, getAssignableRoles } from "./permissions";

describe("admin profile permissions", () => {
  it("allows admins to manage mahasiswa and dosen profiles", () => {
    expect(
      canManageProfile({
        actorId: "admin-1",
        actorRole: "admin",
        nextRole: "dosen",
        nextStatus: "active",
        targetId: "student-1",
        targetRole: "mahasiswa",
      }),
    ).toBe(true);
  });

  it("blocks admins from managing privileged profiles", () => {
    expect(
      canManageProfile({
        actorId: "admin-1",
        actorRole: "admin",
        nextRole: "mahasiswa",
        nextStatus: "inactive",
        targetId: "admin-2",
        targetRole: "admin",
      }),
    ).toBe(false);
  });

  it("blocks self-management to prevent accidental lockout", () => {
    expect(
      canManageProfile({
        actorId: "root",
        actorRole: "super_admin",
        nextRole: "admin",
        nextStatus: "inactive",
        targetId: "root",
        targetRole: "super_admin",
      }),
    ).toBe(false);
  });

  it("only exposes privileged roles to super admins", () => {
    expect(getAssignableRoles("admin")).toEqual(["mahasiswa", "dosen"]);
    expect(getAssignableRoles("super_admin")).toContain("admin");
  });
});
