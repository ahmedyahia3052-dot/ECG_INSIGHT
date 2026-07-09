import React, { forwardRef, type ComponentProps, type ReactNode } from "react";
import { Link as ExpoLink } from "expo-router";

type Props = Omit<ComponentProps<typeof ExpoLink>, "href"> & {
  children: ReactNode;
  to: string;
};

const ROUTE_MAP: Record<string, string> = {
  "/cases": "/ecg-cases",
  "/history": "/ecg-cases",
  "/upload": "/upload-ecg",
};

function resolveHref(to: string) {
  if (ROUTE_MAP[to]) return ROUTE_MAP[to];
  if (to.startsWith("/cases/")) return to.replace("/cases/", "/ecg-cases/");
  return to;
}

/** Expo-router bridge for the original Bolt dashboard links. */
export const Link = forwardRef<HTMLAnchorElement, Props>(function BoltRouterLink({ children, className, to, ...rest }, ref) {
  return (
    <ExpoLink className={className} href={resolveHref(to) as never} ref={ref as never} {...rest}>
      {children}
    </ExpoLink>
  );
});
