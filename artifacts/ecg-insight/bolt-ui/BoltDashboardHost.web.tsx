import React from "react";

import type { DashboardScreenContract } from "@/types/screens/dashboard";

import { BoltRouterLinkProvider } from "./components/bolt-router-link-provider";
import { BoltDashboardDataProvider } from "./lib/dashboard-data";
import { DashboardPage } from "./pages/dashboard";
import { BoltAuthProvider } from "./store/auth-shim";
import "./styles/bolt-dashboard.css";

type Props = {
  contract: DashboardScreenContract;
};

/** Web host for the original imported Bolt dashboard page. */
export function BoltDashboardHost({ contract }: Props) {
  return (
    <div className="dark bolt-dashboard-root">
      <BoltAuthProvider user={contract.data.user}>
        <BoltDashboardDataProvider contract={contract}>
          <BoltRouterLinkProvider actions={contract.actions}>
            <DashboardPage />
          </BoltRouterLinkProvider>
        </BoltDashboardDataProvider>
      </BoltAuthProvider>
    </div>
  );
}
