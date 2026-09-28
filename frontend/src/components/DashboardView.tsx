"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Ban,
  CircleDollarSign,
  Loader2,
  Percent,
  Radio,
  Send,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  bucketLabel,
  emptyFilters,
  formatClock,
  formatCount,
  formatMoney,
  formatPct,
  useDashboard,
  type DashFilters,
  type DashboardData,
} from "@/lib/dashboardData";
import { RangePills } from "./RangePills";
import { StatusDot, statusLabel } from "./StatusDot";

interface DashboardViewProps {
  onOpenLead: (leadId: string) => void;
  onNavigate: (tab: string) => void;
}

export function DashboardView({ onOpenLead, onNavigate }: DashboardViewProps) {
  const [filters, setFilters] = useState<DashFilters>(emptyFilters);
  const { data, loading, error, updatedAt } = useDashboard(filters);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  if (loading && !data) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
        <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Loading command center</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-16 text-center text-sm text-rose-600">{error || "Dashboard unavailable"}</div>
    );
  }

  const selectedBuyer = buyerId ? data.buyers.find((b) => b.id === buyerId) ?? null : null;
  const selectedReason = reason ? data.rejections.find((r) => r.reason === reason) ?? null : null;

  return (
    <div className="p-6 md:p-8 max-w-[1440px] mx-auto space-y-5 animate-in fade-in duration-200">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                data.health.operational
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                  : "bg-amber-50 text-amber-700 border-amber-200/80"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${data.health.operational ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
              {data.health.operational ? "System operational" : "System degraded"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Live bidding command center. Campaign, provider, and rejection detail live in their own sections.
          </p>
        </div>
        <RangePills filters={filters} onChange={setFilters} />
      </header>

      <KpiRow totals={data.totals} />

      <section className="kukie-card-static p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Revenue / bidding activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Winning-bid revenue and wins across the selected range</p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {updatedAt ? `Updated ${formatClock(updatedAt.toISOString())}` : ""}
          </span>
        </div>
        <RevenueChart data={data} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <FunnelCard funnel={data.funnel} />
        <RejectionCard
          rejections={data.rejections}
          onSelect={setReason}
          onViewAll={() => onNavigate("rejections")}
        />
      </div>

      <BuyerTable
        buyers={data.buyers}
        onSelect={setBuyerId}
        onViewAll={() => onNavigate("buyers")}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <LiveFeed
          activity={data.activity}
          onOpenLead={onOpenLead}
        />
        <HealthCard health={data.health} />
      </div>

      {selectedBuyer && (
        <DetailSheet title={selectedBuyer.name} subtitle={selectedBuyer.provider} onClose={() => setBuyerId(null)}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Requests" value={formatCount(selectedBuyer.requests)} />
            <Stat label="Bids" value={formatCount(selectedBuyer.bids)} />
            <Stat label="Wins" value={formatCount(selectedBuyer.wins)} />
            <Stat label="Win rate" value={formatPct(selectedBuyer.winRate)} />
            <Stat label="Avg bid" value={formatMoney(selectedBuyer.avgBid)} />
            <Stat label="Revenue" value={formatMoney(selectedBuyer.revenue)} />
          </div>
          <h3 className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mt-6 mb-2">Recent events</h3>
          <EventList
            rows={data.activity.filter((a) => a.buyer === selectedBuyer.name)}
            onOpenLead={onOpenLead}
          />
          <button
            onClick={() => {
              setBuyerId(null);
              onNavigate("buyers");
            }}
            className="mt-4 text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
          >
            Open buyers <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </DetailSheet>
      )}

      {selectedReason && (
        <DetailSheet title={selectedReason.reason} subtitle={`${formatCount(selectedReason.count)} rejections · ${formatPct(selectedReason.percent)}`} onClose={() => setReason(null)}>
          {selectedReason.buyers.length === 0 ? (
            <p className="text-xs text-slate-500">No buyer was attached to these rejections.</p>
          ) : (
            <div className="space-y-3">
              {selectedReason.buyers.map((b) => (
                <div key={b.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="text-sm font-bold text-slate-900">{b.name}</div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-400 font-semibold">Rejected</div>
                      <div className="font-mono font-bold text-rose-600">{formatCount(b.rejected)}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 font-semibold">Accepted</div>
                      <div className="font-mono font-bold text-emerald-600">{formatCount(b.accepted)}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-2">
                    Last occurrence {b.lastAt ? formatClock(b.lastAt) : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSheet>
      )}
    </div>
  );
}

function KpiRow({ totals }: { totals: DashboardData["totals"] }) {
  const cards = [
    { label: "Total leads", value: formatCount(totals.leads), icon: Users },
    { label: "Bid requests", value: formatCount(totals.bidRequests), icon: Send },
    { label: "Bids received", value: formatCount(totals.bidsReceived), icon: Radio },
    { label: "Win rate", value: formatPct(totals.winRate), icon: Percent },
    { label: "Qualified leads", value: formatCount(totals.qualifiedLeads), icon: Target },
    { label: "Revenue", value: formatMoney(totals.revenue), icon: CircleDollarSign },
    { label: "Avg. bid", value: formatMoney(totals.avgBid), icon: Activity },
    { label: "Reject rate", value: formatPct(totals.rejectRate), icon: Ban },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="kukie-card p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-xs text-slate-500">{card.label}</div>
              <div className="text-xl font-bold tracking-tight text-slate-900">{card.value}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RevenueChart({ data }: { data: DashboardData }) {
  const spanDays = Math.max(1, (new Date(data.range.to).getTime() - new Date(data.range.from).getTime()) / 86400000);
  const rows = useMemo(
    () =>
      data.timeseries.map((point) => ({
        ...point,
        label: bucketLabel(point.t, data.range.hourly, spanDays),
      })),
    [data, spanDays]
  );
  const hasRevenue = rows.some((r) => r.revenue > 0 || r.wins > 0 || r.leads > 0);

  if (!hasRevenue) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-slate-400">
        No bidding activity in this range yet.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9aa6e8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#9aa6e8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="rev"
            domain={[0, (dataMax: number) => (dataMax <= 0 ? 1 : dataMax)]}
            tick={{ fontSize: 11, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
            width={48}
          />
          <YAxis yAxisId="wins" orientation="right" hide />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1c2434",
              border: "none",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "12px",
            }}
            formatter={(value: number, name: string) =>
              name === "revenue" ? [formatMoney(value), "Revenue"] : [formatCount(value), name === "wins" ? "Wins" : "Leads"]
            }
          />
          <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#8ea0e8" strokeWidth={2.5} fill="url(#revFill)" />
          <Line yAxisId="wins" type="monotone" dataKey="wins" stroke="#e7a56a" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelCard({ funnel }: { funnel: DashboardData["funnel"] }) {
  const steps = [
    { label: "Leads", value: funnel.leads },
    { label: "Bid requests", value: funnel.bidRequests },
    { label: "Buyer responses", value: funnel.buyerResponses },
    { label: "Valid bids", value: funnel.validBids },
    { label: "Winning bids", value: funnel.winningBids },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);

  return (
    <section className="kukie-card-static p-5 md:p-6">
      <h2 className="text-base font-bold text-slate-900 tracking-tight">Bidding funnel</h2>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">Where traffic drops between intake and a winning bid</p>
      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div key={step.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-600">{step.label}</span>
              <span className="font-mono font-bold text-slate-900">{formatCount(step.value)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#8ea0e8] transition-all duration-700"
                style={{ width: `${Math.max(4, (step.value / max) * 100)}%`, opacity: 1 - i * 0.12 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue</span>
        <span className="text-xl font-extrabold font-mono text-emerald-600">{formatMoney(funnel.revenue)}</span>
      </div>
    </section>
  );
}

function RejectionCard({
  rejections,
  onSelect,
  onViewAll,
}: {
  rejections: DashboardData["rejections"];
  onSelect: (reason: string) => void;
  onViewAll: () => void;
}) {
  return (
    <section className="kukie-card-static p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Rejection reasons</h2>
          <p className="text-xs text-slate-500 mt-0.5">Click a reason to see the buyers it hit</p>
        </div>
        <button onClick={onViewAll} className="text-[11px] font-bold text-blue-600 hover:text-blue-700">
          View all
        </button>
      </div>
      {rejections.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-slate-400">No rejections in this range.</div>
      ) : (
        <div className="space-y-3">
          {rejections.slice(0, 7).map((row) => (
            <button key={row.reason} onClick={() => onSelect(row.reason)} className="w-full text-left group">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700 group-hover:text-blue-600">{row.reason}</span>
                <span className="font-mono font-bold text-slate-500">{formatPct(row.percent)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-rose-400 transition-all duration-700" style={{ width: `${Math.max(row.percent, 3)}%` }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function BuyerTable({
  buyers,
  onSelect,
  onViewAll,
}: {
  buyers: DashboardData["buyers"];
  onSelect: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <section className="kukie-card-static overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Buyer performance</h2>
          <p className="text-xs text-slate-500 mt-0.5">Click a buyer for the stats behind the row</p>
        </div>
        <button onClick={onViewAll} className="text-[11px] font-bold text-blue-600 hover:text-blue-700">
          Manage buyers
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="px-5 py-3">Buyer</th>
              <th className="px-3 py-3">Requests</th>
              <th className="px-3 py-3">Bids</th>
              <th className="px-3 py-3">Wins</th>
              <th className="px-3 py-3">Win rate</th>
              <th className="px-3 py-3">Avg bid</th>
              <th className="px-5 py-3 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {buyers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                  No buyers configured.
                </td>
              </tr>
            ) : (
              buyers.slice(0, 8).map((buyer) => (
                <tr
                  key={buyer.id}
                  onClick={() => onSelect(buyer.id)}
                  className="border-t border-slate-100 hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-bold text-slate-900">{buyer.name}</td>
                  <td className="px-3 py-3 font-mono text-slate-600">{formatCount(buyer.requests)}</td>
                  <td className="px-3 py-3 font-mono text-slate-600">{formatCount(buyer.bids)}</td>
                  <td className="px-3 py-3 font-mono text-slate-600">{formatCount(buyer.wins)}</td>
                  <td className="px-3 py-3 font-mono text-slate-700">{formatPct(buyer.winRate)}</td>
                  <td className="px-3 py-3 font-mono text-slate-700">{formatMoney(buyer.avgBid)}</td>
                  <td className="px-5 py-3 font-mono font-bold text-emerald-600 text-right">{formatMoney(buyer.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LiveFeed({
  activity,
  onOpenLead,
}: {
  activity: DashboardData["activity"];
  onOpenLead: (id: string) => void;
}) {
  return (
    <section className="kukie-card-static p-5 md:p-6 xl:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Live RTB activity</h2>
        </div>
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Auto-updating</span>
      </div>
      {activity.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">
          No pings in this range. Activity appears here when a lead is routed to a buyer.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {activity.slice(0, 8).map((row) => (
            <button
              key={row.id}
              onClick={() => onOpenLead(row.leadId)}
              className="w-full text-left py-3 flex items-start gap-4 hover:bg-slate-50/80 rounded-xl px-2 -mx-2 transition-colors"
            >
              <span className="font-mono text-[11px] text-slate-400 w-[72px] shrink-0 pt-0.5">{formatClock(row.at)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900">
                  {row.leadLabel} <span className="font-semibold text-slate-400">→</span> {row.campaign}
                </span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Buyer: {row.buyer}
                  {row.bid != null ? ` · Bid ${formatMoney(row.bid)}` : ""}
                  {row.reason ? ` · ${row.reason}` : ""}
                </span>
              </span>
              <Outcome status={row.status} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function HealthCard({ health }: { health: DashboardData["health"] }) {
  const rows: { name: string; status: "healthy" | "degraded" | "idle" }[] = [
    { name: "API", status: health.api },
    { name: "Database", status: health.database },
    { name: "RTB engine", status: health.rtbEngine },
    ...health.providers.map((p) => ({ name: p.name, status: p.status })),
  ];

  return (
    <section className="kukie-card-static p-5 md:p-6">
      <h2 className="text-base font-bold text-slate-900 tracking-tight">System health</h2>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">Live checks, not a status page mock</p>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">{row.name}</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-500">
              <StatusDot status={row.status} />
              {statusLabel(row.status)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Response</div>
          <div className="font-mono font-bold text-slate-900 text-sm mt-1">{health.avgResponseMs} ms</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Req / min</div>
          <div className="font-mono font-bold text-slate-900 text-sm mt-1">{formatCount(health.requestsPerMin)}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Errors / min</div>
          <div className="font-mono font-bold text-slate-900 text-sm mt-1">{formatCount(health.errorsPerMin)}</div>
        </div>
      </div>
    </section>
  );
}

function Outcome({ status }: { status: "WON" | "REJECTED" | "ERROR" | "OPEN" }) {
  const won = status === "WON";
  const open = status === "OPEN";
  return (
    <span
      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
        won
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
          : open
          ? "bg-blue-50 text-blue-700 border border-blue-200/70"
          : "bg-rose-50 text-rose-700 border border-rose-200/70"
      }`}
    >
      {status === "WON" ? "Won" : status === "OPEN" ? "Open" : status === "ERROR" ? "Error" : "Rejected"}
    </span>
  );
}

function EventList({
  rows,
  onOpenLead,
}: {
  rows: DashboardData["activity"];
  onOpenLead: (id: string) => void;
}) {
  if (rows.length === 0) return <p className="text-xs text-slate-400">No events for this buyer in the selected range.</p>;
  return (
    <div className="space-y-2">
      {rows.slice(0, 8).map((row) => (
        <button key={row.id} onClick={() => onOpenLead(row.leadId)} className="w-full text-left rounded-xl border border-slate-100 px-3 py-2 hover:border-blue-200">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800">{row.campaign}</span>
            <Outcome status={row.status} />
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {formatClock(row.at)}
            {row.bid != null ? ` · ${formatMoney(row.bid)}` : ""}
            {row.reason ? ` · ${row.reason}` : ""}
          </div>
        </button>
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="font-mono font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function DetailSheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-md bg-white shadow-popover border-l border-slate-100 p-6 overflow-y-auto animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
