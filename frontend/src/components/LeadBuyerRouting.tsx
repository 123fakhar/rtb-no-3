"use client";

import React, { useEffect, useRef, useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
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

type BuyerBlock = { buyerId: string; status: "APPROVED" | "REJECTED" };

function blockMessage(status: "APPROVED" | "REJECTED") {
  return status === "APPROVED"
    ? "You already made a sale on this lead to this buyer"
    : "This lead was already rejected for this buyer";
}

export function LeadBuyerRouting({ leadId, onClose }: LeadBuyerRoutingProps) {
  const [data, setData] = useState<{ lead: any; buyers: any[]; history: any[]; blockedBuyers?: BuyerBlock[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingConfigs, setPendingConfigs] = useState<Set<string>>(new Set());
  const [pendingRows, setPendingRows] = useState<
    { configId: string; configName: string; buyerName: string; campaignName: string }[]
  >([]);
  const [selectedPing, setSelectedPing] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [showRawJson, setShowRawJson] = useState(true);
  const [saleNotice, setSaleNotice] = useState<string | null>(null);
  const [zipDraft, setZipDraft] = useState("");
  const watchConfig = useRef<string | null>(null);
  const leadRef = useRef(leadId);
  leadRef.current = leadId;

  const loadData = async () => {
    const requested = leadId;
    try {
      const res = await apiRequest<{ lead: any; buyers: any[]; history: any[]; blockedBuyers?: BuyerBlock[] }>(
        `/api/leads/${requested}/routing`
      );
      if (leadRef.current !== requested) return;
      setData((prev) => {
        if (!prev) return res;
        const sameHistory =
          prev.history.length === res.history.length && prev.history[0]?.id === res.history[0]?.id;
        const sameLead = prev.lead?.zip === res.lead?.zip && prev.lead?.status === res.lead?.status;
        const sameBlocks = JSON.stringify(prev.blockedBuyers ?? []) === JSON.stringify(res.blockedBuyers ?? []);
        return sameHistory && sameLead && sameBlocks ? prev : res;
      });
    } catch (err) {
      console.error("Failed to load routing data:", err);
    } finally {
      if (leadRef.current === requested) setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setData(null);
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, [leadId]);

  useEffect(() => {
    const zip = data?.lead?.zip;
    if (typeof zip === "string" && /^\d{5}(?:-\d{4})?$/.test(zip)) setZipDraft(zip);
    else setZipDraft("");
  }, [data?.lead?.id]);

  const buyerBlock = (buyerId: string) =>
    (data?.blockedBuyers ?? []).find((entry) => entry.buyerId === buyerId);

  const handleSendPing = async (config: any, buyer: any) => {
    const block = buyerBlock(buyer.id);
    if (block) {
      setSaleNotice(blockMessage(block.status));
      return;
    }
    if (pendingConfigs.has(config.id)) return;

    setPendingConfigs((prev) => new Set(prev).add(config.id));
    setPendingRows((prev) => [
      ...prev,
      {
        configId: config.id,
        configName: config.name,
        buyerName: buyer.name,
        campaignName: config.campaignName,
      },
    ]);
    try {
      const res = await apiRequest<{ ping: { id: string } }>(`/api/leads/${leadId}/ping/${config.id}`, {
        method: "POST",
      });
      if (watchConfig.current === config.id) {
        const detail = await apiRequest<{ ping: any }>(`/api/pings/${res.ping.id}`);
        setSelectedPing(detail.ping);
        watchConfig.current = null;
      }
      await loadData();
    } catch (err) {
      if (watchConfig.current === config.id) watchConfig.current = null;
      if (err instanceof ApiError && (err.status === 409 || err.message.includes("already made a sale"))) {
        setSaleNotice(err.message);
      }
      await loadData();
    } finally {
      setPendingConfigs((prev) => {
        const next = new Set(prev);
        next.delete(config.id);
        return next;
      });
      setPendingRows((prev) => prev.filter((row) => row.configId !== config.id));
    }
  };

  const formatTracking = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    if (ten.length === 10) return `+1 ${ten.slice(0, 3)} ${ten.slice(3, 6)} ${ten.slice(6)}`;
    return value;
  };

  const saveZip = async () => {
    const next = zipDraft.trim();
    if (!/^\d{5}(?:-\d{4})?$/.test(next) || next === data?.lead?.zip) return;
    try {
      await apiRequest(`/api/leads/${leadId}`, {
        method: "PATCH",
        body: JSON.stringify({ zip: next }),
      });
      await loadData();
    } catch (err) {
      console.error("Failed to save ZIP", err);
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
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                ZIP
                <input
                  value={zipDraft}
                  onChange={(event) => setZipDraft(event.target.value)}
                  onBlur={saveZip}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  placeholder="60601"
                  className={`w-20 rounded-lg border px-2 py-0.5 font-mono text-xs text-slate-800 ${
                    /^\d{5}(?:-\d{4})?$/.test(zipDraft)
                      ? "border-slate-200 bg-white"
                      : "border-rose-300 bg-rose-50"
                  }`}
                />
              </label>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Lead #{lead?.id?.slice(-6) || "ID"} · Click buyers to bid. Open a result from the list on the right.
            </p>
            {lead?.zip && !/^\d{5}(?:-\d{4})?$/.test(lead.zip) && (
              <p className="text-xs text-rose-600 mt-1">
                This lead has no usable ZIP, so buyers reject it. Enter the caller&apos;s 5-digit ZIP.
              </p>
            )}
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
                    const block = buyerBlock(buyer.id);
                    return (
                      <button
                        key={config.id}
                        onClick={() => handleSendPing(config, buyer)}
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
                          ) : block ? (
                            <span className={`font-bold text-[11px] ${block.status === "APPROVED" ? "text-amber-700" : "text-rose-700"}`}>
                              {block.status === "APPROVED" ? "Sale accepted" : "Rejected"}
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
            {pendingRows.map((row) => (
              <div
                key={row.configId}
                onClick={() => {
                  watchConfig.current = row.configId;
                }}
                className="kukie-card p-3.5 border-blue-200 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{row.campaignName || row.configName}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">{row.buyerName}</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    processing
                  </span>
                </div>
                <div className="mt-2 text-[11px] text-blue-600 font-bold flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sending bid... click for the result
                </div>
              </div>
            ))}
            {history.length === 0 && pendingRows.length === 0 ? (
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
                        {isAccepted ? "bid" : "rejected"}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                      <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                      {item.durationMs && <span>{item.durationMs}ms</span>}
                    </div>

                    {isAccepted && item.trackingNumber && (
                      <div className="mt-2 font-mono text-xs font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50/60 px-2.5 py-1 rounded-lg">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{formatTracking(item.trackingNumber)}</span>
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

      {saleNotice && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/40 flex items-center justify-center p-4"
          onClick={() => setSaleNotice(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-popover border border-slate-200 p-6 text-center relative"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setSaleNotice(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-5xl mb-3" aria-hidden="true">😢</div>
            <h3 className="text-lg font-bold text-slate-900">{saleNotice}</h3>
            <p className="text-sm text-slate-500 mt-2">
              This buyer was not contacted again. You can still send this lead to other buyers.
            </p>
            <button
              onClick={() => setSaleNotice(null)}
              className="mt-5 btn-primary px-5 py-2 text-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Ping Inspection Modal */}
      {selectedPing && (
        <div
          className="fixed inset-0 z-[80] bg-slate-900/30 flex items-center justify-center p-4"
          onClick={() => setSelectedPing(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-popover overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {selectedPing.status === "RESERVED" ? (
                  <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedPing.campaignName || selectedPing.configName || "Buyer"}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {selectedPing.status === "RESERVED"
                      ? "Lead reserved — API call was successful"
                      : "No bid — buyer did not accept this lead"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPing(null)}
                className="text-slate-500 hover:text-slate-900 p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-4">
              {selectedPing.status === "RESERVED" ? (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-6 text-center">
                  <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-slate-500">
                    Tracking number
                  </span>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600 tracking-tight">
                      {selectedPing.trackingNumber
                        ? formatTracking(selectedPing.trackingNumber)
                        : "Accepted"}
                    </span>
                    {selectedPing.trackingNumber && (
                      <button
                        onClick={() => handleCopy(selectedPing.trackingNumber)}
                        className="p-1.5 text-slate-400 hover:text-blue-600"
                        title="Copy number"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {copiedText && <span className="text-[11px] text-emerald-600 font-bold">Copied for the dialer</span>}
                  {selectedPing.bid != null && (
                    <div className="mt-2 text-lg font-semibold text-emerald-600">
                      Payout: ${Number(selectedPing.bid).toFixed(2)}
                    </div>
                  )}
                  {selectedPing.trackingNumber && (
                    <p className="mt-2 text-xs text-slate-500">
                      Dial this number so the customer can talk to the buyer.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-rose-500">
                    No bid
                  </span>
                  <span className="text-sm font-semibold text-rose-700 leading-relaxed block mt-1">
                    {selectedPing.rejectReason || "Buyer did not return a bid"}
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => setShowRawJson(!showRawJson)}
                className="w-full flex items-center justify-between py-3 text-sm font-medium text-slate-700 border border-slate-200 rounded-xl px-4 hover:bg-slate-50"
              >
                <span>View Raw Response</span>
                {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showRawJson && (
                <pre className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 font-mono text-[11px] max-h-60 overflow-y-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedPing.responseBody || { message: "No response body recorded" }, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
