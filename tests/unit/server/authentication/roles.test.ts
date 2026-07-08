import { describe, expect, it } from "vitest";
import {
  AUTHENTICATION_ROLE_LABELS,
  ROLE_RANK,
  fromAuthenticationApiRole,
  registrationRoleLabel,
  roleSatisfies,
  toAuthenticationApiRole,
} from "../../../../server/src/modules/authentication/domain/roles";

describe("authentication roles", () => {
  it("maps sprint 83 enterprise roles", () => {
    expect(toAuthenticationApiRole("SUPER_ADMIN")).toBe("super_admin");
    expect(toAuthenticationApiRole("ORGANIZATION_ADMIN")).toBe("organization_admin");
    expect(toAuthenticationApiRole("DOCTOR")).toBe("doctor");
    expect(toAuthenticationApiRole("TECHNICIAN")).toBe("technician");
    expect(toAuthenticationApiRole("STUDENT")).toBe("student");
  });

  it("round-trips API roles to prisma roles", () => {
    expect(fromAuthenticationApiRole("technician")).toBe("TECHNICIAN");
    expect(fromAuthenticationApiRole("organization_admin")).toBe("ORGANIZATION_ADMIN");
  });

  it("labels registration roles", () => {
    expect(registrationRoleLabel("technician")).toBe("Technician");
    expect(registrationRoleLabel("organization_admin")).toBe("Organization Administrator");
  });

  it("ranks roles for RBAC checks", () => {
    expect(roleSatisfies("DOCTOR", "SUPER_ADMIN")).toBe(true);
    expect(roleSatisfies("DOCTOR", "STUDENT")).toBe(false);
    expect(ROLE_RANK.TECHNICIAN).toBeGreaterThan(ROLE_RANK.STUDENT);
  });

  it("documents sprint 83 role labels", () => {
    expect(Object.keys(AUTHENTICATION_ROLE_LABELS)).toEqual(
      expect.arrayContaining(["super_admin", "organization_admin", "doctor", "technician", "student"]),
    );
  });
});
