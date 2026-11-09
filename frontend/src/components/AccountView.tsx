"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function AccountView() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      setMessage("Name saved. Admins and managers will see this name.");
    } catch (err: any) {
      setError(err.message || "Could not update username");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">My account</h1>
        <p className="text-xs text-slate-500 mt-1">
          The name you save here is the name admins and managers see. An admin sets the password.
        </p>
      </div>
      <form onSubmit={save} className="kukie-card-static p-6 space-y-4">
        {error && <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs">{error}</div>}
        {message && <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 text-xs">{message}</div>}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Username</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary px-4 py-2.5 text-xs font-bold inline-flex items-center gap-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save name
        </button>
      </form>
    </div>
  );
}
