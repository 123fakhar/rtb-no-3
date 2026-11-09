"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
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

export function SalesStatsView() {
  const { isAdmin } = useAuth();
  const [agents, setAgents] = useState<SalesRow[]>([]);
  const [closers, setClosers] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ agents: SalesRow[]; closers: SalesRow[] }>("/api/crm/sales-stats")
      .then((res) => {
        setAgents(res.agents);
        setClosers(res.closers);
      })
      .catch((err) => setError(err.message || "Could not load sales"))
      .finally(() => setLoading(false));
  }, []);

  const download = async (range: "day" | "week" | "month") => {
    setDownloading(range);
    try {
      const res = await apiRequest<{ filename: string; csv: string }> (
        `/api/crm/export?range=${range}&tzOffset=${new Date().getTimezoneOffset()}`
      );
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = res.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
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
            Agent names from the CRM form are counted separately from the closer who submitted the sale.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            {(["day", "week", "month"] as const).map((range) => (
              <button
                key={range}
                onClick={() => download(range)}
                disabled={downloading !== null}
                className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50"
              >
                {downloading === range ? "Downloading..." : range === "day" ? "Today" : range === "week" ? "This week" : "This month"}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs">{error}</div>}
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
