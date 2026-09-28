"use client";

import React, { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Loader2 } from "lucide-react";

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
      setError("Please enter a ZIP code");
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
    <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-150">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif">
          Submit Lead
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Create a lead with customer information. Route it to buyers from My Leads.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-8 max-w-xl">
        <h2 className="text-base font-semibold text-slate-900">New Lead</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Enter customer information. Route the lead to buyers from My Leads after creation.
        </p>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              placeholder="10-digit phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={14}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ZIP
              </label>
              <input
                type="text"
                placeholder="ZIP code"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                maxLength={10}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                State
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-700"
              >
                <option value="">Select state</option>
                {US_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Create Lead</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
