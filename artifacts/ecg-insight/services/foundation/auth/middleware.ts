import { ApiError } from "@/services/api";

import { enterpriseLogger } from "../logging/enterprise-logger";
import { FOUNDATION_ROLE_HIERARCHY, type FoundationRole } from "./roles";

type AccessTokenProvider = () => string | null;
type UserRoleProvider = () => FoundationRole | null;

let accessTokenProvider: AccessTokenProvider = () => null;
let userRoleProvider: UserRoleProvider = () => null;

export function setFoundationAccessTokenProvider(provider: AccessTokenProvider) {
  accessTokenProvider = provider;
}

export function setFoundationUserRoleProvider(provider: UserRoleProvider) {
  userRoleProvider = provider;
}

export function getFoundationAccessToken(): string | null {
  return accessTokenProvider();
}

export function requireFoundationAccessToken(): string {
  const token = accessTokenProvider();
  if (!token) {
    throw new ApiError("Authentication required.", 401, "AUTH_REQUIRED");
  }
  return token;
}

export function getFoundationUserRole(): FoundationRole | null {
  return userRoleProvider();
}

export function assertFoundationRole(required: FoundationRole | FoundationRole[]) {
  const role = userRoleProvider();
  if (!role) {
    throw new ApiError("Authentication required.", 401, "AUTH_REQUIRED");
  }
  const roles = Array.isArray(required) ? required : [required];
  const userLevel = FOUNDATION_ROLE_HIERARCHY[role];
  const allowed = roles.some((entry) => userLevel >= FOUNDATION_ROLE_HIERARCHY[entry]);
  if (!allowed) {
    enterpriseLogger.warn("auth-middleware", "Role denied", { required: roles, role });
    throw new ApiError("Access denied.", 403, "ROLE_DENIED");
  }
}

export function withAuthMiddleware<T>(operation: (accessToken: string) => Promise<T>): Promise<T> {
  const token = requireFoundationAccessToken();
  return operation(token);
}
