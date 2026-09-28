"use client";

import React from "react";

export function BrandLogo({ subtitle = "ADMIN CONSOLE" }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center text-center p-4">
      {/* Modern minimal seagull icon */}
      <svg
        className="w-12 h-12 text-slate-900 mb-2"
        viewBox="0 0 64 64"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 36C22 28 32 20 48 16C42 22 36 29 32 38C26 33 20 33 12 36Z" />
        <path d="M24 38C34 32 44 26 56 22C50 30 43 38 38 46C33 41 28 40 24 38Z" opacity="0.8" />
      </svg>
      <h1 className="text-sm font-semibold tracking-wider uppercase text-slate-900 font-serif">
        SEAGULLS
      </h1>
      <span className="text-[9px] tracking-widest text-slate-500 uppercase font-sans">
        COMMUNICATIONS
      </span>
      {subtitle && (
        <span className="mt-4 inline-block px-2.5 py-0.5 rounded text-[10px] font-medium tracking-widest uppercase bg-slate-100 text-slate-700">
          {subtitle}
        </span>
      )}
    </div>
  );
}
