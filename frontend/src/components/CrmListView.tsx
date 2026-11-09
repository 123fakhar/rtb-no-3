"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Plus,
} from "lucide-react";

interface CrmListViewProps {
  onNewSubmissionClick?: () => void;
  title?: string;
}

export function CrmListView({
  onNewSubmissionClick,
  title = "CRM Submissions",
}: CrmListViewProps) {
  const { user, isAdmin } = useAuth();
  const seesPhone = user?.role === "ADMIN" || user?.role === "MANAGER";
  const [entries, setEntries] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: "1",
        limit: "50",
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await apiRequest<{ entries: any[] }>(`/api/crm?${q.toString()}`);
      setEntries(res.entries);
    } catch (err) {
      console.error("Failed to load CRM entries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [search, statusFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    apiRequest<{ buyers: { id: string; name: string }[] }>("/api/buyers")
      .then((res) => setBuyers(res.buyers.map((buyer) => ({ id: buyer.id, name: buyer.name }))))
      .catch(console.error);
  }, [isAdmin]);

  const handleAssignBuyer = async (id: string, buyerId: string) => {
    if (!buyerId) return;
    setActionLoadingId(id);
    try {
      await apiRequest(`/api/crm/${id}/buyer`, {
        method: "PATCH",
        body: JSON.stringify({ buyerId }),
      });
      await loadEntries();
    } catch (err: any) {
      alert(err.message || "Failed to save the buyer");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    setActionLoadingId(id);
    try {
      await apiRequest(`/api/crm/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadEntries();
    } catch (err: any) {
      alert(err.message || "Failed to update review status");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-600 text-white flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold font-mono">QA</span>
            </div>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
              CRM QUALITY ASSURANCE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? "All submissions with full phone numbers. Only an admin can accept or reject a sale."
              : seesPhone
              ? "Every closer's sales. You can see the numbers. Only an admin can accept or reject a sale."
              : "Your customer submissions. First 3 digits are masked. Revenue is hidden."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, agent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white border border-slate-200/90 text-xs rounded-xl pl-9 pr-3 py-2.5 w-52 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-200/90 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending (Yellow)</option>
            <option value="APPROVED">Approved (Green)</option>
            <option value="REJECTED">Rejected (Red)</option>
          </select>

          <button
            onClick={loadEntries}
            className="p-2.5 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onNewSubmissionClick && (
            <button
              onClick={onNewSubmissionClick}
              className="btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-xs tracking-wider uppercase font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* CRM Submissions Table */}
      <div className="kukie-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-4">Agent Name</th>
                <th className="py-3.5 px-4">Customer Name</th>
                <th className="py-3.5 px-4">
                  Customer Phone
                  {!seesPhone && <span className="ml-1 text-[10px] text-blue-600 font-bold">(Masked)</span>}
                </th>
                <th className="py-3.5 px-3">ZIP</th>
                <th className="py-3.5 px-4">DID</th>
                <th className="py-3.5 px-4">Campaign &amp; Vertical</th>
                <th className="py-3.5 px-4">Buyer</th>
                <th className="py-3.5 px-4">Closer</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-4">Comment</th>
                <th className="py-3.5 px-4 text-right">{isAdmin ? "Admin QA Actions" : "Submitted"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading CRM leads...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No CRM records found</p>
                    <p className="text-xs text-slate-400 mt-1">Submit a customer record to begin QA review.</p>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const isPending = entry.status === "PENDING";
                  const isApproved = entry.status === "APPROVED";
                  const isRejected = entry.status === "REJECTED";
                  const isActionLoading = actionLoadingId === entry.id;

                  return (
                    <tr key={entry.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {entry.fronterName}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        {entry.customerName}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        <span
                          className={
                            seesPhone
                              ? "text-blue-600"
                              : "text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200"
                          }
                        >
                          {entry.customerNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">{entry.customerZip}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {entry.did || "—"}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-bold text-slate-800 block">
                          {entry.campaignName}
                        </span>
                        <span className="text-[10px] text-slate-400">{entry.vertical}</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {entry.buyerId ? (
                          <span className="font-semibold text-slate-800">{entry.buyerName}</span>
                        ) : isAdmin ? (
                          <select
                            defaultValue=""
                            disabled={isActionLoading}
                            onChange={(e) => handleAssignBuyer(entry.id, e.target.value)}
                            className="bg-white border border-amber-300 text-[11px] font-semibold rounded-lg px-2 py-1.5 text-slate-700"
                          >
                            <option value="">Choose buyer</option>
                            {buyers.map((buyer) => (
                              <option key={buyer.id} value={buyer.id}>
                                {buyer.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                            {entry.agentName.slice(0, 1)}
                          </div>
                          <span className="font-semibold text-slate-800">{entry.agentName}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 min-w-[16rem] max-w-md whitespace-normal break-words text-slate-700 text-xs">
                        {entry.comment?.trim() ? entry.comment : "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {!entry.buyerId ? (
                              <span className="text-[11px] font-semibold text-amber-700">Choose the buyer first</span>
                            ) : isPending ? (
                              <>
                                <button
                                  onClick={() => handleReview(entry.id, "APPROVED")}
                                  disabled={isActionLoading}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200/70 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReview(entry.id, "REJECTED")}
                                  disabled={isActionLoading}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200/70 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  handleReview(
                                    entry.id,
                                    isApproved ? "REJECTED" : "APPROVED"
                                  )
                                }
                                disabled={isActionLoading}
                                className="text-xs font-semibold text-slate-500 hover:text-blue-600 underline"
                              >
                                Change to {isApproved ? "Rejected" : "Approved"}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
