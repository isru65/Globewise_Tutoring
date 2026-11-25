import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface SubscriptionPlanRecord {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  priceCents: number;
  billingInterval?: string;
  maxStudents?: number;
  monthlySessions?: number;
  trialDays?: number;
  features?: string[];
}

export interface SubscriptionRecord {
  id: string;
  planId: string;
  ownerEmail?: string;
  parentEmail?: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string | null;
  sessionsUsed?: number;
}

function formatPrice(priceCents: number, interval?: string): string {
  if (!priceCents || priceCents <= 0) return "Free";
  const dollars = (priceCents / 100).toFixed(2);
  const suffix = interval ? ` / ${interval}` : " / mo";
  return `$${dollars}${suffix}`;
}

function getSubscriptionBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-[#DCFCE7] text-[#166534]";
    case "trialing":
    case "past_due":
      return "bg-[#FEF3C7] text-[#92400E]";
    case "canceled":
    case "cancelled":
    case "expired":
      return "bg-[#FEE2E2] text-[#991B1B]";
    default:
      return "bg-[#E0F2FE] text-[#075985]";
  }
}

export default function BillingRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();

  const [plans, setPlans] = useState<SubscriptionPlanRecord[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const canManageSubscription = user?.role === "parent" || user?.role === "admin";

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, subsRes] = await Promise.all([
        fetch("/api/v1/subscription-plans", {
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
        fetch("/api/v1/subscriptions", {
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
      ]);

      if (plansRes.ok) {
        const plansPayload = await plansRes.json();
        const list: SubscriptionPlanRecord[] = Array.isArray(plansPayload?.data)
          ? plansPayload.data
          : Array.isArray(plansPayload?.data?.items)
            ? plansPayload.data.items
            : [];
        setPlans(list);
      } else if (plansRes.status !== 404) {
        throw new Error(`Unable to load subscription plans (${plansRes.status})`);
      } else {
        setPlans([]);
      }

      if (subsRes.ok) {
        const subsPayload = await subsRes.json();
        const subList: SubscriptionRecord[] = Array.isArray(subsPayload?.data)
          ? subsPayload.data
          : Array.isArray(subsPayload?.data?.items)
            ? subsPayload.data.items
            : [];
        setSubscriptions(subList);
      } else {
        setSubscriptions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading) {
      void loadBillingData();
    }
  }, [userLoading, loadBillingData]);

  const activeSubscription = useMemo(() => {
    if (subscriptions.length === 0) return null;
    const current = subscriptions.find(
      (s) => s.status === "active" || s.status === "trialing",
    );
    return current ?? subscriptions[0];
  }, [subscriptions]);

  const planMap = useMemo(() => {
    const map = new Map<string, SubscriptionPlanRecord>();
    for (const p of plans) {
      map.set(p.id, p);
    }
    return map;
  }, [plans]);

  async function handleSubscribe(planId: string) {
    if (!canManageSubscription) return;
    setSubscribingPlanId(planId);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/v1/subscriptions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          payload?.error?.message || `Unable to update subscription (${res.status})`,
        );
      }

      setNotice("Subscription updated successfully.");
      await loadBillingData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process subscription");
    } finally {
      setSubscribingPlanId(null);
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading billing & subscriptions...
      </div>
    );
  }

  const activePlan = activeSubscription ? planMap.get(activeSubscription.planId) : null;

  return (
    <Layout
      title="Subscriptions & Billing"
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Billing" },
      ]}
      currentUser={user}
      onSignOut={() => {
        void refreshUser();
      }}
    >
      <div className="space-y-6">
        {/* Deep Blue / Navy Header Banner */}
        <div
          className="rounded-xl p-5 sm:p-6 text-white"
          style={{
            background: `linear-gradient(120deg, ${DEEP_BLUE_THEME.colors.navy900} 0%, ${DEEP_BLUE_THEME.colors.navy800} 100%)`,
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
            Family Plans & Tutoring Allowances
          </div>
          <h2 className="mt-1 text-xl font-bold">
            Subscription Plans, Student Limits & Session Allowances
          </h2>
          <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
            Manage your family plan, track student profile limits and monthly 1-on-1 tutoring
            session allowances, and review subscription status.
          </p>
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

        {/* Active Subscription Card */}
        {activeSubscription && (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                  Current Subscription
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSubscriptionBadgeClass(
                    activeSubscription.status,
                  )}`}
                >
                  {activeSubscription.status.replace("_", " ")}
                </span>
              </div>
              <h3 className="text-lg font-bold text-[#0F172A]">
                {activePlan?.name ?? `Plan (${activeSubscription.planId})`}
              </h3>
              <p className="text-xs text-[#475569]">
                {typeof activePlan?.maxStudents === "number"
                  ? `Up to ${activePlan.maxStudents} student${activePlan.maxStudents === 1 ? "" : "s"}`
                  : "Standard student capacity"}
                {typeof activePlan?.monthlySessions === "number"
                  ? ` • ${activeSubscription.sessionsUsed ?? 0} / ${
                      activePlan.monthlySessions
                    } monthly 1-on-1 sessions used`
                  : ""}
                {activeSubscription.currentPeriodEnd
                  ? ` • Renews ${new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}`
                  : ""}
              </p>
            </div>

            {activePlan && (
              <div className="text-left sm:text-right">
                <div className="text-lg font-bold text-[#0F172A]">
                  {formatPrice(activePlan.priceCents, activePlan.billingInterval)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Plan Cards */}
        {loading ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading subscription plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              No subscription plans configured yet
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              Subscription tiers and session allowances will appear once configured in the system.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan) => {
              const isCurrent = activeSubscription?.planId === plan.id;
              const isBusy = subscribingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`rounded-xl bg-white border p-6 flex flex-col justify-between gap-5 ${
                    isCurrent
                      ? "border-[#1D4ED8] ring-1 ring-[#1D4ED8]"
                      : "border-[#E2E8F0]"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold text-[#0F172A]">{plan.name}</h3>
                      {isCurrent && (
                        <span className="rounded-full bg-[#EFF6FF] text-[#1D4ED8] px-2.5 py-0.5 text-xs font-semibold">
                          Current Plan
                        </span>
                      )}
                    </div>

                    <div className="text-2xl font-extrabold text-[#0F172A]">
                      {formatPrice(plan.priceCents, plan.billingInterval)}
                    </div>

                    {plan.description && (
                      <p className="text-sm text-[#475569]">{plan.description}</p>
                    )}

                    <ul className="space-y-1.5 text-xs text-[#334155] pt-2 border-t border-[#F1F5F9]">
                      {typeof plan.maxStudents === "number" && (
                        <li>
                          • Up to <span className="font-semibold">{plan.maxStudents}</span>{" "}
                          linked student{plan.maxStudents === 1 ? "" : "s"}
                        </li>
                      )}
                      {typeof plan.monthlySessions === "number" && (
                        <li>
                          • <span className="font-semibold">{plan.monthlySessions}</span>{" "}
                          1-on-1 tutoring session{plan.monthlySessions === 1 ? "" : "s"} / month
                        </li>
                      )}
                      {typeof plan.trialDays === "number" && plan.trialDays > 0 && (
                        <li>
                          • Includes <span className="font-semibold">{plan.trialDays}-day</span>{" "}
                          trial period
                        </li>
                      )}
                      {Array.isArray(plan.features) &&
                        plan.features.map((feat, i) => <li key={`${plan.id}-f-${i}`}>• {feat}</li>)}
                    </ul>
                  </div>

                  {canManageSubscription ? (
                    <button
                      type="button"
                      disabled={isCurrent || Boolean(subscribingPlanId)}
                      onClick={() => void handleSubscribe(plan.id)}
                      className="w-full rounded-lg px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60 transition-colors"
                      style={{
                        backgroundColor: isCurrent
                          ? DEEP_BLUE_THEME.colors.navy900
                          : DEEP_BLUE_THEME.colors.royal700,
                      }}
                    >
                      {isCurrent
                        ? "Active Plan"
                        : isBusy
                          ? "Updating..."
                          : "Select Plan"}
                    </button>
                  ) : (
                    <div className="text-xs text-[#64748B] text-center py-2">
                      Managed by parent or administrator
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}