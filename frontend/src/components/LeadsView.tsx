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
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            LEAD MANAGEMENT
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif">
            {title}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Click any lead row to open buyer routing and real-time RTB ping execution.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
              className="bg-white border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-subtle"
            />
          </div>

          <button
            onClick={loadLeads}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 shadow-subtle transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {onNewLeadClick && (
            <button
              onClick={onNewLeadClick}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Table container matching screenshot 7 */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                <th className="py-3.5 px-5">Phone</th>
                <th className="py-3.5 px-4">ZIP</th>
                <th className="py-3.5 px-4">State</th>
                <th className="py-3.5 px-5">Campaign</th>
                <th className="py-3.5 px-5">Buyer</th>
                <th className="py-3.5 px-4">Revenue</th>
                <th className="py-3.5 px-4">Score</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                    Loading leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No leads found. Submit a new lead to start routing.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isSold = lead.status === "SOLD";
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-5 font-mono font-medium text-slate-900">
                        {lead.phone}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono">{lead.zip}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{lead.state}</td>
                      <td className="py-3.5 px-5 font-medium text-slate-800">{lead.campaign}</td>
                      <td className="py-3.5 px-5 text-slate-500 font-medium">{lead.buyer}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        ${lead.revenue?.toFixed(2) || "0.00"}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{lead.score || 85}</td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            isSold
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isSold ? "Sold" : "Submitted"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-400 text-[11px]">
                        {new Date(lead.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLead(lead.id);
                            }}
                            className="text-slate-400 hover:text-slate-700 p-1"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
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
