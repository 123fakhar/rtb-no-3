"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface Performance {
  name: string;
  email: string;
  leads: number;
  sold: number;
  revenue?: number;
  conversionRate: number;
  crm: { PENDING: number; APPROVED: number; REJECTED: number };
}

export function AgentPerformanceView() {
  const [data, setData] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ performance: Performance }>("/api/analytics/me")
      .then((res) => setData(res.performance))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="p-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-700" />
      </div>
    );
  }

  const cards = [
    { label: "My leads", value: String(data.leads) },
    { label: "Sold", value: String(data.sold) },
    { label: "Conversion", value: `${data.conversionRate}%` },
    ...(typeof data.revenue === "number" ? [{ label: "Revenue", value: `$${data.revenue.toFixed(2)}` }] : []),
    { label: "CRM pending", value: String(data.crm.PENDING) },
    { label: "CRM approved", value: String(data.crm.APPROVED) },
    { label: "CRM rejected", value: String(data.crm.REJECTED) },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Closer Performance</h1>
        <p className="text-xs text-slate-500 mt-1">
          {data.name} · only your leads and CRM results are shown here. Revenue stays with the admin.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="kukie-card-static p-4">
            <div className="text-xs text-slate-500">{card.label}</div>
            <div className="mt-1 text-xl font-bold text-slate-900 font-mono">{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
