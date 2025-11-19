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
  refreshProfile: () => Promise<{ id: number; email: string; credits: number } | null>;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "leads-auth";
const defaultAuthState: AuthState = { accessToken: null, refreshToken: null, email: null, credits: 0 };

const readStoredAuthState = (): AuthState => {
  if (typeof window === "undefined" || !window.localStorage) {
    return defaultAuthState;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AuthState>;
      return {
        accessToken: parsed.accessToken ?? null,
        refreshToken: parsed.refreshToken ?? null,
        email: parsed.email ?? null,
        credits: parsed.credits ?? 0,
      };
    }
  } catch (error) {
    console.error("Failed to parse stored auth state; clearing it", error);
    try {
      window.localStorage?.removeItem(STORAGE_KEY);
    } catch (removeError) {
      console.warn("Unable to clear corrupted auth storage", removeError);
    }
  }
  return defaultAuthState;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => readStoredAuthState());

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("Unable to persist auth state", error);
    }
  }, [state]);

  const refreshAccessToken = async () => {
    if (!state.refreshToken) return false;
    try {
      const next = await api.refreshToken(state.refreshToken);
      setState((prev) => ({ ...prev, accessToken: next.access }));
      return true;
    } catch (error) {
      console.error("Token refresh failed", error);
      logout();
      return false;
    }
  };

  const refreshProfile = async () => {
    if (!state.accessToken) return null;
    try {
      const profile = await api.profile(state.accessToken);
      setState((prev) => ({ ...prev, email: profile.email, credits: profile.credits }));
      return profile;
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        const lowered = error.message.toLowerCase();
        if (lowered.includes("401") || lowered.includes("unauthorized")) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            return refreshProfile();
          }
        }
      }
      return null;
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
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Unable to clear auth state", error);
    }
  };

  const value = useMemo(
    () => ({ ...state, login, signup, logout, refreshProfile, refreshAccessToken }),
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
