"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export function TransactionsView() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: "1",
        limit: "50",
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await apiRequest<{ transactions: any[] }>(`/api/transactions?${q.toString()}`);
      setTransactions(res.transactions);
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
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            AUDIT TRAIL
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif">
            RTB Transactions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete real-time log of every buyer ping, acceptance, reject code, and tracking number assignment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-subtle text-slate-700"
          >
            <option value="">All Transactions</option>
            <option value="RESERVED">Reserved / Won</option>
            <option value="REJECTED">Rejected</option>
            <option value="ERROR">Error</option>
          </select>

          <button
            onClick={loadTransactions}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-subtle transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
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
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                    Loading transaction logs...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const isReserved = t.status === "RESERVED";
                  const isRejected = t.status === "REJECTED";
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-5 font-mono font-medium text-slate-900 whitespace-nowrap">
                        {t.leadPhone}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{t.leadState}</td>
                      <td className="py-3 px-5 font-medium text-slate-900 whitespace-nowrap">
                        {t.buyerName}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-500 font-mono text-[11px]">
                        {t.buyerProvider}
                      </td>
                      <td className="py-3 px-5 text-slate-700 whitespace-nowrap">
                        {t.campaignName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isReserved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Reserved</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertCircle className="w-3 h-3" />
                            <span>{t.status}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-xs">
                        {isReserved && t.trackingNumber ? (
                          <span className="text-blue-600 font-bold">{t.trackingNumber}</span>
                        ) : (
                          <span className="text-rose-600">{t.rejectReason || "Rejected"}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {t.durationMs ? `${t.durationMs}ms` : "—"}
                      </td>
                      <td className="py-3 px-5 text-right text-slate-400 text-[11px] whitespace-nowrap">
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
