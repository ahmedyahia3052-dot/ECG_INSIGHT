import type { ScreenContract, ListRowView } from "./common";

export type OrganizationsScreenData = {
  members: ListRowView[];
  organizationName?: string;
  pendingInvites: number;
  query: string;
  roleCounts: Array<{ count: number; role: string }>;
};

export type OrganizationsScreenActions = {
  onInviteMember: () => void;
  onOpenMember: (memberId: string) => void;
  onSetQuery: (value: string) => void;
};

export type OrganizationsScreenContract = ScreenContract<OrganizationsScreenData, OrganizationsScreenActions>;
