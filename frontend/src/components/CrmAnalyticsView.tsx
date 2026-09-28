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
  BarChart3,
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
      <div className="p-16 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Loading CRM &amp; Agent analytics...
        </span>
      </div>
    );
  }

  const { totals, agentPerformance, dailyTrend } = data;

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
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shadow-sm">
            <BarChart3 className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
            PERFORMANCE METRICS
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
          CRM &amp; Agent Analytics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Quality assurance metrics, approval ratios, and fronter conversion performance across all active agents.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kukie-card p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>TOTAL SUBMISSIONS</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-3">
            {totals.total}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Across {agentPerformance.length} agents
          </span>
        </div>

        <div className="kukie-card p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>APPROVED LEADS</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-3">
            {totals.approved}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            {totals.approvalRate}% overall approval rate
          </span>
        </div>

        <div className="kukie-card p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>PENDING REVIEW</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-500 font-mono mt-3">
            {totals.pending}
          </div>
          <span className="text-[11px] text-amber-600 font-medium mt-1 block">
            Awaiting administrator QA
          </span>
        </div>

        <div className="kukie-card p-5">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>REJECTED LEADS</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-500 font-mono mt-3">
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
        <div className="lg:col-span-2 kukie-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Agent Performance Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Approved vs pending vs rejected submissions per agent
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
                    borderRadius: "14px",
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
        <div className="kukie-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              QA Outcome Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Review ratio across all submissions
            </p>
          </div>

          <div className="h-56 w-full my-auto">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                No CRM data recorded yet
              </div>
            ) : (
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
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            {pieData.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="font-medium">{p.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-900">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Submission Volume Area Chart */}
      <div className="kukie-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Submission Activity Trend (14 Days)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily volume of caller records received across agent accounts
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
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "none",
                  borderRadius: "14px",
                  color: "#fff",
                  fontSize: "11px",
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Leads"
                stroke="#2563eb"
                fillOpacity={1}
                fill="url(#colorTotal)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Performance Leaderboard Table */}
      <div className="kukie-card-static overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
            Agent Performance Rankings
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {agentPerformance.length} registered agents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">
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
                <tr key={agent.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-slate-900 whitespace-nowrap flex items-center gap-2">
                    <span className="text-[10px] text-blue-600 font-mono font-bold w-5">
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
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-900">
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
