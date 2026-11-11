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
import { AgentPerformanceView } from "@/components/AgentPerformanceView";
import { SalesStatsView } from "@/components/SalesStatsView";
import { ClosersView } from "@/components/ClosersView";
import { AccountView } from "@/components/AccountView";
import { NoPickupFormView } from "@/components/NoPickupFormView";
import { NoPickupListView } from "@/components/NoPickupListView";
import { CloserReportView } from "@/components/CloserReportView";
import { BrandLogo } from "@/components/BrandLogo";
import { Loader2, ArrowRight } from "lucide-react";

type AppView = { tab: string; leadId: string | null };

function defaultTab(role: string | undefined) {
  if (role === "CLOSER" || role === "AGENT") return "submit-lead";
  if (role === "MANAGER") return "sales";
  return "dashboard";
}

function tabAllowed(tab: string, role: string | undefined) {
  const shared = ["submit-lead", "my-leads", "submit-crm", "my-crm"];
  if (shared.includes(tab)) return true;
  if (role === "ADMIN") {
    return [
      "dashboard",
      "analytics",
      "leads",
      "bids",
      "buyers",
      "campaigns",
      "providers",
      "rejections",
      "reports",
      "crm",
      "sales-stats",
      "no-pickups",
      "crm-analytics",
      "settings",
    ].includes(tab);
  }
  if (role === "MANAGER") return ["sales", "sales-stats", "no-pickups", "closers"].includes(tab);
  return ["my-performance", "my-sales", "submit-no-pickup", "no-pickups", "account"].includes(tab);
}

function sameUrl() {
  return window.location.pathname + window.location.search;
}

