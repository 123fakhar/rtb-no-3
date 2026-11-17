"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Loader2, Phone, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const TRANSFER = "(803) 723-6864";

interface PingResult {
  status: string;
  bid: number | null;
  trackingNumber: string | null;
  rejectReason: string | null;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return value;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

export function AcaFormView() {
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PingResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    if (!/^\d{5}(?:-\d{4})?$/.test(zip.trim())) {
      setError("Please enter a valid ZIP code");
      return;
    }
    if (!state) {
      setError("Please select a state");
      return;
    }

    setLoading(true);
    try {
      const campaigns = await apiRequest<{ campaigns: { id: string; name: string }[] }>("/api/campaigns");
      const campaign = campaigns.campaigns.find((item) => item.name === "ACA");
      if (!campaign) {
        setError("The ACA campaign is not set up yet");
        return;
      }

      const created = await apiRequest<{ lead: { id: string } }>("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          phone: cleanPhone,
          zip: zip.trim(),
          state,
          campaignId: campaign.id,
        }),
      });

      const routing = await apiRequest<{
        buyers: { name: string; configs: { id: string; provider: string; name: string }[] }[];
      }>(`/api/leads/${created.lead.id}/routing`);
      const config = routing.buyers
        .flatMap((buyer) => buyer.configs.map((item) => ({ ...item, buyerName: buyer.name })))
        .find((item) => item.buyerName === "ACA D50" || item.provider === "nextgen");
      if (!config) {
        setError("ACA D50 is not available to ping");
        return;
      }

      const ping = await apiRequest<{ ping: PingResult }>(`/api/leads/${created.lead.id}/ping/${config.id}`, {
        method: "POST",
      });
      setResult(ping.ping);
      setPhone("");
      setZip("");
      setState("");
    } catch (err: any) {
      setError(err.message || "Could not submit this ACA lead");
    } finally {
      setLoading(false);
    }
  };

  const accepted = result?.status === "RESERVED";
  const dial = result?.trackingNumber ? formatPhone(result.trackingNumber) : TRANSFER;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Phone className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">ACA</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">ACA D50</h1>
        <p className="text-xs text-slate-500 mt-1">
          Submit the caller. When D50 accepts, transfer the call to {TRANSFER}.
        </p>
      </div>

      <div className="kukie-card p-8 md:p-10 max-w-xl border border-white/90">
        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        {result && (
          <div
            className={`mb-5 p-4 rounded-2xl border text-xs ${
              accepted ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {accepted ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {accepted ? "Accepted" : "Not accepted"}
            </div>
            {accepted ? (
              <p className="mt-2">
                Transfer number <span className="font-mono font-bold">{dial}</span>
                {result.bid != null ? ` · Bid $${result.bid}` : ""}
              </p>
            ) : (
              <p className="mt-2">{result.rejectReason || "The buyer did not accept this caller."}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Caller Phone Number
            </label>
            <input
              type="tel"
              placeholder="(555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={14}
              required
              className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">ZIP Code</label>
              <input
                type="text"
                placeholder="e.g. 29201"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                maxLength={10}
                required
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">State</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-700"
              >
                <option value="">Select State</option>
                {US_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-xs tracking-wider uppercase font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking D50...</span>
              </>
            ) : (
              <>
                <span>Submit ACA Lead</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
