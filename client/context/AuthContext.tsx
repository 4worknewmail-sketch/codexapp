import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  email: string | null;
  credits: number;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "leads-auth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as AuthState;
    }
    return { accessToken: null, refreshToken: null, email: null, credits: 0 };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const refreshProfile = async () => {
    if (!state.accessToken) return;
    try {
      const profile = await api.profile(state.accessToken);
      setState((prev) => ({ ...prev, email: profile.email, credits: profile.credits }));
    } catch (error) {
      console.error(error);
    }
  };

  const signup = async (email: string, password: string) => {
    const result = await api.signup({ email, password });
    setState({
      accessToken: result.access,
      refreshToken: result.refresh,
      email: result.user.email,
      credits: result.user.credits,
    });
    toast.success("Account created");
  };

  const login = async (email: string, password: string) => {
    const result = await api.login({ email, password });
    const profile = await api.profile(result.access);
    setState({
      accessToken: result.access,
      refreshToken: result.refresh,
      email: profile.email,
      credits: profile.credits,
    });
    toast.success("Logged in");
  };

  const logout = () => {
    setState({ accessToken: null, refreshToken: null, email: null, credits: 0 });
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ ...state, login, signup, logout, refreshProfile }),
    [state.accessToken, state.refreshToken, state.email, state.credits]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
