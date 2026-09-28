"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Plus, MoreHorizontal, Loader2, X, Trash2, Edit3, ExternalLink, Copy, Check } from "lucide-react";

export function RtbApisView() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any | null>(null);

  // Form states matching Screenshots 3, 11, 12, 13, 14
  const [name, setName] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [provider, setProvider] = useState("ringba");
  const [status, setStatus] = useState("ENABLED");
  const [method, setMethod] = useState("POST");
  const [mode, setMode] = useState("RTB");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  // Provider specific extra inputs
  const [rtbId, setRtbId] = useState("");
  const [trafficSourceId, setTrafficSourceId] = useState("");
  const [trackdriveNumber, setTrackdriveNumber] = useState("");
  const [pingEndpoint, setPingEndpoint] = useState("");
  const [postEndpoint, setPostEndpoint] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [providerCampaignId, setProviderCampaignId] = useState("");

  // Parameters list
  const [params, setParams] = useState<{ key: string; value: string }[]>([
    { key: "caller_number", value: "{caller_number}" },
    { key: "caller_zip", value: "{caller_zip}" },
    { key: "caller_state", value: "{caller_state}" },
    { key: "placement_id", value: "{placement_id}" },
  ]);

  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [confRes, buyRes, campRes] = await Promise.all([
        apiRequest<{ configs: any[] }>("/api/configs"),
        apiRequest<{ buyers: any[] }>("/api/buyers"),
        apiRequest<{ campaigns: any[] }>("/api/campaigns"),
      ]);
      setConfigs(confRes.configs);
      setBuyers(buyRes.buyers);
      setCampaigns(campRes.campaigns);
    } catch (err) {
      console.error("Failed to load configs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update BaseURL and preview when provider/rtbId changes
  useEffect(() => {
    if (provider === "ringba" && rtbId) {
      setBaseUrl(`https://rtb.ringba.com/v1/production/${rtbId}.json`);
    } else if (provider === "retreaver" && !baseUrl) {
      setBaseUrl("https://rtb.retreaver.com/rtbs.json");
    } else if (provider === "trackdrive" && pingEndpoint) {
      setBaseUrl(pingEndpoint);
    } else if (provider === "intelhouse" && pingEndpoint) {
      setBaseUrl(pingEndpoint);
    }

    // Compute live generated URL preview
    const queryParts = params
      .filter((p) => p.key)
      .map((p) => `${p.key}=${encodeURIComponent(p.value)}`);
    if (apiKey) queryParts.push(`key=${encodeURIComponent(apiKey)}`);

    const currentBase =
      provider === "ringba" && rtbId
        ? `https://rtb.ringba.com/v1/production/${rtbId}.json`
        : baseUrl || "https://rtb.endpoint.com/v1";

    const preview = queryParts.length > 0 ? `${currentBase}?${queryParts.join("&")}` : currentBase;
    setGeneratedPreviewUrl(preview);
  }, [provider, rtbId, pingEndpoint, baseUrl, apiKey, params]);

  const openCreateModal = () => {
    setEditingConfig(null);
    setName("");
    setBuyerId(buyers[0]?.id || "");
    setCampaignId(campaigns[0]?.id || "");
    setProvider("ringba");
    setStatus("ENABLED");
    setMethod("POST");
    setMode("RTB");
    setBaseUrl("https://rtb.ringba.com/v1/production/94aac31aff6849429a65452f6318e344.json");
    setApiKey("rtb_979hE48dYkmLzCTi2ucDCBl0x0Conueo");
    setRtbId("94aac31aff6849429a65452f6318e344");
    setTrafficSourceId("");
    setTrackdriveNumber("");
    setPingEndpoint("");
    setPostEndpoint("");
    setPublisherId("");
    setProviderCampaignId("");
    setParams([
      { key: "caller_number", value: "{caller_number}" },
      { key: "caller_zip", value: "{caller_zip}" },
      { key: "caller_state", value: "{caller_state}" },
      { key: "placement_id", value: "{placement_id}" },
    ]);
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (c: any) => {
    setEditingConfig(c);
    setName(c.name);
    setBuyerId(c.buyerId || "");
    setCampaignId(c.campaignId || "");
    setProvider(c.provider || "generic");
    setStatus(c.status || "ENABLED");
    setMethod(c.method || "POST");
    setMode(c.mode || "RTB");
    setBaseUrl(c.baseUrl || "");
    setApiKey(c.apiKey || "");

    const extra = c.extra || {};
    setRtbId(extra.rtbId || "");
    setTrafficSourceId(extra.trafficSourceId || "");
    setTrackdriveNumber(extra.trackdriveNumber || "");
    setPingEndpoint(extra.pingEndpoint || "");
    setPostEndpoint(extra.postEndpoint || "");
    setPublisherId(extra.publisherId || "");
    setProviderCampaignId(extra.campaignId || "");

    if (Array.isArray(c.params) && c.params.length > 0) {
      setParams(c.params);
    } else {
      setParams([
        { key: "caller_number", value: "{caller_number}" },
        { key: "caller_zip", value: "{caller_zip}" },
        { key: "caller_state", value: "{caller_state}" },
        { key: "placement_id", value: "{placement_id}" },
      ]);
    }

    setError(null);
    setShowModal(true);
  };

  const handleAddParam = () => {
    setParams([...params, { key: "", value: "" }]);
  };

  const handleRemoveParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const handleParamChange = (index: number, field: "key" | "value", val: string) => {
    const updated = [...params];
    updated[index][field] = val;
    setParams(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!buyerId) {
      setError("Please select a buyer");
      return;
    }

    setSubmitting(true);
    setError(null);

    const extra: Record<string, any> = {};
    if (rtbId) extra.rtbId = rtbId;
    if (trafficSourceId) extra.trafficSourceId = trafficSourceId;
    if (trackdriveNumber) extra.trackdriveNumber = trackdriveNumber;
    if (pingEndpoint) extra.pingEndpoint = pingEndpoint;
    if (postEndpoint) extra.postEndpoint = postEndpoint;
    if (publisherId) extra.publisherId = publisherId;
    if (providerCampaignId) extra.campaignId = providerCampaignId;

    const payload = {
      name: name.trim(),
      buyerId,
      campaignId: campaignId || null,
      provider,
      method,
      mode,
      status,
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      params: params.filter((p) => p.key.trim()),
      extra,
    };

    try {
      if (editingConfig) {
        await apiRequest(`/api/configs/${editingConfig.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/api/configs", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save configuration");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete RTB configuration "${name}"?`)) return;
    try {
      await apiRequest(`/api/configs/${id}`, { method: "DELETE" });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header with Kukie.io aesthetic */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <span className="font-mono text-xs font-bold">&lt;/&gt;</span>
            </div>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
              RTB API PROTOCOLS
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            RTB APIs & Endpoints
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build and manage buyer endpoints, URL parameters, tokens, and response mapping.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs tracking-wide uppercase font-bold"
        >
          <Plus className="w-4 h-4" />
          <span>New RTB API</span>
        </button>
      </div>

      {/* Main Table with exact columns required by prompt:
          Name, Buyer, Provider, Campaign, Method, Mode, Base URL, Built URL, API Key, Status, Success */}
      <div className="kukie-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Buyer</th>
                <th className="py-3.5 px-3">Provider</th>
                <th className="py-3.5 px-4">Campaign</th>
                <th className="py-3.5 px-3">Method</th>
                <th className="py-3.5 px-3">Mode</th>
                <th className="py-3.5 px-4">Base URL</th>
                <th className="py-3.5 px-4">Built URL</th>
                <th className="py-3.5 px-3">API Key</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Success</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading configurations...
                  </td>
                </tr>
              ) : configs.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No RTB configurations created yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;New RTB API&quot; to configure a buyer endpoint.</p>
                  </td>
                </tr>
              ) : (
                configs.map((cfg) => {
                  const isEnabled = cfg.status === "ENABLED";
                  return (
                    <tr key={cfg.id} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {cfg.name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-semibold whitespace-nowrap">
                        {cfg.buyerName}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="capitalize px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold text-[10px]">
                          {cfg.provider}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {cfg.campaignName}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-700 text-[11px] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60">
                          {cfg.method}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {cfg.mode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 max-w-[140px] truncate font-mono text-[11px] text-slate-500" title={cfg.baseUrl}>
                        {cfg.baseUrl}
                      </td>
                      <td className="py-3.5 px-4 max-w-[220px] truncate font-mono text-[11px] text-blue-600 font-medium" title={cfg.builtUrl}>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{cfg.builtUrl}</span>
                          <button
                            onClick={() => copyToClipboard(cfg.builtUrl, cfg.id)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg shrink-0 transition-colors"
                            title="Copy built URL"
                          >
                            {copiedId === cfg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {cfg.apiKeyMasked || "—"}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isEnabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {isEnabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-800 font-bold whitespace-nowrap">
                        {cfg.successRate?.toFixed(1) || "0.0"}%
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(cfg)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit configuration"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cfg.id, cfg.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
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

      {/* RTB Configuration Modal with Kukie style */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-popover overflow-hidden border border-white/80 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    &lt;/&gt;
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                    ENDPOINT BUILDER
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {editingConfig ? "Edit RTB configuration" : "New RTB configuration"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign a buyer to a campaign and configure URL parameters and authentication.
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
              <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. BD12 - Home Insurance"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buyer
                  </label>
                  <select
                    value={buyerId}
                    onChange={(e) => setBuyerId(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-700"
                  >
                    <option value="">Select Buyer</option>
                    {buyers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Priority {b.priority})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campaign
                  </label>
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-700"
                  >
                    <option value="">No campaign</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                  <option value="ringba">Ringba</option>
                  <option value="retreaver">Retreaver</option>
                  <option value="trackdrive">TrackDrive</option>
                  <option value="intelhouse">IntelHouse</option>
                  <option value="ringfuel">Ringfuel</option>
                  <option value="callgrid">Call Grid</option>
                  <option value="generic">Generic (manual endpoint + parameters)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Selecting a provider routes this buyer's requests through its dedicated adapter
                  (request format + acceptance logic).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-700"
                  >
                    <option value="ENABLED">Enabled</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all text-slate-700"
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                  </select>
                </div>
              </div>

              {/* Provider-specific inputs */}
              {provider === "ringba" && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      RTB ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 94aac31aff6849429a65452f6318e344"
                      value={rtbId}
                      onChange={(e) => setRtbId(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Endpoint auto-generated: https://rtb.ringba.com/v1/production/{rtbId || "<RTB_ID>"}.json
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank to keep existing key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {provider === "trackdrive" && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Traffic Source ID
                      </label>
                      <input
                        type="text"
                        placeholder="1008"
                        value={trafficSourceId}
                        onChange={(e) => setTrafficSourceId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        TrackDrive Number
                      </label>
                      <input
                        type="text"
                        placeholder="+18449012076"
                        value={trackdriveNumber}
                        onChange={(e) => setTrackdriveNumber(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ping Endpoint
                    </label>
                    <input
                      type="text"
                      placeholder="https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/ping/..."
                      value={pingEndpoint}
                      onChange={(e) => setPingEndpoint(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Post Endpoint
                    </label>
                    <input
                      type="text"
                      placeholder="https://uhk-networks-llc.trackdrive.com/api/v1/inbound_webhooks/post/..."
                      value={postEndpoint}
                      onChange={(e) => setPostEndpoint(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {provider === "retreaver" && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Endpoint URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://rtb.retreaver.com/rtbs.json"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="text"
                      placeholder="Leave blank to keep existing key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {provider === "intelhouse" && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Publisher ID
                      </label>
                      <input
                        type="text"
                        placeholder="2d20bc90-9b7b-40da-bc3f-edfa9fe4bedb"
                        value={publisherId}
                        onChange={(e) => setPublisherId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Campaign ID
                      </label>
                      <input
                        type="text"
                        placeholder="f10dd531-c327-4e4a-9226-c236d32ad860"
                        value={providerCampaignId}
                        onChange={(e) => setProviderCampaignId(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ping Endpoint
                    </label>
                    <input
                      type="text"
                      placeholder="https://api.call.intelhouse.net/v1/rtb/ping"
                      value={pingEndpoint}
                      onChange={(e) => setPingEndpoint(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {provider === "generic" && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Base URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      API Key
                    </label>
                    <input
                      type="text"
                      placeholder="API Key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Parameters List matching Screenshot 3 & 11 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Parameters</label>
                  <button
                    type="button"
                    onClick={handleAddParam}
                    className="text-[11px] font-semibold text-slate-900 hover:text-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add parameter</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {params.map((param, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="key"
                        value={param.key}
                        onChange={(e) => handleParamChange(index, "key", e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                      <input
                        type="text"
                        placeholder="value"
                        value={param.value}
                        onChange={(e) => handleParamChange(index, "value", e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveParam(index)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated URL Box matching Screenshot 11 */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 block mb-1">
                  Generated URL Preview
                </span>
                <p className="font-mono text-[11px] text-slate-800 break-all bg-white p-3 rounded-lg border border-slate-200/80">
                  {generatedPreviewUrl}
                </p>
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
                  <span>{editingConfig ? "Save Changes" : "Create Configuration"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
