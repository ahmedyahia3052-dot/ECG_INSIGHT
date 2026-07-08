export type FoundationRole =
  | "super_admin"
  | "admin"
  | "corporate_client"
  | "doctor"
  | "student"
  | "user";

export const FOUNDATION_ROLE_HIERARCHY: Record<FoundationRole, number> = {
  admin: 3,
  corporate_client: 2,
  doctor: 2,
  student: 1,
  super_admin: 4,
  user: 1,
};
