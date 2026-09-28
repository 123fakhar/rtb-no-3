"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Award,
  Users,
} from "lucide-react";

export function CrmAnalyticsView() {
  const [data, setData] = useState<{
    totals: any;
    agentPerformance: any[];
    dailyTrend: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{
      totals: any;
      agentPerformance: any[];
      dailyTrend: any[];
    }>("/api/crm/analytics")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="p-12 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-600" />
        Loading CRM analytics...
      </div>
    );
  }

  const { totals, agentPerformance, dailyTrend } = data;

  // Chart data for agent comparison
  const agentChartData = agentPerformance.slice(0, 10).map((a) => ({
    name: a.name.replace("Agent ", "Ag "),
    fullName: a.name,
    approved: a.approved,
    pending: a.pending,
    rejected: a.rejected,
    total: a.total,
  }));

  const pieData = [
    { name: "Approved", value: totals.approved || 0, color: "#10b981" },
    { name: "Pending", value: totals.pending || 0, color: "#f59e0b" },
    { name: "Rejected", value: totals.rejected || 0, color: "#ef4444" },
  ].filter((p) => p.value > 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-150">
      <div>
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          PERFORMANCE INTELLIGENCE
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif">
          CRM & Agent Analytics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Detailed metrics and interactive visualization on agent lead submissions, approvals, and
          fronter productivity.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>TOTAL SUBMISSIONS</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-2">
            {totals.total}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across all {agentPerformance.length} agents
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
            <span>APPROVED LEADS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-2">
            {totals.approved}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            {totals.approvalRate}% overall approval rate
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold">
            <span>PENDING REVIEW</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-500 font-mono mt-2">
            {totals.pending}
          </div>
          <span className="text-[11px] text-amber-600 font-medium mt-1 block">
            Awaiting administrator approval
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold">
            <span>REJECTED SUBMISSIONS</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-500 font-mono mt-2">
            {totals.rejected}
          </div>
          <span className="text-[11px] text-rose-500 font-medium mt-1 block">
            Declined during quality review
          </span>
        </div>
      </div>

      {/* Interactive Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Bar Chart for Agent Performance */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Agent Performance Comparison
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown of approved vs pending vs rejected submissions per agent
              </p>
            </div>
            <Award className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={agentChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "12px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
                />
                <Bar dataKey="approved" name="Approved" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Donut Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-subtle flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Status Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Quality review outcome ratio
            </p>
          </div>

          <div className="h-56 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            {pieData.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span>{p.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-900">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Submission Volume Area Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Submission Activity (14 Days)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily volume of customer submissions received from all agents
            </p>
          </div>
          <TrendingUp className="w-4 h-4 text-slate-400" />
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dailyTrend}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
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
                dataKey="total"
                name="Total Leads"
                stroke="#0f172a"
                fillOpacity={1}
                fill="url(#colorTotal)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Performance Leaderboard Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Agent Performance Rankings
          </h3>
          <span className="text-xs text-slate-400">
            {agentPerformance.length} registered agents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                <th className="py-3 px-5">Agent</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Total Submitted</th>
                <th className="py-3 px-4 text-center text-emerald-600">Approved</th>
                <th className="py-3 px-4 text-center text-amber-600">Pending</th>
                <th className="py-3 px-4 text-center text-rose-600">Rejected</th>
                <th className="py-3 px-5 text-right">Approval Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentPerformance.map((agent, index) => (
                <tr key={agent.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-semibold text-slate-900 whitespace-nowrap flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono w-4">
                      #{index + 1}
                    </span>
                    <span>{agent.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                    {agent.email}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-center text-slate-800">
                    {agent.total}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-center text-emerald-600">
                    {agent.approved}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-center text-amber-600">
                    {agent.pending}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-center text-rose-600">
                    {agent.rejected}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-semibold text-slate-900">
                    {agent.approvalRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
