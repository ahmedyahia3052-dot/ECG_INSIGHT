import { Redirect } from "expo-router";

export default function DashboardAliasRoute() {
  if (__DEV__) console.info("[route-mount] /dashboard alias -> /(tabs)");
  return <Redirect href="/(tabs)" />;
}
