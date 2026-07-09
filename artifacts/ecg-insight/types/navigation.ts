import type { Feather } from "@expo/vector-icons";

export type AppRouteGroup = "CLINICAL" | "DEVELOPER" | "WORKSPACE";

export type AppNavItem = {
  group: AppRouteGroup;
  href: string;
  icon: keyof typeof Feather.glyphMap;
  minRole?: "admin" | "doctor" | "student" | "super_admin";
  ownerOnly?: boolean;
  title: string;
};

export type AppPageMeta = {
  subtitle: string;
  title: string;
};
