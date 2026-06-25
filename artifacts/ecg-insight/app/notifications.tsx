import { Redirect } from "expo-router";

export default function NotificationsAliasRoute() {
  if (__DEV__) console.info("[route-mount] /notifications alias -> /notification-center");
  return <Redirect href="/notification-center" />;
}
