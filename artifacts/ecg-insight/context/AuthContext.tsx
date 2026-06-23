import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { MANAGED_USERS, type ManagedUser } from "@/data/mockData";

export type UserRole = "super_admin" | "admin" | "doctor" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialization?: string;
  institution?: string;
  avatarInitials: string;
  emailVerified?: boolean;
}

export interface AuthToken {
  token: string;
  expiresAt: number;
  refreshToken: string;
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
    role: "doctor" | "student"
  ) => Promise<{ success: boolean; error?: string }>;

  forgotPassword: (email: string) => Promise<boolean>;
  verifyResetCode: (email: string, code: string) => Promise<boolean>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<boolean>;

  impersonateUser: (userId: string) => void;
  stopImpersonation: () => void;

  managedUsers: ManagedUser[];
  activateUser: (userId: string) => void;
  deactivateUser: (userId: string) => void;
  createInternalAccount: (
    name: string,
    email: string,
    role: UserRole
  ) => ManagedUser;

  canAccess: (requiredRole: UserRole | UserRole[]) => boolean;
}

const MOCK_CREDENTIALS: (User & {
  password: string;
  emailVerified: boolean;
})[] = [
  {
    id: "u0",
    name: "Dev Super Admin",
    email: "super@ecginsight.com",
    password: "password",
    role: "super_admin",
    institution: "ECG Insight Dev",
    avatarInitials: "SA",
    emailVerified: true,
  },
  {
    id: "u1",
    name: "Dr. Sarah Chen",
    email: "doctor@ecginsight.com",
    password: "password",
    role: "doctor",
    specialization: "Cardiology",
    institution: "Metro General Hospital",
    avatarInitials: "SC",
    emailVerified: true,
  },
  {
    id: "u2",
    name: "James Okafor",
    email: "student@ecginsight.com",
    password: "password",
    role: "student",
    specialization: "Medical Student (Year 3)",
    institution: "State Medical University",
    avatarInitials: "JO",
    emailVerified: true,
  },
  {
    id: "u3",
    name: "Admin User",
    email: "admin@ecginsight.com",
    password: "password",
    role: "admin",
    institution: "ECG Insight HQ",
    avatarInitials: "AU",
    emailVerified: true,
  },
];

const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  doctor: 2,
  student: 1,
};

const AUTH_KEY = "@ecg_insight_auth_v2";
const TOKEN_KEY = "@ecg_insight_token_v2";
const REMEMBER_KEY = "@ecg_insight_remember";
const IMPERSONATION_KEY = "@ecg_insight_impersonate";

