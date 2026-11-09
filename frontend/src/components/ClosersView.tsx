"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface Closer {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role: string;
}

export function ClosersView() {
  const [closers, setClosers] = useState<Closer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ users: Closer[] }>("/api/users/closers")
      .then((res) => setClosers(res.users))
      .catch((err) => setError(err.message || "Could not load closers"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Closers</h1>
        <p className="text-xs text-slate-500 mt-1">
          Every closer account. Passwords and sale decisions stay with the admin.
        </p>
      </div>
      {error && <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs">{error}</div>}
      <div className="kukie-card-static overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {closers.map((closer) => (
                <tr key={closer.id}>
                  <td className="px-5 py-3 font-semibold text-slate-900">{closer.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{closer.email}</td>
                  <td className="px-5 py-3">
                    <span className={closer.active ? "text-emerald-700 font-bold" : "text-slate-400 font-bold"}>
                      {closer.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
