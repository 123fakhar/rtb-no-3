"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, apiRequest, getStoredUser, getToken, setStoredUser, setToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  switchUserFast: (role: "ADMIN" | "AGENT", email?: string) => Promise<User>;
  logout: () => void;
  isAdmin: boolean;
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
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
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

  const switchUserFast = async (role: "ADMIN" | "AGENT", agentEmail?: string): Promise<User> => {
    const email = role === "ADMIN" ? "admin@rtb.local" : (agentEmail || "agent1@rtb.local");
    const password = role === "ADMIN" ? "admin12345" : "agent12345";
    return login(email, password);
  };

  const logout = () => {
    setToken(null);
    setStoredUser(null);
    setUser(null);
    setTokenState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        switchUserFast,
        logout,
        isAdmin: user?.role === "ADMIN",
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
