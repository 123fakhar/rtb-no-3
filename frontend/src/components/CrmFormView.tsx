"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Loader2, CheckCircle2 } from "lucide-react";

interface CrmFormViewProps {
  onSuccess?: () => void;
}

export function CrmFormView({ onSuccess }: CrmFormViewProps) {
  const [fronterName, setFronterName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerZip, setCustomerZip] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [did, setDid] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [comment, setComment] = useState("");

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ campaigns: any[] }>("/api/campaigns")
      .then((res) => {
        setCampaigns(res.campaigns);
        if (res.campaigns.length > 0) {
          setCampaignId(res.campaigns[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fronterName.trim()) {
      setError("Fronter's Name is required");
      return;
    }
    if (!customerName.trim()) {
      setError("Customer Name is required");
      return;
    }
    if (!customerNumber.trim()) {
      setError("Customer Number is required");
      return;
    }
    if (!customerZip.trim()) {
      setError("Customer ZIP code is required");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/api/crm", {
        method: "POST",
        body: JSON.stringify({
          fronterName: fronterName.trim(),
          customerName: customerName.trim(),
          customerNumber: customerNumber.trim(),
          customerZip: customerZip.trim(),
          customerEmail: customerEmail.trim(),
          did: did.trim(),
          campaignId: campaignId || null,
          comment: comment.trim(),
        }),
      });

      setSubmitted(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to submit CRM entry");
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 font-serif">
          Submission Received
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Your CRM entry has been submitted and is currently marked as{" "}
          <span className="font-semibold text-amber-600">Pending</span> awaiting admin review.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 animate-in fade-in duration-150">
      <div className="mb-8">
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
          CUSTOMER RELATIONSHIP MANAGEMENT
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif">
          CRM Submission
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Submit customer details with fronter attribution, DID, and campaign vertical. Submissions
          are reviewed and approved by administrators.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-8 max-w-2xl">
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fronter's Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={fronterName}
                onChange={(e) => setFronterName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Robert Davis"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. 7314787322"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                First 3 digits are automatically hidden for agent privacy.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer ZIP Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 38382"
                value={customerZip}
                onChange={(e) => setCustomerZip(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Customer Email
              </label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                DID (Inbound Direct Inward Dial)
              </label>
              <input
                type="text"
                placeholder="e.g. 844-901-2076"
                value={did}
                onChange={(e) => setDid(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Campaign Vertical <span className="text-red-500">*</span>
            </label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-800"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.vertical})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Comment / Notes
            </label>
            <textarea
              rows={3}
              placeholder="Customer requirements, quote details, policy notes..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit CRM Lead</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
