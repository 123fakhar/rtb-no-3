"use client";

import React, { useState } from "react";
import { UsersView } from "./UsersView";
import { CrmListView } from "./CrmListView";
import { CrmAnalyticsView } from "./CrmAnalyticsView";

interface SettingsViewProps {
  onNewCrm: () => void;
}

const tabs = [
  { id: "team", label: "Team" },
  { id: "crm", label: "CRM" },
  { id: "crm-analytics", label: "CRM analytics" },
] as const;

export function SettingsView({ onNewCrm }: SettingsViewProps) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("team");

  return (
    <div className="animate-in fade-in duration-200">
      <div className="px-6 md:px-10 pt-8 max-w-7xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Settings</h1>
        <p className="text-xs text-slate-500 mt-1 mb-4">Team access and CRM review. Buyer endpoints live under Providers.</p>
        <div className="inline-flex items-center gap-1 bg-white/90 border border-slate-200/80 p-1 rounded-2xl">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                tab === item.id ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "team" && <UsersView />}
      {tab === "crm" && <CrmListView title="CRM Lead Submissions" onNewSubmissionClick={onNewCrm} />}
      {tab === "crm-analytics" && <CrmAnalyticsView />}
    </div>
  );
}
