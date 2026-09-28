"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import {
  Phone,
  Search,
  X,
  CheckCircle2,
  XCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
  Activity,
  Layers,
  ArrowRight,
  Send,
  Building2,
  AlertCircle,
} from "lucide-react";

interface LeadBuyerRoutingProps {
  leadId: string;
  onClose: () => void;
}

export function LeadBuyerRouting({ leadId, onClose }: LeadBuyerRoutingProps) {
  const [data, setData] = useState<{ lead: any; buyers: any[]; history: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingConfigs, setPendingConfigs] = useState<Set<string>>(new Set());
  const [selectedPing, setSelectedPing] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [showRawJson, setShowRawJson] = useState(true);

  const loadData = async () => {
    try {
      const res = await apiRequest<{ lead: any; buyers: any[]; history: any[] }>(
        `/api/leads/${leadId}/routing`
      );
      setData(res);
    } catch (err) {
      console.error("Failed to load routing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, [leadId]);

  const handleSendPing = async (configId: string) => {
    setPendingConfigs((prev) => new Set(prev).add(configId));
    try {
      await apiRequest(`/api/leads/${leadId}/ping/${configId}`, { method: "POST" });
      await loadData();
    } catch (err) {
      console.error("Ping error:", err);
      await loadData();
    } finally {
      setPendingConfigs((prev) => {
        const next = new Set(prev);
        next.delete(configId);
        return next;
      });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const inspectPing = async (pingSummary: any) => {
    try {
      const res = await apiRequest<{ ping: any }>(`/api/pings/${pingSummary.id}`);
      setSelectedPing(res.ping);
    } catch {
      setSelectedPing(pingSummary);
    }
  };

  if (loading && !data) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="kukie-card p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Loading Real-Time Buyer Routes...
          </span>
        </div>
      </div>
    );
  }

  const lead = data?.lead;
  const buyers = data?.buyers ?? [];
  const history = data?.history ?? [];

  const filteredBuyers = buyers
    .map((b) => ({
      ...b,
      configs: b.configs.filter(
        (c: any) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          c.campaignName.toLowerCase().includes(search.toLowerCase()) ||
          c.provider.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((b) => b.configs.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top Header Bar matching Kukie style */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex items-center justify-between text-slate-900 shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 font-mono">
                {lead?.phone || "Lead Routing"}
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                {lead?.state || "US"}
              </span>
              <span className="text-xs font-medium text-slate-500">
                ZIP: {lead?.zip}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Lead #{lead?.id?.slice(-6) || "ID"} · Click a buyer campaign below to trigger real HTTP RTB ping
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search buyer endpoints..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 border border-slate-200/80 text-slate-900 text-xs rounded-xl pl-9 pr-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            title="Close workspace"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden kukie-bg">
        {/* Left Side: Buyers grouped by Buyer name with priority */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {filteredBuyers.length === 0 ? (
            <div className="kukie-card p-12 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No buyer endpoints configured for this campaign</p>
              <p className="text-xs text-slate-400 mt-1">Go to &quot;RTB APIs&quot; or &quot;Buyers&quot; to configure active routing endpoints.</p>
            </div>
          ) : (
            filteredBuyers.map((buyer) => (
              <div key={buyer.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                      #{buyer.priority}
                    </div>
                    <h3 className="text-xs font-extrabold tracking-wider text-slate-700 uppercase">
                      {buyer.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-400">
                      ({buyer.configs.length} {buyer.configs.length === 1 ? "endpoint" : "endpoints"})
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                    Priority #{buyer.priority}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {buyer.configs.map((config: any) => {
                    const isPending = pendingConfigs.has(config.id);
                    return (
                      <button
                        key={config.id}
                        onClick={() => handleSendPing(config.id)}
                        disabled={isPending}
                        className="kukie-card p-4 text-left flex flex-col justify-between h-28 group relative border border-white/90 hover:border-blue-300/80 transition-all cursor-pointer disabled:opacity-60"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                              {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Phone className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <span className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {config.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                          <span className="capitalize font-semibold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md text-[10px]">
                            {config.provider}
                          </span>
                          {isPending ? (
                            <span className="text-blue-600 font-bold animate-pulse text-[11px]">
                              Sending Ping...
                            </span>
                          ) : (
                            <span className="text-slate-500 group-hover:text-blue-600 font-bold text-[11px] flex items-center gap-1">
                              <span>Ping Buyer</span>
                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Side: Routing History Drawer */}
        <div className="w-96 bg-white/90 backdrop-blur-md border-l border-slate-200/80 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-extrabold tracking-wider text-slate-700 uppercase">
                ROUTING HISTORY ({history.length})
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Click to inspect</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No pings sent for this lead yet. Click any buyer endpoint on the left to trigger a real HTTP bid request.
              </div>
            ) : (
              history.map((item) => {
                const isAccepted = item.status === "RESERVED";
                return (
                  <div
                    key={item.id}
                    onClick={() => inspectPing(item)}
                    className="kukie-card p-3.5 cursor-pointer hover:border-blue-300 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {item.configName || item.campaignName || "Buyer Endpoint"}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.buyerName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isAccepted
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                            : "bg-rose-50 text-rose-700 border border-rose-200/70"
                        }`}
                      >
                        {isAccepted ? "reserved" : "rejected"}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                      <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                      {item.durationMs && <span>{item.durationMs}ms</span>}
                    </div>

                    {isAccepted && item.trackingNumber && (
                      <div className="mt-2 font-mono text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50/60 px-2.5 py-1 rounded-lg">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{item.trackingNumber}</span>
                      </div>
                    )}

                    {!isAccepted && item.rejectReason && (
                      <div className="mt-1.5 text-xs text-rose-600 font-medium line-clamp-2">
                        {item.rejectReason}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Ping Inspection Modal */}
      {selectedPing && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-popover overflow-hidden border border-white/80">
            {/* Modal Header */}
            <div className="p-6 pb-4 flex items-start justify-between bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-start gap-3">
                {selectedPing.status === "RESERVED" ? (
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedPing.config?.name || selectedPing.buyer?.name || "Ping Transaction"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedPing.status === "RESERVED"
                      ? "Buyer accepted — bid won"
                      : "Buyer returned reject or offline response"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPing(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reserved / Rejected Hero Card */}
            <div className="p-6 pb-4">
              {selectedPing.status === "RESERVED" ? (
                <div className="bg-blue-50/80 border border-blue-200/70 rounded-2xl p-5 text-center flex flex-col items-center">
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500 mb-1">
                    BUYER TRACKING NUMBER
                  </span>
                  {selectedPing.trackingNumber ? (
                    <div className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-blue-600" />
                      <span className="text-xl font-bold text-blue-600 font-mono tracking-tight">
                        {selectedPing.trackingNumber}
                      </span>
                      <button
                        onClick={() => handleCopy(selectedPing.trackingNumber)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors ml-1"
                        title="Copy number"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-600">
                      Accepted without static tracking number
                    </span>
                  )}
                  {copiedText && (
                    <span className="text-[10px] text-emerald-600 mt-1 font-bold">Copied!</span>
                  )}
                </div>
              ) : (
                <div className="bg-rose-50/80 border border-rose-200/70 rounded-2xl p-4">
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-rose-500 block mb-1">
                    GENUINE REJECT REASON
                  </span>
                  <span className="text-xs font-bold text-rose-700 leading-relaxed block">
                    {selectedPing.rejectReason || "Buyer did not accept bid"}
                  </span>
                </div>
              )}
            </div>

            {/* Collapsible View Raw Response */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="w-full flex items-center justify-between py-2.5 text-xs font-bold text-slate-700 border-t border-slate-100 hover:text-blue-600 transition-colors"
              >
                <span>HTTP Payload &amp; Response Inspection</span>
                {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showRawJson && (
                <div className="mt-2 bg-slate-900 rounded-2xl p-4 text-emerald-400 font-mono text-[11px] max-h-60 overflow-y-auto space-y-2">
                  {selectedPing.requestUrl && (
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Request URL:</span>
                      <span className="text-white break-all">{selectedPing.requestUrl}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Response Body:</span>
                    <pre className="whitespace-pre-wrap break-all text-xs">
                      {JSON.stringify(selectedPing.responseBody || { message: "No response body recorded" }, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
