import React, { createContext, useContext, type PropsWithChildren } from "react";

import type { DashboardScreenActions } from "@/types/screens/dashboard";

const ActionsContext = createContext<DashboardScreenActions | null>(null);

export function BoltRouterLinkProvider({
  actions,
  children,
}: PropsWithChildren<{ actions: DashboardScreenActions }>) {
  return <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>;
}

export function useBoltDashboardActions() {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error("BoltRouterLinkProvider is required for the imported Bolt dashboard.");
  return actions;
}
