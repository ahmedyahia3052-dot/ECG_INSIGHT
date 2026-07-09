import type { Role } from "./role";

export type User = {
  email: string;
  emailVerified?: boolean;
  id: string;
  institution?: string;
  name: string;
  role: Role;
  specialization?: string;
  username?: string;
};

export type Doctor = User & {
  licenseNumber?: string;
  role: "doctor" | "admin" | "super_admin";
};

export type AuthSession = {
  expiresAt?: string;
  refreshToken?: string;
  token: string;
  user: User;
};
