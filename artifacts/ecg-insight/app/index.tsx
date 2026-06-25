import { Redirect } from "expo-router";

import { FullScreenLoader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";

export default function RootIndex() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader label="Preparing ECG Insight..." />;
  return <Redirect href={isAuthenticated ? "/dashboard" : "/login"} />;
}
