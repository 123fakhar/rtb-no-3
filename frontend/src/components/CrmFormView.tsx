"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader2, CheckCircle2, FileText, ArrowRight } from "lucide-react";

interface CrmFormViewProps {
  onSuccess?: () => void;
}

export function CrmFormView({ onSuccess }: CrmFormViewProps) {
  const { user } = useAuth();
  const [fronterName, setFronterName] = useState("");
  const [closerName, setCloserName] = useState(user?.name || "");
  const [closerNameEdited, setCloserNameEdited] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerZip, setCustomerZip] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [did, setDid] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [comment, setComment] = useState("");

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!closerNameEdited && user?.name) setCloserName(user.name);
  }, [user?.name, closerNameEdited]);

  useEffect(() => {
    apiRequest<{ campaigns: any[] }>("/api/campaigns")
      .then((res) => {
        setCampaigns(res.campaigns);
        if (res.campaigns.length > 0) {
          setCampaignId(res.campaigns[0].id);
        }
      })
      .catch(console.error);
    apiRequest<{ buyers: { id: string; name: string }[] }>("/api/buyers")
      .then((res) => setBuyers(res.buyers.map((buyer) => ({ id: buyer.id, name: buyer.name }))))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fronterName.trim()) {
      setError("Agent name is required");
      return;
    }
    if (!closerName.trim()) {
      setError("Closer name is required");
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
    if (!buyerId) {
      setError("Choose the buyer this sale was made to");
      return;
    }

    setLoading(true);
    try {
      await apiRequest("/api/crm", {
        method: "POST",
        body: JSON.stringify({
          fronterName: fronterName.trim(),
          closerName: closerName.trim(),
          customerName: customerName.trim(),
          customerNumber: customerNumber.trim(),
          customerZip: customerZip.trim(),
          customerEmail: customerEmail.trim(),
          did: did.trim(),
          campaignId: campaignId || null,
          buyerId,
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
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          Submission Received
        </h2>
        <p className="text-sm text-slate-500 mt-2">
          Your CRM entry has been submitted and is currently marked as{" "}
          <span className="font-bold text-amber-600">Pending</span> awaiting admin review.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
            LEAD VERIFICATION
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
          CRM Lead Submission
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          The agent name is the person who opened the lead. Type your own name as the closer. That name is what managers and admins see on sales stats. Choose the buyer this sale belongs to. After an admin accepts or rejects it, this number cannot be sent to that buyer again.
        </p>
      </div>

      <div className="kukie-card p-8 md:p-10 max-w-2xl border border-white/90">
        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Agent Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Name of the agent"
                value={fronterName}
                onChange={(e) => setFronterName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Closer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={closerName}
                onChange={(e) => {
                  setCloserNameEdited(true);
                  setCloserName(e.target.value);
                }}
                required
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Robert Davis"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Customer Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. 7314787322"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                First 3 digits are automatically masked for agent accounts.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Customer ZIP Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 38382"
                value={customerZip}
                onChange={(e) => setCustomerZip(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Customer Email
              </label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                DID (Direct Inward Dial)
              </label>
              <input
                type="text"
                placeholder="e.g. 800-555-0199"
                value={did}
                onChange={(e) => setDid(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Buyer <span className="text-rose-500">*</span>
            </label>
            <select
              value={buyerId}
              onChange={(e) => setBuyerId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
            >
              <option value="">Select the buyer</option>
              {buyers.map((buyer) => (
                <option key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Campaign Vertical <span className="text-rose-500">*</span>
            </label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.vertical})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Comment / QA Notes
            </label>
            <textarea
              rows={3}
              placeholder="Customer requirements, quote details, policy notes..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full sm:w-auto px-6 py-2.5 text-xs tracking-wider uppercase font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting Entry...</span>
                </>
              ) : (
                <>
                  <span>Submit to CRM</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
