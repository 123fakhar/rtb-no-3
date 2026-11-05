"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

export type RangePreset = "today" | "7d" | "30d" | "custom";

export interface DashFilters {
  preset: RangePreset;
  from: string;
  to: string;
  campaignId: string;
  buyerId: string;
  provider: string;
  state: string;
}

export interface DashboardData {
  range: { from: string; to: string; hourly: boolean };
  health: {
    operational: boolean;
    api: "healthy" | "degraded";
    database: "healthy" | "degraded";
    rtbEngine: "healthy" | "degraded";
    providers: { name: string; status: "healthy" | "degraded" | "idle" }[];
    avgResponseMs: number;
    requestsPerMin: number;
    errorsPerMin: number;
  };
  totals: {
    leads: number;
    bidRequests: number;
    bidsReceived: number;
    winRate: number;
    qualifiedLeads: number;
    revenue: number;
    avgBid: number;
    rejectRate: number;
  };
  timeseries: { t: string; revenue: number; leads: number; wins: number }[];
  funnel: {
    leads: number;
    bidRequests: number;
    buyerResponses: number;
    validBids: number;
    winningBids: number;
    revenue: number;
  };
  buyers: {
    id: string;
    name: string;
    provider: string;
    requests: number;
    bids: number;
    wins: number;
    winRate: number;
    avgBid: number;
    revenue: number;
  }[];
  campaigns: {
    id: string;
    name: string;
    leads: number;
    qualified: number;
    bids: number;
    wins: number;
    revenue: number;
    winRate: number;
  }[];
  providers: {
    key: string;
    name: string;
    leads: number;
    bids: number;
    wins: number;
    revenue: number;
    status: "healthy" | "degraded" | "idle";
  }[];
  rejections: {
    reason: string;
    count: number;
    percent: number;
    buyers: { id: string; name: string; rejected: number; accepted: number; lastAt: string | null }[];
  }[];
  activity: {
    id: string;
    at: string;
    leadId: string;
    leadLabel: string;
    phone: string;
    campaign: string;
    buyer: string;
    bid: number | null;
    status: "WON" | "REJECTED" | "ERROR" | "BID";
    reason: string | null;
  }[];
  recentLeads: {
    id: string;
    at: string;
    label: string;
    phone: string;
    state: string;
    campaign: string;
    buyer: string | null;
    bid: number | null;
    status: "WON" | "REJECTED" | "OPEN";
  }[];
  options: {
    campaigns: { id: string; name: string }[];
    buyers: { id: string; name: string }[];
    providers: { key: string; name: string }[];
    states: string[];
  };
}

export const emptyFilters = (): DashFilters => {
  const today = new Date();
  const iso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return {
    preset: "today",
    from: iso(start),
    to: iso(today),
    campaignId: "",
    buyerId: "",
    provider: "",
    state: "",
  };
};

function bounds(filters: DashFilters) {
  const now = new Date();
  if (filters.preset === "custom") {
    const from = new Date(`${filters.from}T00:00:00`);
    const to = new Date(`${filters.to}T23:59:59`);
    return {
      from: Number.isNaN(from.getTime()) ? new Date(now.getTime() - 86400000) : from,
      to: Number.isNaN(to.getTime()) ? now : to,
    };
  }
  const from = new Date(now);
  if (filters.preset === "today") from.setHours(0, 0, 0, 0);
  else if (filters.preset === "7d") {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to: now };
}

export function dashboardQuery(filters: DashFilters) {
  const { from, to } = bounds(filters);
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
    tzOffset: String(new Date().getTimezoneOffset()),
  });
  if (filters.campaignId) params.set("campaignId", filters.campaignId);
  if (filters.buyerId) params.set("buyerId", filters.buyerId);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.state) params.set("state", filters.state);
  return params.toString();
}

export function formatCount(n: number) {
  return (n || 0).toLocaleString("en-US");
}

export function formatMoney(n: number, digits = 2) {
  return (n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(n: number) {
  return `${(n || 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatShortTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function bucketLabel(key: string, hourly: boolean, spanDays: number) {
  if (hourly) {
    const hour = Number(key.slice(11, 13));
    const hr = hour % 12 || 12;
    return `${hr}${hour >= 12 ? "p" : "a"}`;
  }
  const d = new Date(`${key}T12:00:00`);
  if (spanDays <= 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useDashboard(filters: DashFilters, pollMs = 8000) {
  const query = useMemo(() => dashboardQuery(filters), [filters]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) setLoading(true);
      try {
        const res = await apiRequest<DashboardData>(`/api/analytics/dashboard?${query}`);
        setData(res);
        setError(null);
        setUpdatedAt(new Date());
      } catch (err: any) {
        if (!silent) setError(err?.message || "Could not load dashboard");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [query]
  );

  useEffect(() => {
    load(false);
    const timer = window.setInterval(() => load(true), pollMs);
    return () => window.clearInterval(timer);
  }, [load, pollMs]);

  return { data, loading, error, updatedAt, refresh: () => load(false) };
}
