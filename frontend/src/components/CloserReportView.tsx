"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { putCache, takeCache } from "@/lib/tabCache";
import { Loader2 } from "lucide-react";

type Range = "day" | "week" | "month";

interface Report {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  entries: {
    id: string;
    createdAt: string;
    status: string;
    customerName: string;
    phone: string;
    buyer: string;
    campaign: string;
    agentName: string;
  }[];
}

const labels: Record<Range, string> = { day: "Today", week: "This week", month: "This month" };

export function CloserReportView() {
  const [range, setRange] = useState<Range>("day");
  const [report, setReport] = useState<Report | null>(() => takeCache<Report>("my-sales:day") ?? null);
  const [loading, setLoading] = useState(() => takeCache("my-sales:day") == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = takeCache<Report>(`my-sales:${range}`);
    if (cached) {
      setReport(cached);
      setLoading(false);
    } else setLoading(true);
    apiRequest<Report>(`/api/crm/my-sales?range=${range}&tzOffset=${new Date().getTimezoneOffset()}`)
      .then((res) => {
        setReport(res);
        putCache(`my-sales:${range}`, res);
        setError(null);
      })
      .catch((err) => setError(err.message || "Could not load your report"))
      .finally(() => setLoading(false));
  }, [range]);

  const cards = [
    { label: "Pending", value: report?.pending ?? 0 },
    { label: "Accepted", value: report?.approved ?? 0 },
    { label: "Rejected", value: report?.rejected ?? 0 },
    { label: "Total", value: report?.total ?? 0 },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">My Sales</h1>
          <p className="text-xs text-slate-500 mt-1">Your CRM sales for the selected period. This updates as new sales are submitted and reviewed.</p>
        </div>
        <div className="flex gap-2">
          {(Object.keys(labels) as Range[]).map((item) => (
            <button
              key={item}
              onClick={() => setRange(item)}
              className={`px-3 py-2 rounded-xl text-xs font-bold ${range === item ? "bg-slate-900 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
            >
              {labels[item]}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs">{error}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="kukie-card-static p-4">
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="mt-1 text-xl font-bold text-slate-900 font-mono">{loading ? "…" : card.value}</div>
          </div>
        ))}
      </div>
      <div className="kukie-card-static overflow-hidden">
        {loading && !report ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!report || report.entries.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-slate-400">No sales in this period.</td></tr>
                ) : report.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 font-mono">{new Date(entry.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{entry.customerName}</td>
                    <td className="px-4 py-3 font-mono">{entry.phone}</td>
                    <td className="px-4 py-3">{entry.agentName}</td>
                    <td className="px-4 py-3">{entry.buyer}</td>
                    <td className="px-4 py-3">{entry.campaign}</td>
                    <td className="px-4 py-3">{entry.status === "APPROVED" ? "Accepted" : entry.status === "REJECTED" ? "Rejected" : "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
