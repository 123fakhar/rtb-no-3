"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { putCache, takeCache } from "@/lib/tabCache";
import { Plus, MoreHorizontal, Loader2, X, Check, CheckCircle2, XCircle } from "lucide-react";

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<any[]>(() => takeCache<any[]>("campaigns") ?? []);
  const [loading, setLoading] = useState(() => takeCache("campaigns") == null);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [campaignConfigs, setCampaignConfigs] = useState<any[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCampaigns = async () => {
    const cached = takeCache<any[]>("campaigns");
    if (cached) setCampaigns(cached);
    else setLoading(true);
    try {
      const res = await apiRequest<{ campaigns: any[] }>("/api/campaigns");
      setCampaigns(res.campaigns);
      putCache("campaigns", res.campaigns);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await apiRequest("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          vertical: vertical.trim(),
          description: description.trim(),
          active: true,
        }),
      });
      setShowCreate(false);
      setName("");
      setVertical("");
      setDescription("");
      await loadCampaigns();
    } catch (err: any) {
      setFormError(err?.message || "Could not create campaign");
    } finally {
      setSaving(false);
    }
  };

  const openConfigureModal = async (c: any) => {
    setSelectedCampaign(c);
    setLoadingConfigs(true);
    try {
      const res = await apiRequest<{ configs: any[] }>("/api/configs");
      const matched = res.configs.filter((cfg) => cfg.campaignId === c.id);
      setCampaignConfigs(matched);
    } catch (err) {
      console.error("Failed to load campaign configs:", err);
    } finally {
      setLoadingConfigs(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold">🎯</span>
            </div>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
              VERTICAL DIRECTORY
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Campaign Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Create a campaign vertical, then assign buyer endpoints to it.
          </p>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setShowCreate(true);
          }}
          className="btn-primary inline-flex items-center gap-1.5 px-4 py-2.5 text-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          New campaign
        </button>
      </div>

      {/* Table inside Kukie Card */}
      <div className="kukie-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-5">Campaign Name</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">RTB Ready</th>
                <th className="py-3.5 px-4">Defaults Configured</th>
                <th className="py-3.5 px-4">Vertical Category</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No campaigns found.
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => {
                  const isActive = camp.active !== false;
                  return (
                    <tr
                      key={camp.id}
                      onClick={() => openConfigureModal(camp)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-5 font-bold text-slate-900">
                        {camp.name}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive
                              ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {isActive && <Check className="w-3 h-3" />}
                          <span>{isActive ? "Ready" : "Disabled"}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                          <Check className="w-3 h-3" />
                          <span>Predefined</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {camp.vertical}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openConfigureModal(camp);
                          }}
                          className="px-3 py-1 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4">
          <form onSubmit={createCampaign} className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-popover">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">New campaign</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <label className="block text-xs font-semibold text-slate-600">
                Name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Medicare"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Vertical
                <input
                  required
                  value={vertical}
                  onChange={(e) => setVertical(e.target.value)}
                  placeholder="Insurance"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </label>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-xs disabled:opacity-50">
                {saving ? "Saving..." : "Create campaign"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Configure Campaign Modal matching Screenshot 2 */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-popover overflow-hidden border border-slate-200 my-8">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-serif">
                  Configure campaign
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedCampaign.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
              {/* General section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  General
                </h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                      Campaign Name
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {selectedCampaign.name}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {selectedCampaign.description || "Lead generation and call transfers."}
                    </p>
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-900 text-white">
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* Configuration Status */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
                  Configuration Status
                </h4>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 text-[11px]">
                  <div>
                    <span className="text-slate-500">Endpoint: </span>
                    <span className="font-semibold text-slate-800">Configured</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Provider: </span>
                    <span className="font-semibold text-slate-800">Configured</span>
                  </div>
                  <div>
                    <span className="text-slate-500">API Key: </span>
                    <span className="font-semibold text-slate-800">Configured</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Parameters: </span>
                    <span className="font-semibold text-slate-800">Configured</span>
                  </div>
                  <div>
                    <span className="text-slate-500">RTB Complete: </span>
                    <span className="font-semibold text-slate-800">Yes</span>
                  </div>
                  <div>
                    <span className="text-slate-500">RTB Ready: </span>
                    <span className="font-semibold text-emerald-600">Yes</span>
                  </div>
                </div>
              </div>

              {/* Assigned Buyers List */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Assigned Buyers ({campaignConfigs.length})
                </h4>
                <p className="text-[11px] text-slate-500 mb-3">
                  When one or more buyers are assigned, leads are auctioned across them using each
                  buyer's RTB configuration below.
                </p>

                {loadingConfigs ? (
                  <div className="py-6 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-600" />
                  </div>
                ) : campaignConfigs.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    No buyers currently assigned to this campaign.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {campaignConfigs.map((cfg) => (
                      <div
                        key={cfg.id}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{cfg.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="capitalize text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {cfg.provider}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                              Enabled
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 truncate">
                          {cfg.baseUrl || "https://rtb.endpoint"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedCampaign(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-medium hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
