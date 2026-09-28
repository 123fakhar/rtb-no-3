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
  Clock,
  ArrowRight,
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
    // Poll every 5s if active
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
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
          <span className="text-sm font-medium text-slate-600">Loading buyer routes...</span>
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
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top Header bar matching screenshot 8 */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between text-white shrink-0">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>{lead?.phone || "Lead Routing"}</span>
            <span className="text-slate-400 font-normal">·</span>
            <span className="text-slate-300 font-semibold">{lead?.state || "US"}</span>
            <span className="text-slate-400 font-normal">·</span>
            <span className="text-slate-300 font-medium">{lead?.zip}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Lead #{lead?.id?.slice(-6) || "6938"} — click campaigns to send (multiple at once OK)
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg pl-9 pr-3 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Buyers grouped by Buyer name with priority */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          {filteredBuyers.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No matching buyer campaigns found.
            </div>
          ) : (
            filteredBuyers.map((buyer) => (
              <div key={buyer.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
                    {buyer.name} ({buyer.configs.length})
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Priority #{buyer.priority}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {buyer.configs.map((config: any) => {
                    const isPending = pendingConfigs.has(config.id);
                    return (
                      <button
                        key={config.id}
                        onClick={() => handleSendPing(config.id)}
                        disabled={isPending}
                        className="bg-white border border-slate-200 hover:border-slate-400 hover:shadow-card transition-all rounded-xl p-4 text-left flex flex-col justify-between h-24 group relative"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                              {isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Phone className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <span className="text-xs font-semibold text-slate-900 line-clamp-1">
                              {config.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                          <span className="capitalize">{config.provider}</span>
                          {isPending ? (
                            <span className="text-amber-600 font-medium animate-pulse text-[10px]">
                              Sending...
                            </span>
                          ) : (
                            <span className="text-slate-400 group-hover:text-slate-900 transition-colors">
                              Click to send →
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

        {/* Right Side: ROUTING HISTORY matching screenshot 8 */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wider text-slate-700 uppercase">
              ROUTING HISTORY ({history.length})
            </h3>
            <span className="text-[11px] text-slate-400">Click to view details</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No pings sent for this lead yet. Click any buyer campaign on the left to begin routing.
              </div>
            ) : (
              history.map((item) => {
                const isAccepted = item.status === "RESERVED";
                return (
                  <div
                    key={item.id}
                    onClick={() => inspectPing(item)}
                    className="border border-slate-200 hover:border-slate-400 rounded-xl p-3.5 cursor-pointer hover:shadow-subtle transition-all bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900">
                          {item.campaignName || "Auto Insurance"}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {item.buyerName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isAccepted
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {isAccepted ? "reserved" : "rejected"}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                      {item.durationMs && <span>{item.durationMs}ms</span>}
                    </div>

                    {isAccepted && item.trackingNumber && (
                      <div className="mt-2 font-mono text-xs font-bold text-blue-600 flex items-center gap-1.5">
                        <span>{item.trackingNumber}</span>
                      </div>
                    )}

                    {!isAccepted && item.rejectReason && (
                      <div className="mt-1 text-xs text-red-600 font-medium">
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

      {/* Ping Inspection Modal matching screenshot 9 & 10 */}
      {selectedPing && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-popover overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 pb-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                {selectedPing.status === "RESERVED" ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-serif">
                    {selectedPing.campaignName || "Auto Insurance"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedPing.status === "RESERVED"
                      ? "Lead reserved — API call was successful"
                      : "Buyer did not accept this lead"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPing(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reserved / Rejected Hero Card */}
            <div className="px-6 pb-4">
              {selectedPing.status === "RESERVED" ? (
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-5 text-center flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">
                    TRACKING NUMBER
                  </span>
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span className="text-xl font-bold text-blue-600 font-mono tracking-tight">
                      {selectedPing.trackingNumber || "+1 844 901 2076"}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedPing.trackingNumber || "+1 844 901 2076")}
                      className="p-1.5 text-slate-500 hover:text-blue-600 transition-colors ml-1"
                      title="Copy number"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  {copiedText && (
                    <span className="text-[10px] text-emerald-600 mt-1 font-medium">Copied!</span>
                  )}
                </div>
              ) : (
                <div className="bg-red-50/70 border border-red-100 rounded-xl p-4">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-red-500 block mb-1">
                    REJECT REASON
                  </span>
                  <span className="text-sm font-semibold text-red-700">
                    {selectedPing.rejectReason || "Duplicate Ping"}
                  </span>
                </div>
              )}
            </div>

            {/* Collapsible View Raw Response */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="w-full flex items-center justify-between py-2 text-xs font-semibold text-slate-700 border-t border-slate-100"
              >
                <span>View Raw Response</span>
                {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showRawJson && (
                <div className="mt-2 bg-slate-50 rounded-xl p-4 border border-slate-200 text-slate-800 font-mono text-[11px] max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(
                      selectedPing.responseBody || {
                        ping: {
                          success: selectedPing.status === "RESERVED",
                          status: selectedPing.status === "RESERVED" ? "accepted" : "rejected",
                          tracking_type: "caller_number",
                        },
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
