"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, apiRequest, getStoredUser, getToken, setStoredUser, setToken } from "@/lib/api";
import { clearDashboardCache } from "@/lib/dashboardData";
import { clearTabCache } from "@/lib/tabCache";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  updateProfile: (input: { name?: string; email?: string }) => Promise<User>;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
  isCloser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existingToken = getToken();
    const existingUser = getStoredUser();

    if (existingToken && existingUser) {
      setUser(existingUser);
      setTokenState(existingToken);
      // Validate with /me endpoint in background
      apiRequest<{ user: User }>("/api/auth/me")
        .then((res) => {
          setUser(res.user);
          setStoredUser(res.user);
        })
        .catch(() => {
          // Token expired or invalid
          setToken(null);
          setStoredUser(null);
          setUser(null);
          setTokenState(null);
          clearTabCache();
          clearDashboardCache();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    clearTabCache();
    clearDashboardCache();
    const res = await apiRequest<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setToken(res.token);
    setStoredUser(res.user);
    setUser(res.user);
    setTokenState(res.token);
    return res.user;
  };

  const updateProfile = async (input: { name?: string; email?: string }): Promise<User> => {
    const res = await apiRequest<{ token: string; user: User }>("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    setToken(res.token);
    setStoredUser(res.user);
    setUser(res.user);
    setTokenState(res.token);
    return res.user;
  };

  const logout = () => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    setTokenState(null);
    clearTabCache();
    clearDashboardCache();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        updateProfile,
        logout,
        isAdmin: user?.role === "ADMIN",
        isManager: user?.role === "MANAGER",
        isCloser: user?.role === "CLOSER" || user?.role === "AGENT",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
