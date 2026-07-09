import { DashboardBoltPresentation } from "@/presentation/bolt";
import type { DashboardScreenContract } from "@/types/screens/dashboard";

/** Native fallback — web uses the imported original Bolt dashboard host. */
export function BoltDashboardHost({ contract }: { contract: DashboardScreenContract }) {
  return <DashboardBoltPresentation contract={contract} />;
}
