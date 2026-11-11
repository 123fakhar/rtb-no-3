"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { putCache, takeCache } from "@/lib/tabCache";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export function TransactionsView() {
  const [transactions, setTransactions] = useState<any[]>(() => takeCache<any[]>("bids:") ?? []);
  const [loading, setLoading] = useState(() => takeCache("bids:") == null);
  const [statusFilter, setStatusFilter] = useState("");

  const loadTransactions = async () => {
    const key = `bids:${statusFilter}`;
    const cached = takeCache<any[]>(key);
    if (cached) setTransactions(cached);
    else setLoading(true);
    try {
      const q = new URLSearchParams({
        page: "1",
        limit: "50",
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await apiRequest<{ transactions: any[] }>(`/api/transactions?${q.toString()}`);
      setTransactions(res.transactions);
      putCache(key, res.transactions);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [statusFilter]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold font-mono">#</span>
            </div>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
              AUDIT RECEIPTS &amp; LOGS
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Bids
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete real-time log of every buyer ping, HTTP status, reject code, and tracking number assignment.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200/90 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs text-slate-700"
          >
            <option value="">All Transactions</option>
            <option value="RESERVED">Reserved / Won</option>
            <option value="REJECTED">Rejected</option>
            <option value="ERROR">Error</option>
          </select>

          <button
            onClick={loadTransactions}
            className="p-2.5 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="kukie-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-5">Lead Phone</th>
                <th className="py-3.5 px-4">State</th>
                <th className="py-3.5 px-5">Buyer</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-5">Campaign</th>
                <th className="py-3.5 px-4">Outcome</th>
                <th className="py-3.5 px-4">Tracking Number / Reason</th>
                <th className="py-3.5 px-4">Latency</th>
                <th className="py-3.5 px-5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading transaction logs...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No RTB transactions recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">Real-time logs will populate when leads are routed to buyer endpoints.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const isReserved = t.status === "RESERVED";
                  const isRejected = t.status === "REJECTED";
                  return (
                    <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {t.leadPhone}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">{t.leadState}</td>
                      <td className="py-3.5 px-5 font-bold text-slate-900 whitespace-nowrap">
                        {t.buyerName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="capitalize px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                          {t.buyerProvider}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 font-medium whitespace-nowrap">
                        {t.campaignName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isReserved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Reserved</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200/70">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200/70">
                            <AlertCircle className="w-3 h-3" />
                            <span>{t.status}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                        {isReserved && t.trackingNumber ? (
                          <span className="text-blue-600 font-bold">{t.trackingNumber}</span>
                        ) : (
                          <span className="text-rose-600 font-medium">{t.rejectReason || "Rejected"}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 text-[11px]">
                        {t.durationMs ? `${t.durationMs}ms` : "—"}
                      </td>
                      <td className="py-3.5 px-5 text-right text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
