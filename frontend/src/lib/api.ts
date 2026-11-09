const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "CLOSER" | "AGENT";
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message);
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rtb_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("rtb_token", token);
  else localStorage.removeItem("rtb_token");
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const str = localStorage.getItem("rtb_user");
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  if (typeof window === "undefined") return;
  if (user) localStorage.setItem("rtb_user", JSON.stringify(user));
  else localStorage.removeItem("rtb_user");
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return null as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, data.error || res.statusText || "Request failed", data.details);
  }

  return data as T;
}
