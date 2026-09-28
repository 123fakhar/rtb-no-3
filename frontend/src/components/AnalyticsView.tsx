"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { emptyFilters, formatCount, formatMoney, formatPct, useDashboard, type DashFilters } from "@/lib/dashboardData";
import { RangePills } from "./RangePills";

export function AnalyticsView() {
  const [filters, setFilters] = useState<DashFilters>(emptyFilters);
  const { data, loading, error } = useDashboard(filters, 15000);

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-5 animate-in fade-in duration-200">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">Campaign performance for the traffic you actually routed.</p>
        </div>
        <RangePills filters={filters} onChange={setFilters} />
      </header>

      <FilterBar filters={filters} options={data?.options} onChange={setFilters} />

      {loading && !data ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : error && !data ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.campaigns.length === 0 ? (
            <div className="kukie-card-static p-8 text-sm text-slate-400 md:col-span-2">No campaigns in this filter.</div>
          ) : (
            data.campaigns.map((campaign) => (
              <article key={campaign.id} className="kukie-card p-5">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{campaign.name}</h2>
                <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                  <Metric label="Leads" value={formatCount(campaign.leads)} />
                  <Metric label="Qualified" value={formatCount(campaign.qualified)} />
                  <Metric label="Bids" value={formatCount(campaign.bids)} />
                  <Metric label="Wins" value={formatCount(campaign.wins)} />
                  <Metric label="Revenue" value={formatMoney(campaign.revenue)} accent />
                  <Metric label="Win rate" value={formatPct(campaign.winRate)} />
                </div>
              </article>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function FilterBar({
  filters,
  options,
  onChange,
}: {
  filters: DashFilters;
  options?: { campaigns: { id: string; name: string }[]; buyers: { id: string; name: string }[]; providers: { key: string; name: string }[]; states: string[] };
  onChange: (next: DashFilters) => void;
}) {
  const select = "bg-white border border-slate-200/90 text-xs font-semibold rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600";
  return (
    <div className="flex flex-wrap gap-2">
      <select className={select} value={filters.campaignId} onChange={(e) => onChange({ ...filters, campaignId: e.target.value })}>
        <option value="">All campaigns</option>
        {options?.campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select className={select} value={filters.provider} onChange={(e) => onChange({ ...filters, provider: e.target.value })}>
        <option value="">All providers</option>
        {options?.providers.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
      </select>
      <select className={select} value={filters.buyerId} onChange={(e) => onChange({ ...filters, buyerId: e.target.value })}>
        <option value="">All buyers</option>
        {options?.buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <select className={select} value={filters.state} onChange={(e) => onChange({ ...filters, state: e.target.value })}>
        <option value="">All states</option>
        {options?.states.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
      <span className="text-slate-500 text-xs font-semibold">{label}</span>
      <span className={`font-mono font-bold ${accent ? "text-emerald-600" : "text-slate-900"}`}>{value}</span>
    </div>
  );
}
