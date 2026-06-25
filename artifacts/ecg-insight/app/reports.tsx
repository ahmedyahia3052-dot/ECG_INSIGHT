import { Redirect } from "expo-router";

export default function ReportsAliasRoute() {
  if (__DEV__) console.info("[route-mount] /reports alias -> /(tabs)/reports-dashboard");
  return <Redirect href="/(tabs)/reports-dashboard" />;
}
