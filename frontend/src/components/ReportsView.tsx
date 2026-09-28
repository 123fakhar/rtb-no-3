"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  emptyFilters,
  formatCount,
  formatMoney,
  formatPct,
  formatShortTime,
  useDashboard,
  type DashFilters,
  type DashboardData,
} from "@/lib/dashboardData";
import { RangePills } from "./RangePills";

interface ReportsViewProps {
  onOpenLead: (leadId: string) => void;
}

export function ReportsView({ onOpenLead }: ReportsViewProps) {
  const [filters, setFilters] = useState<DashFilters>(emptyFilters);
  const { data, loading } = useDashboard(filters, 20000);

  const exportCsv = () => {
    if (!data) return;
    const lines = [
      "section,name,leads,requests,bids,wins,win_rate,avg_bid,revenue,status",
      ...data.buyers.map((b) =>
        ["buyer", csv(b.name), "", b.requests, b.bids, b.wins, b.winRate, b.avgBid, b.revenue, ""].join(",")
      ),
      ...data.campaigns.map((c) =>
        ["campaign", csv(c.name), c.leads, "", c.bids, c.wins, c.winRate, "", c.revenue, ""].join(",")
      ),
      ...data.providers.map((p) =>
        ["provider", csv(p.name), p.leads, "", p.bids, p.wins, "", "", p.revenue, p.status].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rtb-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-5 animate-in fade-in duration-200">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Reports</h1>
          <p className="text-xs text-slate-500 mt-1">A snapshot of the same live numbers, ready to export.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RangePills filters={filters} onChange={setFilters} />
          <button onClick={exportCsv} disabled={!data} className="btn-primary px-3.5 py-2 text-xs disabled:opacity-40">
            Export CSV
          </button>
        </div>
      </header>

      {loading && !data ? (
        <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Snap label="Leads" value={formatCount(data.totals.leads)} />
            <Snap label="Win rate" value={formatPct(data.totals.winRate)} />
            <Snap label="Revenue" value={formatMoney(data.totals.revenue)} />
            <Snap label="Reject rate" value={formatPct(data.totals.rejectRate)} />
          </div>
          <RecentLeads leads={data.recentLeads} onOpenLead={onOpenLead} />
        </>
      ) : null}
    </div>
  );
}

function csv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function Snap({ label, value }: { label: string; value: string }) {
  return (
    <div className="kukie-card-static p-4">
      <div className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">{label}</div>
      <div className="mt-1 text-xl font-extrabold font-mono text-slate-900">{value}</div>
    </div>
  );
}

function RecentLeads({
  leads,
  onOpenLead,
}: {
  leads: DashboardData["recentLeads"];
  onOpenLead: (id: string) => void;
}) {
  return (
    <section className="kukie-card-static overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-900">Recent leads</h2>
        <p className="text-xs text-slate-500 mt-0.5">Click a row to open the RTB timeline for that lead.</p>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            <th className="px-5 py-3">Time</th>
            <th className="px-3 py-3">Lead</th>
            <th className="px-3 py-3">Campaign</th>
            <th className="px-3 py-3">Buyer</th>
            <th className="px-3 py-3">Bid</th>
            <th className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="text-xs">
          {leads.length === 0 ? (
            <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-400">No leads in this range.</td></tr>
          ) : (
            leads.map((lead) => (
              <tr key={lead.id} onClick={() => onOpenLead(lead.id)} className="border-t border-slate-100 hover:bg-blue-50/50 cursor-pointer">
                <td className="px-5 py-3 font-mono text-slate-500">{formatShortTime(lead.at)}</td>
                <td className="px-3 py-3 font-bold text-slate-900">{lead.label}</td>
                <td className="px-3 py-3 text-slate-700">{lead.campaign}</td>
                <td className="px-3 py-3 text-slate-600">{lead.buyer || "—"}</td>
                <td className="px-3 py-3 font-mono text-slate-700">{lead.bid != null ? formatMoney(lead.bid) : "—"}</td>
                <td className="px-5 py-3 font-bold">{lead.status === "WON" ? "Won" : lead.status === "REJECTED" ? "Rejected" : "Open"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
