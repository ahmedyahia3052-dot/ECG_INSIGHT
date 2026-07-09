import type { ScreenContract } from "./common";

export type ProfileScreenData = {
  email?: string;
  institution?: string;
  licenseNumber?: string;
  name?: string;
  role?: string;
  sessionLabel: string;
  username?: string;
};

export type ProfileScreenActions = {
  onOpenSettings: () => void;
  onSignOut: () => void;
};

export type ProfileScreenContract = ScreenContract<ProfileScreenData, ProfileScreenActions>;
