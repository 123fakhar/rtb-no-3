"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  vertical: string;
  active: boolean;
  children?: { id: string; name: string }[];
}

interface Member {
  id: string;
  name: string;
  email: string;
  active: boolean;
  inCampaign: boolean;
}

export function ManagerCampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [vertical, setVertical] = useState("");
  const [closerName, setCloserName] = useState("");
  const [closerEmail, setCloserEmail] = useState("");
  const [closerPassword, setCloserPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = async () => {
      const res = await apiRequest<{ campaigns: Campaign[] }>("/api/campaigns?scope=team");
    setCampaigns(res.campaigns);
    setSelectedId((current) => current || res.campaigns.find((item) => item.name === "Auto Insurance")?.id || res.campaigns[0]?.id || "");
  };

  useEffect(() => {
    loadCampaigns()
      .catch((err) => setError(err.message || "Could not load campaigns"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    apiRequest<{ members: Member[] }>(`/api/campaigns/${selectedId}/members`)
      .then((res) => setMembers(res.members))
      .catch((err) => setError(err.message || "Could not load closers"));
  }, [selectedId]);

  const createCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiRequest("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), vertical: vertical.trim() || name.trim(), active: true, team: true }),
      });
      setName("");
      setVertical("");
      await loadCampaigns();
    } catch (err: any) {
      setError(err.message || "Could not create campaign");
    }
  };

  const toggle = async (member: Member) => {
    setSavingId(member.id);
    try {
      await apiRequest(`/api/campaigns/${selectedId}/members/${member.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !member.active }),
      });
      setMembers((current) =>
        current.map((item) => (item.id === member.id ? { ...item, active: !item.active, inCampaign: true } : item))
      );
    } catch (err: any) {
      setError(err.message || "Could not update closer");
    } finally {
      setSavingId(null);
    }
  };

  const createCloser = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await apiRequest("/api/users/closers", {
        method: "POST",
        body: JSON.stringify({
          name: closerName.trim(),
          email: closerEmail.trim(),
          password: closerPassword,
          campaignId: selectedId || undefined,
        }),
      });
      setCloserName("");
      setCloserEmail("");
      setCloserPassword("");
      if (selectedId) {
        const res = await apiRequest<{ members: Member[] }>(`/api/campaigns/${selectedId}/members`);
        setMembers(res.members);
      }
    } catch (err: any) {
      setError(err.message || "Could not create closer");
    }
  };

  const activeCount = members.filter((member) => member.active).length;
  const selected = campaigns.find((campaign) => campaign.id === selectedId);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Campaigns</h1>
        <p className="text-xs text-slate-500 mt-1">Create a campaign and turn closers on or off inside it.</p>
      </div>
      {error && <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs">{error}</div>}
      <form onSubmit={createCampaign} className="kukie-card-static p-4 flex flex-col md:flex-row gap-2">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Campaign name, for example ACA" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs" required />
        <input value={vertical} onChange={(event) => setVertical(event.target.value)} placeholder="Vertical" className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs" />
        <button className="btn-primary px-4 py-2 text-xs font-bold rounded-xl">Create campaign</button>
      </form>
      <form onSubmit={createCloser} className="kukie-card-static p-4 grid grid-cols-1 md:grid-cols-4 gap-2">
        <input value={closerName} onChange={(event) => setCloserName(event.target.value)} placeholder="New closer name" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" required />
        <input value={closerEmail} onChange={(event) => setCloserEmail(event.target.value)} placeholder="Email" type="email" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" required />
        <input value={closerPassword} onChange={(event) => setCloserPassword(event.target.value)} placeholder="Password (8+ characters)" type="password" className="px-3 py-2 rounded-xl border border-slate-200 text-xs" required minLength={8} />
        <button className="btn-primary px-4 py-2 text-xs font-bold rounded-xl">Create closer in this campaign</button>
      </form>
      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                onClick={() => setSelectedId(campaign.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold ${selectedId === campaign.id ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-700"}`}
              >
                {campaign.name}
                {campaign.children && campaign.children.length > 0 && (
                  <span className="block text-[10px] font-medium opacity-70 mt-1">{campaign.children.map((child) => child.name).join(", ")}</span>
                )}
              </button>
            ))}
          </div>
          <div className="kukie-card-static overflow-hidden">
            <div className="px-4 py-3 text-xs text-slate-500 border-b border-slate-100">
              {activeCount} active closers in {selected?.name || "this campaign"}
              {selected?.children && selected.children.length > 0 ? ` · ${selected.children.map((child) => child.name).join(", ")}` : ""}
            </div>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Closer</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">In campaign</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{member.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{member.email}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(member)}
                        disabled={savingId === member.id}
                        className={`px-3 py-1 rounded-lg font-bold ${member.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {member.active ? "Active" : "Inactive"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
