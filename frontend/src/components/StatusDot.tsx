"use client";

import React from "react";

const tones = {
  healthy: "bg-emerald-500",
  degraded: "bg-amber-400",
  idle: "bg-slate-300",
};

export function StatusDot({ status }: { status: "healthy" | "degraded" | "idle" }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${tones[status]} ${status === "healthy" ? "" : ""}`} />;
}

export function statusLabel(status: "healthy" | "degraded" | "idle") {
  if (status === "healthy") return "Healthy";
  if (status === "degraded") return "Degraded";
  return "No traffic";
}
