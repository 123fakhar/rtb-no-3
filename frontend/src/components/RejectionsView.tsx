"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { emptyFilters, formatClock, formatCount, formatPct, useDashboard, type DashFilters } from "@/lib/dashboardData";
import { RangePills } from "./RangePills";

export function RejectionsView() {
  const [filters, setFilters] = useState<DashFilters>(emptyFilters);
  const { data, loading } = useDashboard(filters, 12000);
  const [reason, setReason] = useState<string | null>(null);
  const selected = data?.rejections.find((r) => r.reason === reason) ?? data?.rejections[0] ?? null;

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-5 animate-in fade-in duration-200">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Rejections</h1>
          <p className="text-xs text-slate-500 mt-1">Why buyers declined traffic, and which buyers those reasons belong to.</p>
        </div>
        <RangePills filters={filters} onChange={setFilters} />
      </header>

      {loading && !data ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <section className="kukie-card-static p-5 lg:col-span-2">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Reasons</h2>
            {!data || data.rejections.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No rejections in this range.</p>
            ) : (
              <div className="space-y-3">
                {data.rejections.map((row) => {
                  const active = selected?.reason === row.reason;
                  return (
                    <button
                      key={row.reason}
                      onClick={() => setReason(row.reason)}
                      className={`w-full text-left rounded-2xl border px-3 py-2.5 transition-colors ${
                        active ? "border-blue-300 bg-blue-50/60" : "border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-800">{row.reason}</span>
                        <span className="font-mono font-bold text-slate-500">{formatPct(row.percent)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${Math.max(row.percent, 3)}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="kukie-card-static p-5 lg:col-span-3">
            {!selected ? (
              <p className="text-sm text-slate-400 py-12 text-center">Select a reason to see the buyers it affected.</p>
            ) : (
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">{selected.reason}</h2>
                <p className="text-xs text-slate-500 mt-1">{formatCount(selected.count)} rejections · {formatPct(selected.percent)} of all declines</p>
                <div className="mt-4 space-y-3">
                  {selected.buyers.length === 0 ? (
                    <p className="text-sm text-slate-400">No buyer was stored on these events.</p>
                  ) : (
                    selected.buyers.map((buyer) => (
                      <div key={buyer.id} className="rounded-2xl border border-slate-100 p-4">
                        <div className="text-sm font-bold text-slate-900">Buyer: {buyer.name}</div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Rejected</div>
                            <div className="font-mono font-bold text-rose-600 text-lg">{formatCount(buyer.rejected)}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Accepted</div>
                            <div className="font-mono font-bold text-emerald-600 text-lg">{formatCount(buyer.accepted)}</div>
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-2">
                          Last occurrence: {buyer.lastAt ? formatClock(buyer.lastAt) : "—"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
