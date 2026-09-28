"use client";

import React from "react";
import type { DashFilters, RangePreset } from "@/lib/dashboardData";

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "custom", label: "Custom" },
];

export function RangePills({
  filters,
  onChange,
}: {
  filters: DashFilters;
  onChange: (next: DashFilters) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onChange({ ...filters, preset: preset.id })}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
              filters.preset === preset.id
                ? "bg-[#1c2434] text-white"
                : "text-slate-400 hover:text-slate-800"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {filters.preset === "custom" && (
        <div className="inline-flex items-center gap-2 bg-white/90 border border-slate-200/80 rounded-2xl px-2 py-1 shadow-xs">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onChange({ ...filters, from: e.target.value })}
            className="text-xs font-semibold text-slate-700 bg-transparent px-1 py-1 focus:outline-none"
          />
          <span className="text-slate-300 text-xs">–</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onChange({ ...filters, to: e.target.value })}
            className="text-xs font-semibold text-slate-700 bg-transparent px-1 py-1 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
