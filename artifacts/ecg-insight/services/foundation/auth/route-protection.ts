import { FOUNDATION_ROLE_HIERARCHY, type FoundationRole } from "./roles";

export const PROTECTED_ROUTE_ROLES: Record<string, FoundationRole[]> = {
  "/admin-dashboard": ["admin", "super_admin"],
  "/audit-log": ["admin", "super_admin"],
  "/billing-subscription": ["admin", "super_admin"],
  "/ecg-benchmark": ["admin", "super_admin"],
  "/owner/licenses": ["super_admin"],
  "/release-candidate": ["super_admin"],
  "/team-management": ["admin", "super_admin"],
};

export function normalizeRoutePath(pathname: string) {
  const withoutQuery = pathname.split("?")[0] ?? pathname;
  return withoutQuery.endsWith("/") && withoutQuery.length > 1
    ? withoutQuery.slice(0, -1)
    : withoutQuery;
}

export function requiredRolesForRoute(pathname: string): FoundationRole[] | null {
  const normalized = normalizeRoutePath(pathname);
  if (PROTECTED_ROUTE_ROLES[normalized]) {
    return PROTECTED_ROUTE_ROLES[normalized];
  }
  for (const [route, roles] of Object.entries(PROTECTED_ROUTE_ROLES)) {
    if (normalized.startsWith(`${route}/`)) return roles;
  }
  return null;
}

export function canAccessRoute(pathname: string, role: FoundationRole | null | undefined, isOwner = false) {
  if (isOwner || role === "super_admin") return true;
  const required = requiredRolesForRoute(pathname);
  if (!required || !role) return !required;
  const userLevel = FOUNDATION_ROLE_HIERARCHY[role];
  return required.some((entry) => userLevel >= FOUNDATION_ROLE_HIERARCHY[entry]);
}

export function routeAccessDeniedMessage(pathname: string) {
  const required = requiredRolesForRoute(pathname);
  if (!required) return "Access denied.";
  return `This route requires one of the following roles: ${required.join(", ")}.`;
}
