"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { SalesTrend } from "./SalesTrend";

interface Trends {
  totals: { day: number; week: number; month: number; all: number };
  daily: { label: string; sales: number }[];
  weekly: { label: string; sales: number }[];
  monthly: { label: string; sales: number }[];
  campaigns: { id: string; name: string }[];
  closers: { id: string; name: string }[];
  dids: string[];
}

export function PerformanceCharts({
  title,
  subtitle,
  showFilters,
  embedded = false,
}: {
  title: string;
  subtitle: string;
  showFilters: boolean;
  embedded?: boolean;
}) {
  const [campaignId, setCampaignId] = useState("");
  const [userId, setUserId] = useState("");
  const [did, setDid] = useState("");
  const [data, setData] = useState<Trends | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ tzOffset: String(new Date().getTimezoneOffset()) });
    if (campaignId) params.set("campaignId", campaignId);
    if (showFilters && userId) params.set("userId", userId);
    if (did) params.set("did", did);
    setLoading(true);
    apiRequest<Trends>(`/api/crm/trends?${params.toString()}`)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err.message || "Could not load sales"))
      .finally(() => setLoading(false));
  }, [campaignId, userId, did, showFilters]);

  return (
    <div className={embedded ? "space-y-4" : "p-6 md:p-10 max-w-7xl mx-auto space-y-6"}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {!embedded && <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>}
          <p className="text-xs text-slate-500 mt-1">{subtitle} Days run from 6:00 PM to 6:00 PM Pakistan time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={campaignId} onChange={(event) => setCampaignId(event.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white">
            <option value="">All campaigns</option>
            {(data?.campaigns || []).map((campaign) => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
          {showFilters && (
            <select value={userId} onChange={(event) => setUserId(event.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white">
              <option value="">All closers</option>
              {(data?.closers || []).map((closer) => (
                <option key={closer.id} value={closer.id}>{closer.name}</option>
              ))}
            </select>
          )}
          <select value={did} onChange={(event) => setDid(event.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white">
            <option value="">All DIDs</option>
            {(data?.dids || []).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs">{error}</div>}
      {loading && !data ? (
        <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SalesTrend title="Daily" total={data.totals.day} data={data.daily} />
          <SalesTrend title="Weekly" total={data.totals.week} data={data.weekly} />
          <SalesTrend title="Monthly" total={data.totals.month} data={data.monthly} />
        </div>
      ) : null}
    </div>
  );
}