function generateMockToken(userId: string, role: UserRole): AuthToken {
  const now = Date.now();
  return {
    token: `eyJhbGciOiJIUzI1NiJ9.mock_${role}_${userId}_${now}`,
    refreshToken: `refresh_${userId}_${now + 86400000}`,
    expiresAt: now + 3600000,
  };
}

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
  forgotPassword: async () => false,
  verifyResetCode: async () => false,
  resetPassword: async () => false,
  impersonateUser: () => {},
  stopImpersonation: () => {},
  managedUsers: [],
  activateUser: () => {},
  deactivateUser: () => {},
  createInternalAccount: () => ({} as ManagedUser),
  canAccess: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<AuthToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>(MANAGED_USERS);

  useEffect(() => {
    (async () => {
      try {
        const [savedAuth, savedToken, savedRemember, savedImpersonation] =
          await Promise.all([
            AsyncStorage.getItem(AUTH_KEY),
            AsyncStorage.getItem(TOKEN_KEY),
            AsyncStorage.getItem(REMEMBER_KEY),
            AsyncStorage.getItem(IMPERSONATION_KEY),
          ]);

        const remember = savedRemember === "true";
        setRememberMe(remember);

        if (savedAuth) {
          const parsed = JSON.parse(savedAuth) as User;
          setUser(parsed);
        }
        if (savedToken) {
          const parsedToken = JSON.parse(savedToken) as AuthToken;
          if (parsedToken.expiresAt > Date.now()) {
            setAuthToken(parsedToken);
          }
        }
        if (savedImpersonation) {
          setImpersonatedUser(JSON.parse(savedImpersonation) as User);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const effectiveUser = impersonatedUser ?? user;

  const canAccess = useCallback(
    (requiredRole: UserRole | UserRole[]): boolean => {
      if (!effectiveUser) return false;
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const userLevel = ROLE_HIERARCHY[effectiveUser.role];
      return roles.some((r) => userLevel >= ROLE_HIERARCHY[r]);
    },
    [effectiveUser]
  );

  const login = useCallback(
    async (
      email: string,
      password: string,
      remember = false
    ): Promise<{ success: boolean; error?: string }> => {
      const found = MOCK_CREDENTIALS.find(
        (u) =>
          u.email.toLowerCase() === email.trim().toLowerCase() &&
          u.password === password
      );
      if (!found) {
        return { success: false, error: "Invalid email or password." };
      }
      const { password: _pw, ...userData } = found;
      const token = generateMockToken(userData.id, userData.role);

      setUser(userData);
      setAuthToken(token);
      setRememberMe(remember);

      const ops: Promise<void>[] = [
        AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(token)),
        AsyncStorage.setItem(REMEMBER_KEY, String(remember)),
      ];
      if (remember) {
        ops.push(AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userData)));
      } else {
        ops.push(AsyncStorage.removeItem(AUTH_KEY));
      }
      await Promise.all(ops);
      return { success: true };
    },
    []
  );

  const logout = useCallback(async () => {
    setUser(null);
    setAuthToken(null);
    setImpersonatedUser(null);
    await Promise.all([
      AsyncStorage.removeItem(AUTH_KEY),
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(IMPERSONATION_KEY),
    ]);
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      _password: string,
      role: "doctor" | "student"
    ): Promise<{ success: boolean; error?: string }> => {
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const newUser: User = {
        id: `u_${Date.now()}`,
        name,
        email,
        role,
        avatarInitials: initials,
        emailVerified: false,
      };
      const token = generateMockToken(newUser.id, newUser.role);
      setUser(newUser);
      setAuthToken(token);
      setRememberMe(true);
      await Promise.all([
        AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newUser)),
        AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(token)),
        AsyncStorage.setItem(REMEMBER_KEY, "true"),
      ]);
      return { success: true };
    },
    []
  );

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    const exists = MOCK_CREDENTIALS.some(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    await new Promise((r) => setTimeout(r, 800));
    return exists;
  }, []);

  const verifyResetCode = useCallback(
    async (_email: string, code: string): Promise<boolean> => {
      await new Promise((r) => setTimeout(r, 600));
      return code === "123456" || code === "000000";
    },
    []
  );

  const resetPassword = useCallback(
    async (
      _email: string,
      _code: string,
      _newPassword: string
    ): Promise<boolean> => {
      await new Promise((r) => setTimeout(r, 700));
      return true;
    },
    []
  );

  const impersonateUser = useCallback(
    async (userId: string) => {
      if (!user || user.role !== "super_admin") return;
      const target = managedUsers.find((u) => u.id === userId);
      if (!target) return;
      const impUser: User = {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        avatarInitials: target.avatarInitials,
        specialization: target.specialization,
        institution: target.institution,
      };
      setImpersonatedUser(impUser);
      await AsyncStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impUser));
    },
    [user, managedUsers]
  );

  const stopImpersonation = useCallback(async () => {
    setImpersonatedUser(null);
    await AsyncStorage.removeItem(IMPERSONATION_KEY);
  }, []);

  const activateUser = useCallback((userId: string) => {
    setManagedUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: true } : u))
    );
  }, []);

  const deactivateUser = useCallback((userId: string) => {
    setManagedUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u))
    );
  }, []);

  const createInternalAccount = useCallback(
    (name: string, email: string, role: UserRole): ManagedUser => {
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const newUser: ManagedUser = {
        id: `u_internal_${Date.now()}`,
        name,
        email,
        role,
        avatarInitials: initials,
        isActive: true,
        emailVerified: true,
        subscriptionTier: "enterprise",
        caseCount: 0,
        joinedDate: new Date().toISOString().split("T")[0],
        lastActive: new Date().toISOString().split("T")[0],
        institution: "ECG Insight Internal",
      };
      setManagedUsers((prev) => [newUser, ...prev]);
      return newUser;
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        authToken,
        isLoading,
        isAuthenticated: !!user,
        isImpersonating: !!impersonatedUser,
        rememberMe,
        login,
        logout,
        register,
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
