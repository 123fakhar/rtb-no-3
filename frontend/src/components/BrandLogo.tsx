"use client";

import React from "react";

export function BrandLogo({
  subtitle = "ADMIN CONSOLE",
  onDark = false,
}: {
  subtitle?: string;
  onDark?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-5 pt-5 pb-4 select-none">
      <div className="h-10 w-14 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden">
        <img src="/seagull-logo.png" alt="Seagulls" className="h-8 w-auto object-contain" />
      </div>
      <div className="min-w-0">
        <div className={`text-[15px] font-bold tracking-tight leading-none ${onDark ? "text-white" : "text-slate-900"}`}>
          Seagulls<span className={onDark ? "text-slate-300" : "text-slate-400"}>.rtb</span>
        </div>
        {subtitle && (
          <div className={`text-[10px] font-medium mt-1 tracking-wide ${onDark ? "text-slate-300" : "text-slate-400"}`}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