export default function HomePage() {
  const { user, token, loading, login, isAdmin, isManager } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [selectedRoutingLeadId, setSelectedRoutingLeadId] = useState<string | null>(null);
  const viewRef = React.useRef<AppView>({ tab: "dashboard", leadId: null });
  const indexRef = React.useRef(0);
  const roleRef = React.useRef<string | undefined>(undefined);
  const bootedRef = React.useRef(false);

  const showView = (view: AppView) => {
    viewRef.current = view;
    setCurrentTab(view.tab);
    setSelectedRoutingLeadId(view.leadId);
  };

  const writeHistory = (view: AppView, index: number, mode: "push" | "replace", guard = false) => {
    const payload = {
      ...(window.history.state || {}),
      rtb: view,
      rtbIndex: index,
      rtbGuard: guard,
    };
    if (mode === "push") window.history.pushState(payload, "", sameUrl());
    else window.history.replaceState(payload, "", sameUrl());
  };

  const goToTab = (tab: string) => {
    if (viewRef.current.tab === tab && !viewRef.current.leadId) return;
    const view = { tab, leadId: null };
    indexRef.current += 1;
    showView(view);
    writeHistory(view, indexRef.current, "push");
  };

  const openRoutingLead = (leadId: string, tab = viewRef.current.tab) => {
    if (viewRef.current.leadId === leadId && viewRef.current.tab === tab) return;
    const view = { tab, leadId };
    indexRef.current += 1;
    showView(view);
    writeHistory(view, indexRef.current, "push");
  };

  const closeRoutingLead = () => {
    const state = window.history.state as { rtb?: AppView; rtbIndex?: number } | null;
    if (state?.rtb?.leadId && (state.rtbIndex ?? 0) > 0) {
      window.history.back();
      return;
    }
    const view = { tab: viewRef.current.tab, leadId: null };
    showView(view);
    writeHistory(view, state?.rtbIndex ?? indexRef.current, "replace");
  };

  React.useEffect(() => {
    const onPopState = () => {
      const state = window.history.state as { rtb?: AppView; rtbIndex?: number; rtbGuard?: boolean } | null;
      if (!state?.rtb || state.rtbGuard) {
        // Stay in this tab. Leaving the app history is what was opening the previous page elsewhere.
        if (state?.rtbGuard) window.history.go(1);
        else writeHistory(viewRef.current, indexRef.current, "push");
        return;
      }
      const role = roleRef.current;
      const view = tabAllowed(state.rtb.tab, role)
        ? { tab: state.rtb.tab, leadId: state.rtb.leadId ?? null }
        : { tab: defaultTab(role), leadId: null };
      indexRef.current = state.rtbIndex ?? indexRef.current;
      showView(view);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      if (event.key === "ArrowLeft") window.history.back();
      else window.history.forward();
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.role) return;
    const previousRole = roleRef.current;
    roleRef.current = user.role;
    const saved = window.history.state as { rtb?: AppView; rtbIndex?: number; rtbGuard?: boolean } | null;
    if (!bootedRef.current && saved?.rtb && !saved.rtbGuard && tabAllowed(saved.rtb.tab, user.role)) {
      bootedRef.current = true;
      indexRef.current = saved.rtbIndex ?? 0;
      showView({ tab: saved.rtb.tab, leadId: saved.rtb.leadId ?? null });
      return;
    }
    if (bootedRef.current && previousRole === user.role) return;
    if (bootedRef.current && tabAllowed(viewRef.current.tab, user.role)) return;
    bootedRef.current = true;
    const view = { tab: defaultTab(user.role), leadId: null };
    indexRef.current = 0;
    showView(view);
    writeHistory(view, 0, "replace", true);
    writeHistory(view, 0, "push");
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen kukie-bg flex relative">
      {/* Sidebar */}
      <Sidebar currentTab={currentTab} onTabChange={goToTab} />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto min-h-screen pb-20 bg-[#f5f6f8]">
        <div>
          {/* Admin Views */}
          {isAdmin && currentTab === "dashboard" && (
            <DashboardView
              onOpenLead={openRoutingLead}
              onNavigate={goToTab}
            />
          )}
          {isAdmin && currentTab === "analytics" && <AnalyticsView />}
          {isAdmin && currentTab === "campaigns" && <CampaignsView />}
          {isAdmin && currentTab === "buyers" && <BuyersView />}
          {isAdmin && currentTab === "leads" && (
            <LeadsView
              title="Leads"
              onSelectLead={openRoutingLead}
              onNewLeadClick={() => goToTab("submit-lead")}
            />
          )}
          {isAdmin && currentTab === "bids" && <TransactionsView />}
          {isAdmin && currentTab === "providers" && <ProvidersView />}
          {isAdmin && currentTab === "rejections" && <RejectionsView />}
          {isAdmin && currentTab === "reports" && (
            <ReportsView onOpenLead={openRoutingLead} />
          )}
          {isAdmin && currentTab === "crm" && (
            <CrmListView
              title="CRM"
              onNewSubmissionClick={() => goToTab("submit-crm")}
            />
          )}
          {isAdmin && currentTab === "sales-stats" && <SalesStatsView />}
          {isAdmin && currentTab === "no-pickups" && <NoPickupListView />}
          {isAdmin && currentTab === "crm-analytics" && <CrmAnalyticsView />}
          {isAdmin && currentTab === "settings" && <UsersView />}

          {isManager && currentTab === "sales" && <CrmListView title="Sales" />}
          {isManager && currentTab === "sales-stats" && <SalesStatsView />}
          {isManager && currentTab === "no-pickups" && <NoPickupListView />}
          {isManager && currentTab === "closers" && <ClosersView />}

          {/* Agent Views */}
          {currentTab === "submit-lead" && (
            <SubmitLeadView
              onSuccess={(newLeadId) => {
                openRoutingLead(newLeadId, isAdmin ? "leads" : "my-leads");
              }}
            />
          )}
          {currentTab === "my-leads" && (
            <LeadsView
              title="My Leads"
              onSelectLead={openRoutingLead}
              onNewLeadClick={() => goToTab("submit-lead")}
            />
          )}
          {currentTab === "submit-crm" && (
            <CrmFormView
              onSuccess={() => {
                goToTab(isAdmin ? "crm" : isManager ? "sales" : "my-crm");
              }}
            />
          )}
          {currentTab === "my-crm" && (
            <CrmListView
              title="My CRM Submissions"
              onNewSubmissionClick={() => goToTab("submit-crm")}
            />
          )}
          {!isAdmin && !isManager && currentTab === "my-sales" && <CloserReportView />}
          {!isAdmin && !isManager && currentTab === "submit-no-pickup" && (
            <NoPickupFormView onSuccess={() => goToTab("no-pickups")} />
          )}
          {!isAdmin && !isManager && currentTab === "no-pickups" && (
            <NoPickupListView onNew={() => goToTab("submit-no-pickup")} />
          )}
          {!isAdmin && !isManager && currentTab === "my-performance" && <AgentPerformanceView />}
          {!isAdmin && !isManager && currentTab === "account" && <AccountView />}
        </div>
      </main>

      {/* RTB Lead Buyer Routing View matching genuine buyer auction */}
      {selectedRoutingLeadId && (
        <LeadBuyerRouting
          leadId={selectedRoutingLeadId}
          onClose={closeRoutingLead}
        />
      )}
    </div>
  );
}
