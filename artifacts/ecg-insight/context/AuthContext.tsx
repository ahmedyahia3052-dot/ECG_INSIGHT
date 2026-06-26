import React, { createContext, useCallback, useContext, useEffect } from "react";
import { create } from "zustand";
import { type ManagedUser } from "@/data/mockData";
import { apiRequest, ApiError, setApiAccessToken, setApiTokenRefreshHandler } from "@/services/api";

export type UserRole = "super_admin" | "admin" | "corporate_client" | "doctor" | "student" | "user";

export interface User {
  id: string;
  name: string;
  email: string;
  accountType?: "INDIVIDUAL" | "ORGANIZATION";
  phoneNumber?: string;
  phoneVerified?: boolean;
  role: UserRole;
  specialization?: string;
  institution?: string;
  organizationId?: string;
  registrationRole?: string;
  avatarInitials: string;
  emailVerified?: boolean;
  isActive?: boolean;
  isOwner?: boolean;
  isLifetime?: boolean;
  lifetimeGrantedAt?: string;
  lifetimeGrantedBy?: string;
  ownerPasswordSetupRequired?: boolean;
  ownerTwoFactorRequired?: boolean;
  protectedOwner?: boolean;
  subscriptionTier?: "free" | "basic" | "professional" | "enterprise";
  username?: string;
}

export interface AuthToken {
  token: string;
  expiresAt: number;
}

interface AuthContextType {
  user: User | null;
  authToken: AuthToken | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  rememberMe: boolean;

  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role: "admin" | "corporate_client" | "doctor" | "student" | "user",
    phoneNumber?: string,
    institution?: string,
    specialization?: string,
    registration?: {
      accountType?: "INDIVIDUAL" | "ORGANIZATION";
      organizationCity?: string;
      organizationCountry?: string;
      organizationName?: string;
      organizationType?: string;
      registrationRole?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  requestPhoneOtp: (phoneNumber: string, purpose?: "LOGIN" | "REGISTER", name?: string) => Promise<{ success: boolean; otp?: string; error?: string }>;
  verifyPhoneOtp: (phoneNumber: string, otp: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  oauthLogin: (provider: "GOOGLE" | "APPLE" | "MICROSOFT", providerUserId: string, email?: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; token?: string; error?: string }>;

  forgotPassword: (email: string) => Promise<boolean>;
  verifyResetCode: (email: string, code: string) => Promise<boolean>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<boolean>;

  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;

  managedUsers: ManagedUser[];
  activateUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  createInternalAccount: (
    name: string,
    email: string,
    role: UserRole
  ) => Promise<ManagedUser>;

  canAccess: (requiredRole: UserRole | UserRole[]) => boolean;
}

interface AuthPayload {
  accessToken: string;
  emailVerificationToken?: string;
  user: User;
}

interface UsersPayload {
  users: ManagedUser[];
}

interface UserPayload {
  user: ManagedUser;
}

interface ForgotPasswordPayload {
  resetToken?: string;
}

interface AuthStore {
  accessToken: string | null;
  isLoading: boolean;
  isImpersonating: boolean;
  managedUsers: ManagedUser[];
  originalAccessToken: string | null;
  originalUser: User | null;
  rememberMe: boolean;
  resetTokensByEmail: Record<string, string>;
  user: User | null;
  setState: (patch: Partial<Omit<AuthStore, "setState">>) => void;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  corporate_client: 2,
  doctor: 2,
  student: 1,
  user: 1,
};

const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  isLoading: true,
  isImpersonating: false,
  managedUsers: [],
  originalAccessToken: null,
  originalUser: null,
  rememberMe: false,
  resetTokensByEmail: {},
  user: null,
  setState: (patch) => set(patch),
}));

const AuthContext = createContext<AuthContextType>({
  user: null,
  authToken: null,
  isLoading: true,
  isAuthenticated: false,
  isImpersonating: false,
  rememberMe: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  register: async () => ({ success: false }),
  requestPhoneOtp: async () => ({ success: false }),
  verifyPhoneOtp: async () => ({ success: false }),
  oauthLogin: async () => ({ success: false }),
  resendVerification: async () => ({ success: false }),
  forgotPassword: async () => false,
  verifyResetCode: async () => false,
  resetPassword: async () => false,
  impersonateUser: async () => {},
  stopImpersonation: async () => {},
  managedUsers: [],
  activateUser: async () => {},
  deactivateUser: async () => {},
  createInternalAccount: async () => ({} as ManagedUser),
  canAccess: () => false,
});

