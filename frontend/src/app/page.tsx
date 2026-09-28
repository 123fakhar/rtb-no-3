"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { DashboardView } from "@/components/DashboardView";
import { CampaignsView } from "@/components/CampaignsView";
import { RtbApisView } from "@/components/RtbApisView";
import { BuyersView } from "@/components/BuyersView";
import { LeadsView } from "@/components/LeadsView";
import { SubmitLeadView } from "@/components/SubmitLeadView";
import { LeadBuyerRouting } from "@/components/LeadBuyerRouting";
import { TransactionsView } from "@/components/TransactionsView";
import { CrmListView } from "@/components/CrmListView";
import { CrmFormView } from "@/components/CrmFormView";
import { CrmAnalyticsView } from "@/components/CrmAnalyticsView";
import { UsersView } from "@/components/UsersView";
import { BrandLogo } from "@/components/BrandLogo";
import { Loader2, Shield, User, ArrowRight } from "lucide-react";

export default function HomePage() {
  const { user, token, loading, login, switchUserFast, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [selectedRoutingLeadId, setSelectedRoutingLeadId] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("admin@rtb.local");
  const [loginPassword, setLoginPassword] = useState("admin12345");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sync default tab on role switch
  React.useEffect(() => {
    if (user?.role === "AGENT") {
      setCurrentTab("submit-lead");
    } else if (user?.role === "ADMIN") {
      setCurrentTab("dashboard");
    }
  }, [user?.role]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err: any) {
      setLoginError(err.message || "Invalid credentials");
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
          <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
            Loading RTB Portal...
          </span>
        </div>
      </div>
    );
  }

  // Not logged in: Show login page with instant demo accounts
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-popover p-8 max-w-md w-full">
          <BrandLogo subtitle="ENTERPRISE PORTAL ACCESS" />

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loginLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Sign In to Portal</span>
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block text-center mb-3">
              One-Click Quick Login
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchUserFast("ADMIN")}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-slate-700" />
                <span>Admin Demo</span>
              </button>
              <button
                type="button"
                onClick={() => switchUserFast("AGENT", "agent1@rtb.local")}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-700" />
                <span>Agent 1 Demo</span>
              </button>
            </div>
            <div className="mt-2 text-center">
              <span className="text-[10px] text-slate-400">
                25+ active agents provisioned in system (agent1@rtb.local to agent25@rtb.local)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto min-h-screen pb-16">
        {/* Admin Views */}
        {isAdmin && currentTab === "dashboard" && <DashboardView />}
        {isAdmin && currentTab === "campaigns" && <CampaignsView />}
        {isAdmin && currentTab === "apis" && <RtbApisView />}
        {isAdmin && currentTab === "buyers" && <BuyersView />}
        {isAdmin && currentTab === "leads" && (
          <LeadsView
            title="All Network Leads"
            onSelectLead={(leadId) => setSelectedRoutingLeadId(leadId)}
            onNewLeadClick={() => setCurrentTab("submit-lead")}
          />
        )}
        {isAdmin && currentTab === "transactions" && <TransactionsView />}
        {isAdmin && currentTab === "crm" && (
          <CrmListView
            title="CRM Lead Submissions"
            onNewSubmissionClick={() => setCurrentTab("submit-crm")}
          />
        )}
        {isAdmin && currentTab === "crm-analytics" && <CrmAnalyticsView />}
        {isAdmin && currentTab === "users" && <UsersView />}

        {/* Agent Views */}
        {currentTab === "submit-lead" && (
          <SubmitLeadView
            onSuccess={(newLeadId) => {
              setSelectedRoutingLeadId(newLeadId);
              setCurrentTab(isAdmin ? "leads" : "my-leads");
            }}
          />
        )}
        {currentTab === "my-leads" && (
          <LeadsView
            title="My Leads"
            onSelectLead={(leadId) => setSelectedRoutingLeadId(leadId)}
            onNewLeadClick={() => setCurrentTab("submit-lead")}
          />
        )}
        {currentTab === "submit-crm" && (
          <CrmFormView
            onSuccess={() => {
              setCurrentTab(isAdmin ? "crm" : "my-crm");
            }}
          />
        )}
        {currentTab === "my-crm" && (
          <CrmListView
            title="My CRM Submissions"
            onNewSubmissionClick={() => setCurrentTab("submit-crm")}
          />
        )}
      </main>

      {/* RTB Lead Buyer Routing View matching Screenshot 8, 9, 10 */}
      {selectedRoutingLeadId && (
        <LeadBuyerRouting
          leadId={selectedRoutingLeadId}
          onClose={() => setSelectedRoutingLeadId(null)}
        />
      )}
    </div>
  );
}
