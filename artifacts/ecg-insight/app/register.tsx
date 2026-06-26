import { Redirect } from "expo-router";
import React from "react";

export default function RegisterRoute() {
  return <Redirect href="/login?mode=register" />;
}
