import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME, type PortalRole } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface AdminUserRecord {
  id: string;
  email: string;
  name?: string | null;
  role: PortalRole | string;
  status: string;
  createdAt?: string;
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-[#DCFCE7] text-[#166534]";
    case "pending":
    case "pending_approval":
      return "bg-[#FEF3C7] text-[#92400E]";
    case "suspended":
    case "disabled":
      return "bg-[#FEE2E2] text-[#991B1B]";
    default:
      return "bg-[#E0F2FE] text-[#075985]";
  }
}

export default function AdminRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();

  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const isAdmin = user?.role === "admin";

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/users?page=1&page_size=100", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 404) {
        setUsers([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(
          errPayload?.error?.message || `Unable to load users (${res.status})`,
        );
      }

      const payload = await res.json();
      const list: AdminUserRecord[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user accounts");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!userLoading) {
      void loadUsers();
    }
  }, [userLoading, loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (q) {
        const hay = `${u.name ?? ""} ${u.email} ${u.role} ${u.status}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  const pendingApprovalsCount = useMemo(
    () =>
      users.filter(
        (u) => u.status === "pending" || u.status === "pending_approval",
      ).length,
    [users],
  );

  async function handleUpdateUser(
    targetUserId: string,
    patch: { role?: string; status?: string },
  ) {
    if (!isAdmin) return;
    setUpdatingUserId(targetUserId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/users/${encodeURIComponent(targetUserId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          payload?.error?.message || `Unable to update user (${res.status})`,
        );
      }

      setNotice("User account updated.");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update user account");
    } finally {
      setUpdatingUserId(null);
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading administration console...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Layout
        title="Administration"
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Admin" }]}
        currentUser={user}
        onSignOut={() => {
          void refreshUser();
        }}
      >
        <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center max-w-xl mx-auto">
          <div className="text-base font-bold text-[#0F172A]">
            Administrator Access Required
          </div>
          <p className="mt-1.5 text-sm text-[#475569]">
            User approvals, role assignments, and platform governance controls are restricted to
            administrators.
          </p>
          <Link
            to="/"
            className="mt-4 inline-block rounded-lg px-4 py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            Return to Portal Home
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="User & Tutor Administration"
      breadcrumbs={[{ label: "Home", to: "/" }, { label: "Admin" }]}
      currentUser={user}
      onSignOut={() => {
        void refreshUser();
      }}
    >
      <div className="space-y-6">
        {/* Deep Blue / Navy Header Banner */}
        <div
          className="rounded-xl p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{
            background: `linear-gradient(120deg, ${DEEP_BLUE_THEME.colors.navy900} 0%, ${DEEP_BLUE_THEME.colors.navy800} 100%)`,
          }}
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
              Platform Governance & Approvals
            </div>
            <h2 className="mt-1 text-xl font-bold">
              User Accounts, Tutor Approvals & System Operations
            </h2>
            <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
              Approve pending tutor and user accounts, assign roles, and jump into curriculum,
              AI review, subscriptions, and audit logs.
            </p>
          </div>

          <div className="rounded-lg bg-white/10 border border-white/15 px-4 py-2.5 shrink-0">
            <div className="text-[11px] uppercase tracking-wider text-blue-200">
              Pending Approvals
            </div>
            <div className="text-xl font-bold text-white">{pendingApprovalsCount}</div>
          </div>
        </div>

        {/* Governance Shortcuts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Curriculum Admin", desc: "Manage K–8 topics & units", to: "/curriculum" },
            { label: "AI Review Queue", desc: "Approve or reject AI drafts", to: "/ai" },
            { label: "Subscriptions & Billing", desc: "Plans & family allowances", to: "/billing" },
            { label: "Audit Logs", desc: "Inspect mutations & activity", to: "/audit" },
          ].map((card) => (
            <Link
              key={card.to + card.label}
              to={card.to}
              className="rounded-xl bg-white border border-[#E2E8F0] p-4 hover:border-[#1D4ED8] transition-colors"
            >
              <div className="text-sm font-semibold text-[#0F172A]">{card.label}</div>
              <div className="mt-0.5 text-xs text-[#475569]">{card.desc}</div>
            </Link>
          ))}
        </div>

        {notice && (
          <div className="rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] px-4 py-2.5 text-xs font-medium">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="tutor">Tutor</option>
              <option value="parent">Parent</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Account Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Search Name or Email
            </label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user..."
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading user accounts...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              No matching user accounts
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              Try adjusting your role, status, or search filters.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-white border border-[#E2E8F0] overflow-x-auto">
            <table className="min-w-full divide-y divide-[#E2E8F0] text-left text-sm">
              <thead className="bg-[#EFF6FF] text-xs font-semibold uppercase tracking-wider text-[#1E3A8A]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredUsers.map((u) => {
                  const busy = updatingUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-[#0F172A]">
                          {u.name || u.email}
                        </div>
                        <div className="text-xs text-[#64748B]">{u.email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <select
                          aria-label={`Role for ${u.email}`}
                          disabled={busy}
                          value={u.role}
                          onChange={(e) =>
                            void handleUpdateUser(u.id, { role: e.target.value })
                          }
                          className="rounded-lg border border-[#CBD5E1] px-2.5 py-1.5 text-xs font-medium bg-white"
                        >
                          <option value="student">student</option>
                          <option value="tutor">tutor</option>
                          <option value="parent">parent</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                            u.status,
                          )}`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2 whitespace-nowrap">
                        {u.status !== "active" && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handleUpdateUser(u.id, { status: "active" })
                            }
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
                          >
                            Approve
                          </button>
                        )}
                        {u.status === "active" && u.email !== user?.email && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void handleUpdateUser(u.id, { status: "suspended" })
                            }
                            className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] px-3 py-1.5 text-xs font-semibold hover:bg-[#FEE2E2] disabled:opacity-60"
                          >
                            Suspend
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}