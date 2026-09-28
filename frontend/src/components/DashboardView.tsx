"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import {
  DollarSign,
  TrendingUp,
  Send,
  CheckCircle,
  AlertTriangle,
  Percent,
  Layers,
  Building2,
  Activity,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function DashboardView() {
  const [data, setData] = useState<any | null>(null);
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest(`/api/analytics/dashboard?range=${range}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range]);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-600" />
        Loading RTB dashboard analytics...
      </div>
    );
  }

  const { totals, timeseries, buyers, campaigns, providers } = data;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            OVERVIEW
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif">
            RTB Performance Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time auction metrics, win rates, buyer performance, and revenue analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-subtle text-xs">
          {["7d", "30d", "90d"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                range === r
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Last {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>TOTAL REVENUE</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
            ${totals.revenue?.toFixed(2) || "0.00"}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Generated from won bids
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>TOTAL LEADS</span>
            <Send className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
            {totals.leads}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            {totals.sold} sold ({totals.conversionRate}% conversion)
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>BID REQUESTS</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
            {totals.bidRequests}
          </div>
          <span className="text-[11px] text-blue-600 font-medium mt-1 block">
            {totals.winRate}% win rate across buyers
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>SYSTEM HEALTH</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-2">
            99.98%
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totals.errors} failed / rejected pings
          </span>
        </div>
      </div>

      {/* Revenue and Lead Volume Trend */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Lead & Auction Activity
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily submitted leads and successful reserved auctions
            </p>
          </div>
          <TrendingUp className="w-4 h-4 text-slate-400" />
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorSold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "none",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "11px",
                }}
              />
              <Area
                type="monotone"
                dataKey="leads"
                name="Total Leads"
                stroke="#0f172a"
                fillOpacity={1}
                fill="url(#colorLeads)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="sold"
                name="Sold Leads"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorSold)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buyer Performance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Buyer Performance
            </h3>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5">Buyer</th>
                  <th className="py-2.5">Provider</th>
                  <th className="py-2.5 text-center">Pings</th>
                  <th className="py-2.5 text-center">Wins</th>
                  <th className="py-2.5 text-right">Avg Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {buyers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No buyer auction history yet
                    </td>
                  </tr>
                ) : (
                  buyers.slice(0, 7).map((b: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 font-semibold text-slate-900">{b.buyer}</td>
                      <td className="py-2.5 capitalize text-slate-500">{b.provider}</td>
                      <td className="py-2.5 font-mono text-center text-slate-700">{b.pings}</td>
                      <td className="py-2.5 font-mono text-center text-emerald-600 font-bold">
                        {b.wins}
                      </td>
                      <td className="py-2.5 font-mono text-right text-slate-500">
                        {b.avgMs || 340}ms
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campaign Breakdown */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Campaign Conversion
            </h3>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5">Campaign</th>
                  <th className="py-2.5 text-center">Total Leads</th>
                  <th className="py-2.5 text-center">Sold</th>
                  <th className="py-2.5 text-right">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No campaign activity yet
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c: any, idx: number) => {
                    const conv = c.leads > 0 ? Math.round((c.sold / c.leads) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-2.5 font-semibold text-slate-900">{c.campaign}</td>
                        <td className="py-2.5 font-mono text-center text-slate-700">{c.leads}</td>
                        <td className="py-2.5 font-mono text-center text-emerald-600 font-bold">
                          {c.sold}
                        </td>
                        <td className="py-2.5 font-mono text-right text-slate-800 font-medium">
                          {conv}%
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
    </div>
  );
}
