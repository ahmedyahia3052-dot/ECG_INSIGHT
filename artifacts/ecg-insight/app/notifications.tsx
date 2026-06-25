import { Redirect } from "expo-router";

export default function NotificationsAliasRoute() {
  if (__DEV__) console.info("[route-mount] /notifications alias -> /(tabs)/notification-center");
  return <Redirect href="/(tabs)/notification-center" />;
}
