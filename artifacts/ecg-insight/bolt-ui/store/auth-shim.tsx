import React, { createContext, useContext, type PropsWithChildren } from "react";

import type { ScreenUserContext } from "@/types/screens/common";

type AuthStoreState = {
  user?: {
    name?: string;
  };
};

const AuthStoreContext = createContext<AuthStoreState>({});

export function BoltAuthProvider({ children, user }: PropsWithChildren<{ user: ScreenUserContext }>) {
  return <AuthStoreContext.Provider value={{ user: { name: user.name } }}>{children}</AuthStoreContext.Provider>;
}

/** Drop-in replacement for Bolt `useAuthStore` in the imported dashboard page. */
export function useAuthStore() {
  return useContext(AuthStoreContext);
}
