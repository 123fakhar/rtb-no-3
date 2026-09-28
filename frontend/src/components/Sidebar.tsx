"use client";

import React from "react";
import { BrandLogo } from "./BrandLogo";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  ClipboardList,
  FilePlus,
  Send,
  LogOut,
  PlusCircle,
  ArrowRightLeft,
  LineChart,
  Plug,
  AlertTriangle,
  Settings,
  CircleDollarSign,
  Target,
  PieChart,
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ currentTab, onTabChange }: SidebarProps) {
  const { user, isAdmin, logout, switchUserFast } = useAuth();

  const adminNav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "leads", label: "Leads", icon: Users },
    { id: "bids", label: "Bids", icon: CircleDollarSign },
    { id: "buyers", label: "Buyers", icon: Building2 },
    { id: "campaigns", label: "Campaigns", icon: Target },
    { id: "providers", label: "Providers", icon: Plug },
    { id: "rejections", label: "Rejections", icon: AlertTriangle },
    { id: "reports", label: "Reports", icon: LineChart },
    { id: "crm", label: "CRM", icon: ClipboardList },
    { id: "crm-analytics", label: "CRM Analytics", icon: PieChart },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const agentNav = [
    { id: "submit-lead", label: "Submit Lead", icon: PlusCircle },
    { id: "my-leads", label: "My Leads", icon: Send },
    { id: "submit-crm", label: "Submit CRM", icon: FilePlus },
    { id: "my-crm", label: "CRM Entries", icon: ClipboardList },
  ];

  const navItems = isAdmin ? adminNav : agentNav;

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-20">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <BrandLogo subtitle={isAdmin ? "ADMIN PORTAL" : "AGENT PORTAL"} />

        <div className="px-4 py-2">
          {/* Fast switch between Admin and Agent for live inspection */}
          <p className="px-3.5 mb-2 text-[11px] font-medium text-slate-400">Main Menu</p>
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 mb-4 flex items-center justify-between text-xs">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[10px] uppercase font-medium tracking-wider text-slate-400">
                Active Session
              </span>
              <span className="text-slate-800 font-semibold truncate text-xs">
                {user?.name}
              </span>
            </div>
            <button
              onClick={() => switchUserFast(isAdmin ? "AGENT" : "ADMIN")}
              title="Click to toggle between Admin and Agent"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-[#1c2434] hover:text-white hover:border-transparent font-medium text-[11px] transition-all duration-150"
            >
              <ArrowRightLeft className="w-3 h-3" />
              <span>{isAdmin ? "Agent" : "Admin"}</span>
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium tracking-tight transition-all duration-150 ${
                    active
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-slate-800" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100/80 bg-white/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "US"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 truncate">
                {user?.name}
              </span>
              <span className="text-[10px] text-slate-400 truncate">
                {user?.email}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
