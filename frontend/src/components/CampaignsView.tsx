"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Plus, MoreHorizontal, Loader2, X, Check, CheckCircle2, XCircle } from "lucide-react";

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [campaignConfigs, setCampaignConfigs] = useState<any[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ campaigns: any[] }>("/api/campaigns");
      setCampaigns(res.campaigns);
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

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
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            CAMPAIGN MANAGEMENT
          </span>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-serif">
            Campaign Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configure and activate built-in campaign templates. Campaign types are predefined by the
            system — you configure endpoints, providers, and form fields.
          </p>
        </div>

        <button
          onClick={() => {
            alert("Predefined campaign templates are ready. Configure any campaign by clicking on its row.");
          }}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Campaign</span>
        </button>
      </div>

      {/* Table matching Screenshot 1 */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                <th className="py-3.5 px-5">Campaign Name</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">RTB Provider</th>
                <th className="py-3.5 px-4">Endpoint</th>
                <th className="py-3.5 px-4">API Key</th>
                <th className="py-3.5 px-4">Parameters</th>
                <th className="py-3.5 px-4">RTB Ready</th>
                <th className="py-3.5 px-4">Last Test</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-600" />
                    Loading campaigns...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No campaigns found.
                  </td>
                </tr>
              ) : (
                campaigns.map((camp) => {
                  const isActive = camp.active !== false;
                  const isRetreaver =
                    camp.name === "Auto Insurance" ||
                    camp.name === "Bathroom" ||
                    camp.name === "Home Insurance" ||
                    camp.name === "Pest Control";
                  const providerName = isRetreaver ? "Retreaver" : "—";
                  const hasEndpoint = isRetreaver;
                  const hasApiKey = isRetreaver;
                  const isRtbReady = isActive;

                  return (
                    <tr
                      key={camp.id}
                      onClick={() => openConfigureModal(camp)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-5 font-semibold text-slate-900">
                        {camp.name}
                      </td>
                      <td className="py-3.5 px-4">
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
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {providerName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            hasEndpoint
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {hasEndpoint && <Check className="w-3 h-3" />}
                          <span>{hasEndpoint ? "Yes" : "No"}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            hasApiKey
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {hasApiKey && <Check className="w-3 h-3" />}
                          <span>{hasApiKey ? "Yes" : "No"}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-900 text-white">
                          <Check className="w-3 h-3" />
                          <span>Yes</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isRtbReady
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {isRtbReady && <Check className="w-3 h-3" />}
                          <span>{isRtbReady ? "Yes" : "No"}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        Never
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openConfigureModal(camp);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <MoreHorizontal className="w-4 h-4" />
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
                  {selectedCampaign.name} — campaign type is fixed by the system.
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
