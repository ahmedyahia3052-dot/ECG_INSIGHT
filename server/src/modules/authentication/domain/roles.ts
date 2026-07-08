import type { Role } from "@prisma/client";

/** Sprint 83 enterprise authentication roles exposed to the API layer. */
export type AuthenticationApiRole =
  | "super_admin"
  | "organization_admin"
  | "admin"
  | "doctor"
  | "technician"
  | "student"
  | "corporate_client"
  | "user";

export const AUTHENTICATION_ROLE_LABELS: Record<AuthenticationApiRole, string> = {
  admin: "Platform Administrator",
  corporate_client: "Corporate Client",
  doctor: "Doctor",
  organization_admin: "Organization Admin",
  student: "Student",
  super_admin: "Super Admin",
  technician: "Technician",
  user: "User",
};

export const ROLE_RANK: Record<Role, number> = {
  ADMIN: 4,
  CORPORATE_CLIENT: 2,
  DOCTOR: 3,
  ORGANIZATION_ADMIN: 3,
  OWNER: 5,
  STUDENT: 1,
  SUPER_ADMIN: 5,
  TECHNICIAN: 2,
  USER: 1,
};

const apiToPrisma: Record<AuthenticationApiRole, Role> = {
  admin: "ADMIN",
  corporate_client: "CORPORATE_CLIENT",
  doctor: "DOCTOR",
  organization_admin: "ORGANIZATION_ADMIN",
  student: "STUDENT",
  super_admin: "SUPER_ADMIN",
  technician: "TECHNICIAN",
  user: "USER",
};

const prismaToApi: Record<Role, AuthenticationApiRole> = {
  ADMIN: "admin",
  CORPORATE_CLIENT: "corporate_client",
  DOCTOR: "doctor",
  ORGANIZATION_ADMIN: "organization_admin",
  OWNER: "super_admin",
  STUDENT: "student",
  SUPER_ADMIN: "super_admin",
  TECHNICIAN: "technician",
  USER: "user",
};

export function toAuthenticationApiRole(role: Role): AuthenticationApiRole {
  return prismaToApi[role];
}

export function fromAuthenticationApiRole(role: AuthenticationApiRole): Role {
  return apiToPrisma[role];
}

export function roleSatisfies(required: Role, actor: Role): boolean {
  if (actor === "OWNER" || actor === "SUPER_ADMIN") return true;
  return ROLE_RANK[actor] >= ROLE_RANK[required];
}

export function registrationRoleLabel(apiRole: AuthenticationApiRole, explicit?: string): string {
  if (explicit) return explicit;
  if (apiRole === "doctor") return "Doctor";
  if (apiRole === "technician") return "Technician";
  if (apiRole === "student") return "Medical Student";
  if (apiRole === "organization_admin") return "Organization Administrator";
  if (apiRole === "admin" || apiRole === "super_admin") return "Administrator";
  return "Doctor";
}
