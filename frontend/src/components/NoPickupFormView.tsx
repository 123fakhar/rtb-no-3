"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle2, Loader2, PhoneOff } from "lucide-react";

interface NoPickupFormViewProps {
  onSuccess?: () => void;
}

function todayInput() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function NoPickupFormView({ onSuccess }: NoPickupFormViewProps) {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [reason, setReason] = useState("");
  const [agentName, setAgentName] = useState("");
  const [closerName, setCloserName] = useState(user?.name || "");
  const [closerNameEdited, setCloserNameEdited] = useState(false);
  const [date, setDate] = useState(todayInput);
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([]);
  const [buyers, setBuyers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!closerNameEdited && user?.name) setCloserName(user.name);
  }, [user?.name, closerNameEdited]);

  useEffect(() => {
    apiRequest<{ campaigns: { id: string; name: string }[] }>("/api/campaigns")
      .then((res) => {
        setCampaigns(res.campaigns);
        if (res.campaigns[0]) setCampaignId(res.campaigns[0].id);
      })
      .catch(console.error);
    apiRequest<{ buyers: { id: string; name: string }[] }>("/api/buyers")
      .then((res) => setBuyers(res.buyers.map((buyer) => ({ id: buyer.id, name: buyer.name }))))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const digits = phone.replace(/\D/g, "");
    const normalized = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    if (normalized.length !== 10) {
      setError("Enter a 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/api/crm/no-pickup", {
        method: "POST",
        body: JSON.stringify({
          phone: normalized,
          campaignId,
          buyerId,
          reason: reason.trim(),
          agentName: agentName.trim(),
          closerName: closerName.trim(),
          date,
        }),
      });
      setSubmitted(true);
      setTimeout(() => onSuccess?.(), 1200);
    } catch (err: any) {
      setError(err.message || "Could not save this no pickup");
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">No pickup saved</h2>
        <p className="text-sm text-slate-500 mt-2">This number will not be sent to that buyer again.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center">
            <PhoneOff className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">No pickup</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">No Pickup</h1>
        <p className="text-xs text-slate-500 mt-1">
          Same details as the no-pickup sheet: phone, campaign, buyer, reason, agent name, and date. Saving it blocks that buyer for this number.
        </p>
      </div>
      <div className="kukie-card p-8 md:p-10 max-w-2xl border border-white/90">
        {error && <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone" required>
              <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" required />
            </Field>
            <Field label="Date" required>
              <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Agent Name" required>
              <input className={inputClass} value={agentName} onChange={(e) => setAgentName(e.target.value)} required />
            </Field>
            <Field label="Closer Name" required>
              <input
                className={inputClass}
                value={closerName}
                onChange={(e) => {
                  setCloserNameEdited(true);
                  setCloserName(e.target.value);
                }}
                required
              />
            </Field>
          </div>
          <Field label="Campaign" required>
            <select className={inputClass} value={campaignId} onChange={(e) => setCampaignId(e.target.value)} required>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Buyer" required>
            <select className={inputClass} value={buyerId} onChange={(e) => setBuyerId(e.target.value)} required>
              <option value="">Select the buyer</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>{buyer.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Reason" required>
            <textarea className={inputClass} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="No answer, offices closed, no target..." required />
          </Field>
          <button type="submit" disabled={loading} className="btn-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save no pickup"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputClass = "w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}
