"use client";

import React, { useEffect, useState } from "react";
import { apiRequest, downloadBase64 } from "@/lib/api";
import { putCache, takeCache } from "@/lib/tabCache";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface SalesRow {
  name: string;
  email?: string;
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

interface SalesSummary {
  leads: number;
  sold: number;
  conversion: number;
  pending: number;
  approved: number;
  rejected: number;
}

type Range = "all" | "day" | "week" | "month";

const rangeLabel: Record<Range, string> = {
  all: "All",
  day: "Today",
  week: "This week",
  month: "This month",
};

export function SalesStatsView() {
  const { isAdmin, isManager } = useAuth();
  const canDownload = isAdmin || isManager;
  const [range, setRange] = useState<Range>("all");
  const [agents, setAgents] = useState<SalesRow[]>(() => takeCache<SalesRow[]>("sales-agents:all") ?? []);
  const [closers, setClosers] = useState<SalesRow[]>(() => takeCache<SalesRow[]>("sales-closers:all") ?? []);
  const [loading, setLoading] = useState(
    () => takeCache("sales-agents:all") == null && takeCache("sales-closers:all") == null
  );
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const cachedAgents = takeCache<SalesRow[]>(`sales-agents:${range}`);
    const cachedClosers = takeCache<SalesRow[]>(`sales-closers:${range}`);
    if (cachedAgents || cachedClosers) {
      if (cachedAgents) setAgents(cachedAgents);
      if (cachedClosers) setClosers(cachedClosers);
      setLoading(false);
    } else setLoading(true);
    apiRequest<{ agents: SalesRow[]; closers: SalesRow[]; summary?: SalesSummary }>(
      `/api/crm/sales-stats?range=${range}&tzOffset=${new Date().getTimezoneOffset()}`
    )
      .then((res) => {
        setAgents(res.agents);
        setClosers(res.closers);
        setSummary(res.summary ?? null);
        putCache(`sales-agents:${range}`, res.agents);
        putCache(`sales-closers:${range}`, res.closers);
        setError(null);
      })
      .catch((err) => setError(err.message || "Could not load sales"))
      .finally(() => setLoading(false));
  }, [range]);

  const download = async (kind: "sales" | "no-pickup") => {
    setDownloading(kind);
    try {
      const path = kind === "sales" ? "/api/crm/export" : "/api/crm/no-pickup/export";
      const res = await apiRequest<{ filename: string; base64: string; mime: string }>(
        `${path}?range=${range}&tzOffset=${new Date().getTimezoneOffset()}`
      );
      downloadBase64(res.filename, res.base64, res.mime);
    } catch (err: any) {
      alert(err.message || "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  if (loading && agents.length === 0 && closers.length === 0) {
    return (
      <div className="p-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Sales</h1>
          <p className="text-xs text-slate-500 mt-1">
            Counts use Pakistan time. A day starts at 6:00 PM and runs until 6:00 PM the next day.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(rangeLabel) as Range[]).map((item) => (
            <button
              key={item}
              onClick={() => setRange(item)}
              className={`px-3 py-2 rounded-xl text-xs font-bold ${range === item ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
            >
              {rangeLabel[item]}
            </button>
          ))}
          {canDownload && (
            <>
              <button onClick={() => download("sales")} disabled={downloading !== null} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-xs font-bold disabled:opacity-50">
                {downloading === "sales" ? "Downloading..." : "Download sales"}
              </button>
              <button onClick={() => download("no-pickup")} disabled={downloading !== null} className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold disabled:opacity-50">
                {downloading === "no-pickup" ? "Downloading..." : "Download no pickups"}
              </button>
            </>
          )}
        </div>
      </div>
      {error && <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs">{error}</div>}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: "Leads", value: String(summary.leads) },
            { label: "Sold", value: String(summary.sold) },
            { label: "Conversion", value: `${summary.conversion}%` },
            { label: "CRM pending", value: String(summary.pending) },
            { label: "CRM approved", value: String(summary.approved) },
            { label: "CRM rejected", value: String(summary.rejected) },
          ].map((card) => (
            <div key={card.label} className="kukie-card-static p-4">
              <div className="text-xs text-slate-500">{card.label}</div>
              <div className="mt-1 text-xl font-bold text-slate-900 font-mono">{card.value}</div>
            </div>
          ))}
        </div>
      )}
      <StatsTable title="Agents" hint="The agent name typed on the CRM form." rows={agents} />
      <StatsTable title="Closers" hint="The name the closer typed on the CRM form." rows={closers} showEmail />
    </div>
  );
}

function StatsTable({
  title,
  hint,
  rows,
  showEmail,
}: {
  title: string;
  hint: string;
  rows: SalesRow[];
  showEmail?: boolean;
}) {
  return (
    <section className="kukie-card-static overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3">Name</th>
              {showEmail && <th className="px-4 py-3">Username</th>}
              <th className="px-4 py-3 text-right">Pending</th>
              <th className="px-4 py-3 text-right">Accepted</th>
              <th className="px-4 py-3 text-right">Rejected</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showEmail ? 6 : 5} className="px-5 py-8 text-slate-400">
                  No sales yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.name}-${row.email || ""}`}>
                  <td className="px-5 py-3 font-semibold text-slate-900">{row.name}</td>
                  {showEmail && <td className="px-4 py-3 font-mono text-slate-500">{row.email}</td>}
                  <td className="px-4 py-3 text-right font-mono text-amber-700">{row.pending}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700">{row.approved}</td>
                  <td className="px-4 py-3 text-right font-mono text-rose-700">{row.rejected}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">{row.total}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
