"use client";

import React, { useEffect, useState } from "react";
import { apiRequest, downloadBase64 } from "@/lib/api";
import { putCache, takeCache } from "@/lib/tabCache";
import { useAuth } from "@/context/AuthContext";
import { Loader2, PhoneOff } from "lucide-react";

interface NoPickupRow {
  id: string;
  phone: string;
  campaign: string;
  buyer: string;
  reason: string;
  agentName: string;
  closerName: string;
  date: string;
}

export function NoPickupListView({ onNew }: { onNew?: () => void }) {
  const { isAdmin, isManager } = useAuth();
  const canDownload = isAdmin || isManager;
  const [rows, setRows] = useState<NoPickupRow[]>(() => takeCache<NoPickupRow[]>("no-pickups") ?? []);
  const [loading, setLoading] = useState(() => takeCache("no-pickups") == null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = () => {
    const cached = takeCache<NoPickupRow[]>("no-pickups");
    if (cached) setRows(cached);
    else setLoading(true);
    apiRequest<{ entries: NoPickupRow[] }>("/api/crm/no-pickup")
      .then((res) => {
        setRows(res.entries);
        putCache("no-pickups", res.entries);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const download = async (range: "day" | "week" | "month" | "all") => {
    setDownloading(range);
    try {
      const res = await apiRequest<{ filename: string; base64: string; mime: string }>(
        `/api/crm/no-pickup/export?range=${range}&tzOffset=${new Date().getTimezoneOffset()}`
      );
      downloadBase64(res.filename, res.base64, res.mime);
    } catch (err: any) {
      alert(err.message || "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <PhoneOff className="w-4 h-4 text-amber-700" />
            <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">No pickup</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">No Pickups</h1>
          <p className="text-xs text-slate-500 mt-1">Each download is built from the latest saved no pickups.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDownload && (["day", "week", "month", "all"] as const).map((range) => (
            <button key={range} onClick={() => download(range)} disabled={downloading !== null} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50">
              {downloading === range ? "Downloading..." : range === "day" ? "Today" : range === "week" ? "This week" : range === "month" ? "This month" : "All"}
            </button>
          ))}
          {onNew && (
            <button onClick={onNew} className="px-3 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold">New no pickup</button>
          )}
        </div>
      </div>
      <div className="kukie-card-static overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-700" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Closer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-slate-400">No pickups yet.</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-mono">{row.date}</td>
                    <td className="px-4 py-3 font-mono">{row.phone}</td>
                    <td className="px-4 py-3">{row.campaign}</td>
                    <td className="px-4 py-3">{row.buyer}</td>
                    <td className="px-4 py-3 max-w-xs whitespace-normal break-words">{row.reason}</td>
                    <td className="px-4 py-3">{row.agentName}</td>
                    <td className="px-4 py-3">{row.closerName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
