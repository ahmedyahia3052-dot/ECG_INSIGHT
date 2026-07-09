import React from "react";

import { ThemeEngineProvider } from "../theme-engine";

type Props = {
  children: React.ReactNode;
};

/**
 * Root design-system provider — wraps theme engine without altering page layouts.
 * All Bolt and future UI imports should mount beneath this provider.
 */
export function DesignSystemProvider({ children }: Props) {
  return <ThemeEngineProvider>{children}</ThemeEngineProvider>;
}
