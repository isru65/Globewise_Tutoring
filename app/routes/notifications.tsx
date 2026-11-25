import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface NotificationRecord {
  id: string;
  recipientEmail?: string;
  title: string;
  message: string;
  category?: string;
  read: boolean;
  linkTo?: string | null;
  createdAt?: string;
}

export default function NotificationsRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();

  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/notifications", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 404) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(
          errPayload?.error?.message || `Unable to load notifications (${res.status})`,
        );
      }

      const payload = await res.json();
      const list: NotificationRecord[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];
      setNotifications(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading) {
      void loadNotifications();
    }
  }, [userLoading, loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.read);
    }
    return notifications;
  }, [notifications, filter]);

  async function handleMarkRead(notificationId: string) {
    setBusyId(notificationId);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/notifications/${encodeURIComponent(notificationId)}/read`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          payload?.error?.message || `Unable to update notification (${res.status})`,
        );
      }
      setNotifications((prev) =>
        prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark notification as read");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/v1/notifications/read-all", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          payload?.error?.message || `Unable to mark all read (${res.status})`,
        );
      }
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setNotice("All notifications marked as read.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark all notifications as read");
    } finally {
      setMarkingAll(false);
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading notifications...
      </div>
    );
  }

  return (
    <Layout
      title="Notifications & Alerts"
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Notifications" },
      ]}
      currentUser={user}
      unreadNotificationsCount={unreadCount}
      onSignOut={() => {
        void refreshUser();
      }}
      headerActions={
        unreadCount > 0 ? (
          <button
            type="button"
            disabled={markingAll}
            onClick={() => void handleMarkAllRead()}
            className="rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold text-white disabled:opacity-60 transition-colors"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            {markingAll ? "Marking..." : "Mark All Read"}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Deep Blue / Navy Header Banner */}
        <div
          className="rounded-xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{
            background: `linear-gradient(120deg, ${DEEP_BLUE_THEME.colors.navy900} 0%, ${DEEP_BLUE_THEME.colors.navy800} 100%)`,
          }}
        >
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
              Activity & Reminders
            </div>
            <h2 className="mt-1 text-xl font-bold">
              Plan Updates, Session Reminders & Approvals
            </h2>
            <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
              Stay up to date when weekly plans are published, sessions are scheduled, AI drafts
              are reviewed, or assessments are graded.
            </p>
          </div>

          <div className="rounded-lg bg-white/10 border border-white/15 px-4 py-2.5 shrink-0">
            <div className="text-[11px] uppercase tracking-wider text-blue-200">
              Unread
            </div>
            <div className="text-xl font-bold text-white">{unreadCount}</div>
          </div>
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

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold border transition-colors ${
              filter === "all"
                ? "bg-[#0F172A] text-white border-[#0F172A]"
                : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold border transition-colors ${
              filter === "unread"
                ? "bg-[#0F172A] text-white border-[#0F172A]"
                : "bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F8FAFC]"
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading notifications...
          </div>
        ) : visibleNotifications.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              New activity across learning plans, sessions, assessments, and approvals will appear
              here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotifications.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors ${
                  item.read
                    ? "bg-white border-[#E2E8F0]"
                    : "bg-[#EFF6FF] border-[#BFDBFE]"
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!item.read && (
                      <span className="inline-block h-2 w-2 rounded-full bg-[#1D4ED8]" />
                    )}
                    <span className="text-sm font-semibold text-[#0F172A]">
                      {item.title}
                    </span>
                    {item.category && (
                      <span className="rounded-full bg-white border border-[#CBD5E1] px-2 py-0.5 text-[11px] font-medium text-[#475569]">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-[#334155]">{item.message}</p>
                  {item.createdAt && (
                    <div className="text-[11px] text-[#64748B]">
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>

                {!item.read && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void handleMarkRead(item.id)}
                    className="shrink-0 rounded-lg border border-[#CBD5E1] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] disabled:opacity-60"
                  >
                    {busyId === item.id ? "Saving..." : "Mark Read"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}