function tokenToAuthToken(accessToken: string | null): AuthToken | null {
  return accessToken
    ? { token: accessToken, expiresAt: Date.now() + 15 * 60 * 1000 }
    : null;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    accessToken,
    isImpersonating,
    isLoading,
    managedUsers,
    originalAccessToken,
    originalUser,
    rememberMe,
    resetTokensByEmail,
    setState,
    user,
  } = useAuthStore();

  const fetchManagedUsers = useCallback(
    async (token?: string | null) => {
      const currentToken = token ?? useAuthStore.getState().accessToken;
      if (!currentToken) return;
      const payload = await apiRequest<UsersPayload>("/users", { accessToken: currentToken });
      setState({ managedUsers: payload.users });
    },
    [setState]
  );

  useEffect(() => {
    setApiAccessToken(accessToken);
    setApiTokenRefreshHandler((nextAccessToken) => {
      setState({ accessToken: nextAccessToken });
    });
    return () => {
      setApiTokenRefreshHandler(null);
    };
  }, [accessToken, setState]);

  useEffect(() => {
    (async () => {
      try {
        const refreshed = await apiRequest<AuthPayload>("/auth/refresh", {
          method: "POST",
        });
        setState({
          accessToken: refreshed.accessToken,
          isLoading: false,
          user: refreshed.user,
        });
        setApiAccessToken(refreshed.accessToken);
        if (ROLE_HIERARCHY[refreshed.user.role] >= ROLE_HIERARCHY.admin) {
          await fetchManagedUsers(refreshed.accessToken);
        }
      } catch {
        setState({ accessToken: null, isLoading: false, user: null });
      }
    })();
  }, [fetchManagedUsers, setState]);

  const login = useCallback(
    async (email: string, password: string, remember = false) => {
      try {
        const payload = await apiRequest<AuthPayload>("/auth/login", {
          body: JSON.stringify({ email, password, rememberMe: remember }),
          method: "POST",
        });
        setState({
          accessToken: payload.accessToken,
          isImpersonating: false,
          originalAccessToken: null,
          originalUser: null,
          rememberMe: remember,
          user: payload.user,
        });
        setApiAccessToken(payload.accessToken);
        if (ROLE_HIERARCHY[payload.user.role] >= ROLE_HIERARCHY.admin) {
          await fetchManagedUsers(payload.accessToken);
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: errorMessage(error, "Login failed.") };
      }
    },
    [fetchManagedUsers, setState]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      role: "admin" | "corporate_client" | "doctor" | "student" | "user",
      phoneNumber?: string,
      institution?: string,
      specialization?: string,
      registration?: {
        accountType?: "INDIVIDUAL" | "ORGANIZATION";
        organizationCity?: string;
        organizationCountry?: string;
        organizationName?: string;
        organizationType?: string;
        registrationRole?: string;
      }
    ) => {
      try {
        const payload = await apiRequest<AuthPayload>("/auth/register", {
          body: JSON.stringify({ email: email || undefined, institution, name, password: password || undefined, phoneNumber, role, specialization, ...registration }),
          method: "POST",
        });
        setState({
          accessToken: payload.accessToken,
          rememberMe: true,
          user: payload.user,
        });
        setApiAccessToken(payload.accessToken);
        return { success: true };
      } catch (error) {
        return { success: false, error: errorMessage(error, "Registration failed.") };
      }
    },
    [setState]
  );

  const requestPhoneOtp = useCallback(async (phoneNumber: string, purpose: "LOGIN" | "REGISTER" = "LOGIN", name?: string) => {
    try {
      const payload = await apiRequest<{ otp?: string }>("/auth/phone/request-otp", {
        body: JSON.stringify({ name, phoneNumber, purpose }),
        method: "POST",
      });
      return { success: true, otp: payload.otp };
    } catch (error) {
      return { success: false, error: errorMessage(error, "Unable to send phone OTP.") };
    }
  }, []);

  const verifyPhoneOtp = useCallback(
    async (phoneNumber: string, otp: string, remember = true) => {
      try {
        const payload = await apiRequest<AuthPayload>("/auth/phone/verify", {
          body: JSON.stringify({ otp, phoneNumber, rememberMe: remember }),
          method: "POST",
        });
        setState({ accessToken: payload.accessToken, rememberMe: remember, user: payload.user });
        setApiAccessToken(payload.accessToken);
        return { success: true };
      } catch (error) {
        return { success: false, error: errorMessage(error, "Phone verification failed.") };
      }
    },
    [setState]
  );

  const oauthLogin = useCallback(
    async (provider: "GOOGLE" | "APPLE" | "MICROSOFT", providerUserId: string, email?: string, name?: string) => {
      try {
        const payload = await apiRequest<AuthPayload>("/auth/oauth/login", {
          body: JSON.stringify({ email, name, provider, providerUserId, rememberMe: true }),
          method: "POST",
        });
        setState({ accessToken: payload.accessToken, rememberMe: true, user: payload.user });
        setApiAccessToken(payload.accessToken);
        return { success: true };
      } catch (error) {
        return { success: false, error: errorMessage(error, `${provider} sign-in failed.`) };
      }
    },
    [setState]
  );

  const resendVerification = useCallback(async (email: string) => {
    try {
      const payload = await apiRequest<{ emailVerificationToken?: string }>("/auth/resend-verification", {
        body: JSON.stringify({ email }),
        method: "POST",
      });
      return { success: true, token: payload.emailVerificationToken };
    } catch (error) {
      return { success: false, error: errorMessage(error, "Unable to resend verification email.") };
    }
  }, []);

  const logout = useCallback(async () => {
    await apiRequest<void>("/auth/logout", { method: "POST", accessToken }).catch(() => {});
    setState({
      accessToken: null,
      isImpersonating: false,
      managedUsers: [],
      originalAccessToken: null,
      originalUser: null,
      user: null,
    });
    setApiAccessToken(null);
  }, [accessToken, setState]);

  const forgotPassword = useCallback(
    async (email: string): Promise<boolean> => {
      const payload = await apiRequest<ForgotPasswordPayload>("/auth/forgot-password", {
        body: JSON.stringify({ email }),
        method: "POST",
      });
      if (payload.resetToken) {
        setState({
          resetTokensByEmail: {
            ...resetTokensByEmail,
            [email.trim().toLowerCase()]: payload.resetToken,
          },
        });
      }
      return true;
    },
    [resetTokensByEmail, setState]
  );

  const verifyResetCode = useCallback(async (_email: string, code: string): Promise<boolean> => {
    return code.trim().length >= 6;
  }, []);

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string): Promise<boolean> => {
      const token = resetTokensByEmail[email.trim().toLowerCase()] ?? code;
      await apiRequest<void>("/auth/reset-password", {
        body: JSON.stringify({ email, newPassword, token }),
        method: "POST",
      });
      return true;
    },
    [resetTokensByEmail]
  );

  const impersonateUser = useCallback(
    async (userId: string) => {
      if (!accessToken || !user) return;
      const payload = await apiRequest<AuthPayload>(`/users/${userId}/impersonate`, {
        accessToken,
        method: "POST",
      });
      setState({
        accessToken: payload.accessToken,
        isImpersonating: true,
        originalAccessToken: originalAccessToken ?? accessToken,
        originalUser: originalUser ?? user,
        user: payload.user,
      });
      setApiAccessToken(payload.accessToken);
    },
    [accessToken, originalAccessToken, originalUser, setState, user]
  );

  const stopImpersonation = useCallback(async () => {
    if (!originalAccessToken || !originalUser) return;
    setState({
      accessToken: originalAccessToken,
      isImpersonating: false,
      originalAccessToken: null,
      originalUser: null,
      user: originalUser,
    });
    setApiAccessToken(originalAccessToken);
    await fetchManagedUsers(originalAccessToken).catch(() => {});
  }, [fetchManagedUsers, originalAccessToken, originalUser, setState]);

  const activateUser = useCallback(
    async (userId: string) => {
      if (!accessToken) return;
      await apiRequest<UserPayload>(`/users/${userId}/status`, {
        accessToken,
        body: JSON.stringify({ isActive: true }),
        method: "PATCH",
      });
      await fetchManagedUsers(accessToken);
    },
    [accessToken, fetchManagedUsers]
  );

  const deactivateUser = useCallback(
    async (userId: string) => {
      if (!accessToken) return;
      await apiRequest<UserPayload>(`/users/${userId}/status`, {
        accessToken,
        body: JSON.stringify({ isActive: false }),
        method: "PATCH",
      });
      await fetchManagedUsers(accessToken);
    },
    [accessToken, fetchManagedUsers]
  );

  const createInternalAccount = useCallback(
    async (name: string, email: string, role: UserRole): Promise<ManagedUser> => {
      if (!accessToken) throw new Error("Authentication required.");
      const payload = await apiRequest<UserPayload>("/users/internal", {
        accessToken,
        body: JSON.stringify({ email, name, role }),
        method: "POST",
      });
      await fetchManagedUsers(accessToken);
      return payload.user;
    },
    [accessToken, fetchManagedUsers]
  );

  const canAccess = useCallback(
    (requiredRole: UserRole | UserRole[]): boolean => {
      if (!user) return false;
      if (originalUser?.role === "super_admin") return true;
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const userLevel = ROLE_HIERARCHY[user.role];
      return roles.some((role) => userLevel >= ROLE_HIERARCHY[role]);
    },
    [originalUser, user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        authToken: tokenToAuthToken(accessToken),
        isLoading,
        isAuthenticated: !!user && !!accessToken,
        isImpersonating,
        rememberMe,
        login,
        logout,
        register,
        requestPhoneOtp,
        verifyPhoneOtp,
        oauthLogin,
        resendVerification,
        forgotPassword,
        verifyResetCode,
        resetPassword,
        impersonateUser,
        stopImpersonation,
        managedUsers,
        activateUser,
        deactivateUser,
        createInternalAccount,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
