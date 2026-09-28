"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { DashboardView } from "@/components/DashboardView";
import { AnalyticsView } from "@/components/AnalyticsView";
import { CampaignsView } from "@/components/CampaignsView";
import { BuyersView } from "@/components/BuyersView";
import { LeadsView } from "@/components/LeadsView";
import { SubmitLeadView } from "@/components/SubmitLeadView";
import { LeadBuyerRouting } from "@/components/LeadBuyerRouting";
import { TransactionsView } from "@/components/TransactionsView";
import { CrmFormView } from "@/components/CrmFormView";
import { CrmListView } from "@/components/CrmListView";
import { ProvidersView } from "@/components/ProvidersView";
import { RejectionsView } from "@/components/RejectionsView";
import { ReportsView } from "@/components/ReportsView";
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
      <div className="min-h-screen flex items-center justify-center kukie-bg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
          <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">
            Initializing RTB Platform...
          </span>
        </div>
      </div>
    );
  }

  // Not logged in: Show modern Kukie.io style login screen
  if (!token || !user) {
    return (
      <div className="min-h-screen kukie-bg flex items-center justify-center p-4">
        <div className="kukie-card p-8 sm:p-10 max-w-md w-full border border-slate-200/80">
          <BrandLogo subtitle="SECURE ENTERPRISE ACCESS" />

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Sign In to RTB Portal
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Real-time bidding, buyer routing & CRM lead distribution
            </p>
          </div>

          {loginError && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs text-center font-medium">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary w-full py-3 text-xs rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loginLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              <span>Sign In to Workspace</span>
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block text-center mb-3">
              Fast Demo Switcher
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => switchUserFast("ADMIN")}
                className="px-3.5 py-2.5 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 rounded-2xl text-xs font-bold text-slate-700 hover:text-blue-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <Shield className="w-3.5 h-3.5 text-blue-600" />
                <span>Admin Demo</span>
              </button>
              <button
                type="button"
                onClick={() => switchUserFast("AGENT", "agent1@rtb.local")}
                className="px-3.5 py-2.5 bg-slate-50 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-200 rounded-2xl text-xs font-bold text-slate-700 hover:text-blue-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Agent 1 Demo</span>
              </button>
            </div>
            <div className="mt-3 text-center">
              <span className="text-[11px] text-slate-400 font-medium">
                25 concurrent agent accounts provisioned (agent1@rtb.local - agent25@rtb.local)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen kukie-bg flex relative">
      {/* Sidebar */}
      <Sidebar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto min-h-screen pb-20 bg-[#f5f6f8]">
        <div>
          {/* Admin Views */}
          {isAdmin && currentTab === "dashboard" && (
            <DashboardView
              onOpenLead={(leadId) => setSelectedRoutingLeadId(leadId)}
              onNavigate={setCurrentTab}
            />
          )}
          {isAdmin && currentTab === "analytics" && <AnalyticsView />}
          {isAdmin && currentTab === "campaigns" && <CampaignsView />}
          {isAdmin && currentTab === "buyers" && <BuyersView />}
          {isAdmin && currentTab === "leads" && (
            <LeadsView
              title="Leads"
              onSelectLead={(leadId) => setSelectedRoutingLeadId(leadId)}
              onNewLeadClick={() => setCurrentTab("submit-lead")}
            />
          )}
          {isAdmin && currentTab === "bids" && <TransactionsView />}
          {isAdmin && currentTab === "providers" && <ProvidersView />}
          {isAdmin && currentTab === "rejections" && <RejectionsView />}
          {isAdmin && currentTab === "reports" && (
            <ReportsView onOpenLead={(leadId) => setSelectedRoutingLeadId(leadId)} />
          )}
          {isAdmin && currentTab === "crm" && (
            <CrmListView
              title="CRM"
              onNewSubmissionClick={() => setCurrentTab("submit-crm")}
            />
          )}
          {isAdmin && currentTab === "crm-analytics" && <CrmAnalyticsView />}
          {isAdmin && currentTab === "settings" && <UsersView />}

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
        </div>
      </main>

      {/* RTB Lead Buyer Routing View matching genuine buyer auction */}
      {selectedRoutingLeadId && (
        <LeadBuyerRouting
          leadId={selectedRoutingLeadId}
          onClose={() => setSelectedRoutingLeadId(null)}
        />
      )}
    </div>
  );
}
