"use client";

import React from "react";

export function BrandLogo({ subtitle = "ADMIN CONSOLE" }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 select-none">
      <div className="w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-800 flex items-center justify-center">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-bold tracking-tight text-slate-900 leading-none">
          Seagulls<span className="text-slate-400">.rtb</span>
        </div>
        {subtitle && (
          <div className="text-[10px] font-medium text-slate-400 mt-1 tracking-wide">{subtitle}</div>
        )}
      </div>
    </div>
  );
}
