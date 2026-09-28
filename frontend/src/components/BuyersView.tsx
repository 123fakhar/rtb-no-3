"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Plus, Loader2, X, Trash2, Edit3, ArrowUpDown, Building2 } from "lucide-react";

export function BuyersView() {
  const [buyers, setBuyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<any | null>(null);

  // Form fields matching Screenshot 5
  const [buyerName, setBuyerName] = useState("");
  const [company, setCompany] = useState("");
  const [provider, setProvider] = useState("unset");
  const [priority, setPriority] = useState(1);
  const [weight, setWeight] = useState(100);
  const [status, setStatus] = useState("ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBuyers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ buyers: any[] }>("/api/buyers");
      setBuyers(res.buyers);
    } catch (err) {
      console.error("Failed to load buyers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuyers();
  }, []);

  const openCreateModal = () => {
    setEditingBuyer(null);
    setBuyerName("");
    setCompany("");
    setProvider("unset");
    setPriority(buyers.length + 1);
    setWeight(100);
    setStatus("ACTIVE");
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (b: any) => {
    setEditingBuyer(b);
    setBuyerName(b.name);
    setCompany(b.company || "");
    setProvider(b.provider || "unset");
    setPriority(b.priority || 1);
    setWeight(b.weight || 100);
    setStatus(b.status || "ACTIVE");
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        name: buyerName.trim(),
        company: company.trim(),
        provider,
        priority: Number(priority),
        weight: Number(weight),
        status,
      };

      if (editingBuyer) {
        await apiRequest(`/api/buyers/${editingBuyer.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/buyers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      await loadBuyers();
    } catch (err: any) {
      setError(err.message || "Failed to save buyer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove buyer "${name}"? All associated configs will also be removed.`)) {
      return;
    }
    try {
      await apiRequest(`/api/buyers/${id}`, { method: "DELETE" });
      await loadBuyers();
    } catch (err: any) {
      alert(err.message || "Failed to delete buyer");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header with Kukie style */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold font-mono">#1</span>
            </div>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
              BUYER WATERFALL
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Buyer Accounts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage buyers, priority routing hierarchy, bid weights, and active distribution caps.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs tracking-wide uppercase font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>Create Buyer</span>
        </button>
      </div>

      {/* Table container */}
      <div className="kukie-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-5">Buyer Name</th>
                <th className="py-3.5 px-5">Company</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1">
                    <span>Priority Order</span>
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Weight</th>
                <th className="py-3.5 px-4">Active APIs</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading buyers...
                  </td>
                </tr>
              ) : buyers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No buyers configured yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;Create Buyer&quot; to configure your first RTB buyer.</p>
                  </td>
                </tr>
              ) : (
                buyers.map((buyer) => {
                  const isActive = buyer.status === "ACTIVE";
                  return (
                    <tr key={buyer.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="py-3.5 px-5 font-bold text-slate-900 whitespace-nowrap">
                        {buyer.name}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 font-medium">{buyer.company || "—"}</td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="capitalize px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold text-[10px]">
                          {buyer.provider || "generic"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 font-extrabold text-[11px] font-mono">
                          #{buyer.priority}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">{buyer.weight}</td>
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-500">
                        {buyer._count?.configs || 0}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {isActive ? "Active" : "Paused"}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(buyer)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit buyer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(buyer.id, buyer.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete buyer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Buyer Modal with Kukie style */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-popover overflow-hidden border border-white/80">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    #
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                    BUYER PROFILE
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingBuyer ? "Edit Buyer" : "Create Buyer"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Basic business details. Configure RTB endpoints and campaign assignments in RTB APIs.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Buyer Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Buyer D12 New"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Company
                </label>
                <input
                  type="text"
                  placeholder="e.g. Home Insurance Group"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-700 capitalize"
                >
                  <option value="unset">unset</option>
                  <option value="ringba">Ringba</option>
                  <option value="retreaver">Retreaver</option>
                  <option value="trackdrive">TrackDrive</option>
                  <option value="ringfuel">Ringfuel</option>
                  <option value="intelhouse">IntelHouse</option>
                  <option value="callgrid">Call Grid</option>
                  <option value="generic">Generic RTB</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Priority Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Lower number = higher call waterfall priority.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Weight
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    1 - 100 round-robin weight.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-700"
                >
                  <option value="ACTIVE">Active (Eligible for Pings)</option>
                  <option value="PAUSED">Paused (Skipped in Routing)</option>
                  <option value="CAPPED">Capped (Exceeded Daily Limit)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingBuyer ? "Save Changes" : "Create Buyer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
