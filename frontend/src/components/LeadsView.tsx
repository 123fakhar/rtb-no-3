"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import {
  Search,
  ChevronRight,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Plus,
} from "lucide-react";

interface LeadsViewProps {
  onSelectLead: (leadId: string) => void;
  onNewLeadClick?: () => void;
  title?: string;
}

export function LeadsView({
  onSelectLead,
  onNewLeadClick,
  title = "My Leads",
}: LeadsViewProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(page),
        limit: "25",
        ...(search ? { search } : {}),
      });
      const res = await apiRequest<{ leads: any[]; pagination: any }>(`/api/leads?${q.toString()}`);
      setLeads(res.leads);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [page, search]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold font-mono">⚡</span>
            </div>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
              CALL INTAKE &amp; ROUTING
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Click any lead row to launch the real-time buyer auction workspace and ping endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search phone, zip..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-slate-200/90 text-xs rounded-xl pl-9 pr-3 py-2.5 w-56 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs font-medium"
            />
          </div>

          <button
            onClick={loadLeads}
            className="p-2.5 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onNewLeadClick && (
            <button
              onClick={onNewLeadClick}
              className="btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-xs tracking-wider uppercase font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Table container inside Kukie card */}
      <div className="kukie-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-5">Caller Phone</th>
                <th className="py-3.5 px-4">ZIP</th>
                <th className="py-3.5 px-4">State</th>
                <th className="py-3.5 px-5">Campaign</th>
                <th className="py-3.5 px-5">Winning Buyer</th>
                <th className="py-3.5 px-4">Bid Revenue</th>
                <th className="py-3.5 px-4">Score</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Created At</th>
                <th className="py-3.5 px-4 text-right">Auction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No leads submitted yet</p>
                    <p className="text-xs text-slate-400 mt-1">Submit a caller from &quot;Submit Lead&quot; to test real buyer pings.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSold = lead.status === "SOLD";
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead.id)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900">
                        {lead.phone}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono font-medium">{lead.zip}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-bold">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px]">
                          {lead.state}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-slate-800">{lead.campaign || "—"}</td>
                      <td className="py-3.5 px-5 text-slate-500 font-medium">{lead.buyer || "—"}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                        ${lead.revenue?.toFixed(2) || "0.00"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{lead.score ?? "—"}</td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            isSold
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-blue-50 text-blue-700 border border-blue-200/60"
                          }`}
                        >
                          {isSold ? "Sold" : "Available"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-400 text-[11px] font-mono whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-blue-600 font-semibold text-xs">
                          <span>Route</span>
                          <ChevronRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
