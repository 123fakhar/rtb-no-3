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
  const { user, isAdmin, isManager, logout } = useAuth();

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
    { id: "sales-stats", label: "Sales Stats", icon: PieChart },
    { id: "crm-analytics", label: "CRM Analytics", icon: PieChart },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const closerNav = [
    { id: "my-performance", label: "Closer Performance", icon: BarChart3 },
    { id: "submit-lead", label: "Submit Lead", icon: PlusCircle },
    { id: "my-leads", label: "My Leads", icon: Send },
    { id: "submit-crm", label: "Submit CRM", icon: FilePlus },
    { id: "my-crm", label: "CRM Entries", icon: ClipboardList },
    { id: "account", label: "My Account", icon: Settings },
  ];

  const managerNav = [
    { id: "sales", label: "Sales", icon: ClipboardList },
    { id: "sales-stats", label: "Sales Stats", icon: PieChart },
    { id: "closers", label: "Closers", icon: Users },
  ];

  const navItems = isAdmin ? adminNav : isManager ? managerNav : closerNav;
  const portal = isAdmin ? "ADMIN PORTAL" : isManager ? "MANAGER PORTAL" : "CLOSER PORTAL";

  return (
    <aside className="w-64 bg-[#0b1f3a] border-r border-[#08162b] flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-20">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <BrandLogo subtitle={portal} onDark />

        <div className="px-4 py-2">
          <p className="px-3.5 mb-2 text-[11px] font-medium text-slate-300">Main Menu</p>
          <div className="bg-white/10 border border-white/15 rounded-2xl p-2.5 mb-4 text-xs">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-medium tracking-wider text-slate-300">
                Active Session
              </span>
              <span className="text-white font-semibold truncate text-xs">
                {user?.name}
              </span>
            </div>
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
                      ? "bg-white text-[#0b1f3a]"
                      : "text-slate-200 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-[#0b1f3a]" : "text-slate-300"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white text-[#0b1f3a] flex items-center justify-center font-bold text-xs shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "US"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {user?.name}
              </span>
              <span className="text-[10px] text-slate-300 truncate">
                {user?.email}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-300 hover:text-rose-200 rounded-xl hover:bg-white/10 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
