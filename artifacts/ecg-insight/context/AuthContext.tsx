import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type UserRole = "super_admin" | "admin" | "doctor" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialization?: string;
  institution?: string;
  avatarInitials: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    name: string,
    email: string,
    password: string,
    role: "doctor" | "student"
  ) => Promise<boolean>;
  logout: () => void;
}

const MOCK_USERS: (User & { password: string })[] = [
  {
    id: "u1",
    name: "Dr. Sarah Chen",
    email: "doctor@ecginsight.com",
    password: "password",
    role: "doctor",
    specialization: "Cardiology",
    institution: "Metro General Hospital",
    avatarInitials: "SC",
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
  },
  {
    id: "u3",
    name: "Admin User",
    email: "admin@ecginsight.com",
    password: "password",
    role: "admin",
    institution: "ECG Insight HQ",
    avatarInitials: "AU",
  },
];

const AUTH_KEY = "@ecg_insight_auth";

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => false,
  register: async () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY)
      .then((data) => {
        if (data) {
          setUser(JSON.parse(data) as User);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      const found = MOCK_USERS.find(
        (u) =>
          u.email.toLowerCase() === email.toLowerCase() &&
          u.password === password
      );
      if (!found) return false;
      const { password: _pw, ...userData } = found;
      setUser(userData);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(userData));
      return true;
    },
    []
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      _password: string,
      role: "doctor" | "student"
    ): Promise<boolean> => {
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
      };
      setUser(newUser);
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
      return true;
    },
    []
  );

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
