"use client";

import React from "react";
import { BrandLogo } from "./BrandLogo";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Megaphone,
  HeartPulse,
  Receipt,
  Code2,
  Building2,
  Users,
  BarChart3,
  ClipboardList,
  FilePlus,
  Send,
  LogOut,
  ShieldCheck,
  UserCheck,
  PlusCircle,
} from "lucide-react";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ currentTab, onTabChange }: SidebarProps) {
  const { user, isAdmin, logout, switchUserFast } = useAuth();

  const adminNav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "apis", label: "RTB APIs", icon: Code2 },
    { id: "buyers", label: "Buyers", icon: Building2 },
    { id: "leads", label: "Leads", icon: Send },
    { id: "transactions", label: "RTB Transactions", icon: Receipt },
    { id: "crm", label: "CRM Leads", icon: ClipboardList },
    { id: "crm-analytics", label: "CRM Analytics", icon: BarChart3 },
    { id: "users", label: "Users & Agents", icon: Users },
  ];

  const agentNav = [
    { id: "submit-lead", label: "Submit Lead", icon: PlusCircle },
    { id: "my-leads", label: "My Leads", icon: Send },
    { id: "submit-crm", label: "Submit CRM", icon: FilePlus },
    { id: "my-crm", label: "CRM Entries", icon: ClipboardList },
  ];

  const navItems = isAdmin ? adminNav : agentNav;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none">
      <div>
        <BrandLogo subtitle={isAdmin ? "ADMIN CONSOLE" : "AGENT PORTAL"} />

        <div className="px-4 py-2">
          {/* Quick role toggle button for testing between Admin and Agent */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 mb-4 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium truncate max-w-[120px]">
              {user?.name}
            </span>
            <button
              onClick={() => switchUserFast(isAdmin ? "AGENT" : "ADMIN")}
              title="Click to quickly switch between Admin and Agent"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 underline"
            >
              Switch to {isAdmin ? "Agent" : "Admin"}
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
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "US"}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[110px]">
                {user?.name}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                {user?.email}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
