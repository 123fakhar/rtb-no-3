"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { emptyFilters, formatCount, formatMoney, useDashboard, type DashFilters } from "@/lib/dashboardData";
import { RangePills } from "./RangePills";
import { StatusDot, statusLabel } from "./StatusDot";
import { RtbApisView } from "./RtbApisView";

export function ProvidersView() {
  const [tab, setTab] = useState<"performance" | "endpoints">("performance");
  const [filters, setFilters] = useState<DashFilters>(emptyFilters);
  const { data, loading } = useDashboard(filters, 15000);

  if (tab === "endpoints") {
    return (
      <div>
        <div className="px-6 md:px-10 pt-6">
          <button onClick={() => setTab("performance")} className="text-xs font-bold text-blue-600 hover:text-blue-700">
            ← Provider performance
          </button>
        </div>
        <RtbApisView />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-5 animate-in fade-in duration-200">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Providers</h1>
          <p className="text-xs text-slate-500 mt-1">Traffic sources such as Ringba, RingFuel, Retreaver, and TrackDrive — only the ones you have configured.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangePills filters={filters} onChange={setFilters} />
          <button onClick={() => setTab("endpoints")} className="btn-primary px-3.5 py-2 text-xs">
            Endpoints
          </button>
        </div>
      </header>

      <section className="kukie-card-static overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="px-5 py-3">Provider</th>
              <th className="px-3 py-3">Leads</th>
              <th className="px-3 py-3">Bids</th>
              <th className="px-3 py-3">Wins</th>
              <th className="px-3 py-3">Revenue</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {loading && !data ? (
              <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" /></td></tr>
            ) : !data || data.providers.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No providers configured.</td></tr>
            ) : (
              data.providers.map((provider) => (
                <tr key={provider.key} className="border-t border-slate-100">
                  <td className="px-5 py-3.5 font-bold text-slate-900">{provider.name}</td>
                  <td className="px-3 py-3.5 font-mono text-slate-600">{formatCount(provider.leads)}</td>
                  <td className="px-3 py-3.5 font-mono text-slate-600">{formatCount(provider.bids)}</td>
                  <td className="px-3 py-3.5 font-mono text-slate-600">{formatCount(provider.wins)}</td>
                  <td className="px-3 py-3.5 font-mono font-bold text-emerald-600">{formatMoney(provider.revenue)}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
                      <StatusDot status={provider.status} />
                      {statusLabel(provider.status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
