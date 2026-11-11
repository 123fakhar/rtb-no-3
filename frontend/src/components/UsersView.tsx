"use client";

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { putCache, takeCache } from "@/lib/tabCache";
import { Plus, UserPlus, Loader2, X, Shield, Users } from "lucide-react";

export function UsersView() {
  const [users, setUsers] = useState<any[]>(() => takeCache<any[]>("users") ?? []);
  const [loading, setLoading] = useState(() => takeCache("users") == null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("closer12345");
  const [role, setRole] = useState("CLOSER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = async () => {
    const cached = takeCache<any[]>("users");
    if (cached) setUsers(cached);
    else setLoading(true);
    try {
      const res = await apiRequest<{ users: any[] }>("/api/users");
      setUsers(res.users);
      putCache("users", res.users);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        }),
      });

      setShowModal(false);
      setName("");
      setEmail("");
      setPassword("agent12345");
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: any) => {
    try {
      await apiRequest(`/api/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !user.active }),
      });
      await loadUsers();
    } catch (err: any) {
      alert(err.message || "Failed to update user");
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
              CLOSER AND MANAGER ACCOUNTS
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Users &amp; Closers ({users.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create closers and managers. Only an admin can set or change a password.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs tracking-wide uppercase font-bold"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Agent ID</span>
        </button>
      </div>

      <div className="kukie-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="py-3.5 px-5">Name</th>
                <th className="py-3.5 px-5">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5">Created At</th>
                <th className="py-3.5 px-5 text-right">Quick Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading agent accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isAdminRole = u.role === "ADMIN";
                  return (
                    <tr key={u.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3.5 px-5 font-bold text-slate-900 whitespace-nowrap flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isAdminRole
                              ? "bg-slate-900 text-white"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {isAdminRole ? (
                            <Shield className="w-3.5 h-3.5" />
                          ) : (
                            u.name.slice(0, 1)
                          )}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-600 text-[11px]">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            isAdminRole
                              ? "bg-slate-900 text-white"
                              : "bg-blue-50 text-blue-700 border border-blue-200/60"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                            u.active
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {u.active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="py-3.5 px-5 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {!isAdminRole && (
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              onClick={async () => {
                                const next = window.prompt(`New password for ${u.email} (at least 8 characters)`);
                                if (!next) return;
                                if (next.length < 8) {
                                  alert("Password must be at least 8 characters");
                                  return;
                                }
                                try {
                                  await apiRequest(`/api/users/${u.id}`, {
                                    method: "PATCH",
                                    body: JSON.stringify({ password: next }),
                                  });
                                  alert("Password updated");
                                } catch (err: any) {
                                  alert(err.message || "Failed to update password");
                                }
                              }}
                              className="px-3 py-1 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 rounded-xl text-slate-700 text-[11px] font-bold transition-all"
                            >
                              Set password
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-popover overflow-hidden border border-white/80">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
                    PROVISION AGENT
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Add New Agent
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create an agent login ID. 25+ agents can work simultaneously.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Agent 26"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="agent26@rtb.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-200/90 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-slate-800"
                >
                  <option value="CLOSER">Closer (masked phones, no revenue)</option>
                  <option value="MANAGER">Manager (sees sales, cannot accept or reject)</option>
                  <option value="ADMIN">Administrator (accept, reject, revenue, passwords)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
