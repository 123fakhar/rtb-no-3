"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Plus, MoreHorizontal, Loader2, X, Trash2, Edit3, ArrowUpDown } from "lucide-react";

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
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-150">
      {/* Header matching Screenshot 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            BUYER MANAGEMENT
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif">
            Buyers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage lead buyers with priority, weight, and status for routing.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create buyer</span>
        </button>
      </div>

      {/* Table container matching Screenshot 4 */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500">
                <th className="py-3.5 px-5">Buyer name</th>
                <th className="py-3.5 px-5">Company</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">
                  <div className="flex items-center gap-1">
                    <span>Priority</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Weight</th>
                <th className="py-3.5 px-4">Configs</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                    Loading buyers...
                  </td>
                </tr>
              ) : buyers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No buyers configured yet. Click "+ Create buyer" to add your first buyer.
                  </td>
                </tr>
              ) : (
                buyers.map((buyer) => {
                  const isActive = buyer.status === "ACTIVE";
                  return (
                    <tr key={buyer.id} className="hover:bg-slate-50/70 transition-colors group">
                      <td className="py-3.5 px-5 font-medium text-slate-900">
                        {buyer.name}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">{buyer.company || "—"}</td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-[11px]">
                          {buyer.provider || "generic"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {buyer.priority}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{buyer.weight}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500">
                        {buyer._count?.configs || 0}
                      </td>
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            isActive
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(buyer)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                            title="Edit buyer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(buyer.id, buyer.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Remove buyer"
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

      {/* Create / Edit Buyer Modal matching Screenshot 5 */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-popover overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-serif">
                  {editingBuyer ? "Edit buyer" : "Create buyer"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Basic business details. Add technical RTB endpoints, API keys, and campaign
                  assignments afterward from the RTB APIs section.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Buyer name
                </label>
                <input
                  type="text"
                  placeholder="Acme Insurance"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  placeholder="Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Provider
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-700 capitalize"
                >
                  <option value="unset">unset</option>
                  <option value="ringba">Ringba</option>
                  <option value="retreaver">Retreaver</option>
                  <option value="trackdrive">TrackDrive</option>
                  <option value="ringfuel">Ringfuel</option>
                  <option value="intelhouse">IntelHouse</option>
                  <option value="callgrid">Call Grid</option>
                  <option value="generic">Generic</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Which platform this buyer primarily integrates through. Technical endpoints/keys are set per-campaign in RTB configurations.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Lower = higher priority
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Weight
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Distribution share
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-700"
                >
                  <option value="ACTIVE">active</option>
                  <option value="INACTIVE">inactive</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingBuyer ? "Save changes" : "Create buyer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
