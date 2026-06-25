import { Redirect } from "expo-router";

export default function PatientsAliasRoute() {
  if (__DEV__) console.info("[route-mount] /patients alias -> /(tabs)/history");
  return <Redirect href="/(tabs)/history" />;
}
