"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Loader2, PlusCircle, ArrowRight, ShieldCheck, MapPin, Phone } from "lucide-react";

interface SubmitLeadViewProps {
  onSuccess: (leadId: string) => void;
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export function SubmitLeadView({ onSuccess }: SubmitLeadViewProps) {
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    if (!zip.trim()) {
      setError("Please enter a valid ZIP code");
      return;
    }
    if (!state) {
      setError("Please select a state");
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest<{ lead: { id: string } }>("/api/leads", {
        method: "POST",
        body: JSON.stringify({
          phone: cleanPhone,
          zip: zip.trim(),
          state,
        }),
      });

      // Redirect immediately to My Leads and open routing for the newly submitted lead
      onSuccess(res.lead.id);
    } catch (err: any) {
      setError(err.message || "Failed to submit lead");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <PlusCircle className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
            CALL INTAKE
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
          Submit Lead for Auction
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Create a live caller profile. Trigger concurrent RTB pings and route to top-priority buyers.
        </p>
      </div>

      <div className="kukie-card p-8 md:p-10 max-w-xl border border-white/90">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Caller Information</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter customer details for buyer query string interpolation.
            </p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Phone className="w-4 h-4" />
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold">
            {error}
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
            <span className="text-[11px] text-slate-400 mt-1 block">
              10 digits without country code. Automatically interpolated into &quot;&#123;caller_number&#125;&quot;.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                ZIP Code
              </label>
              <input
                type="text"
                placeholder="e.g. 75001"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                maxLength={10}
                required
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                State
              </label>
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

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-xs tracking-wider uppercase font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Lead...</span>
                </>
              ) : (
                <>
                  <span>Create Lead &amp; Launch Routing</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
