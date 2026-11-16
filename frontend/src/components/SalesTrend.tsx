"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SalesTrend({
  title,
  total,
  data,
}: {
  title: string;
  total: number;
  data: { label: string; sales: number }[];
}) {
  return (
    <div className="kukie-card-static p-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">{total}</div>
        </div>
        <div className="text-[11px] text-slate-400">sales</div>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`sales-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
            <Tooltip />
            <Area type="monotone" dataKey="sales" stroke="#2563eb" fill={`url(#sales-${title})`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
