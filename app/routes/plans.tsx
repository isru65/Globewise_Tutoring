import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface LearningPlanRecord {
  id: string;
  studentId: string;
  weekStart: string;
  status: string;
  tutorNotes?: string;
  createdByEmail: string;
  publishedAt?: string | null;
  createdAt?: string;
}

export interface LearningPlanItemRecord {
  id: string;
  planId: string;
  topicId?: string | null;
  title: string;
  activityType: string;
  estimatedMinutes: number;
  completed: boolean;
  completedAt?: string | null;
  sortOrder?: number;
}

interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
}

function getDefaultWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday),
  );
  return monday.toISOString().slice(0, 10);
}

function getPlanStatusBadge(status: string): string {
  switch (status) {
    case "published":
    case "active":
      return "bg-[#DCFCE7] text-[#166534]";
    case "completed":
      return "bg-[#E0F2FE] text-[#075985]";
    case "pending_review":
    case "approved":
      return "bg-[#FEF3C7] text-[#92400E]";
    default:
      return "bg-[#F1F5F9] text-[#475569]";
  }
}

export default function PlansRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStudentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [plans, setPlans] = useState<LearningPlanRecord[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [items, setItems] = useState<LearningPlanItemRecord[]>([]);

  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create plan form state (Tutor / Admin)
  const [showCreatePlan, setShowCreatePlan] = useState<boolean>(false);
  const [creatingPlan, setCreatingPlan] = useState<boolean>(false);
  const [planForm, setPlanForm] = useState({
    studentId: initialStudentId,
    weekStart: getDefaultWeekStart(),
    tutorNotes: "",
  });

  // Add item form state (Tutor / Admin)
  const [newItem, setNewItem] = useState({
    title: "",
    activityType: "Lesson",
    estimatedMinutes: 30,
  });
  const [addingItem, setAddingItem] = useState<boolean>(false);

  const canManagePlans = user?.role === "tutor" || user?.role === "admin";
  const canCompleteItems =
    user?.role === "student" || user?.role === "tutor" || user?.role === "admin";

  const loadAccessibleStudents = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/me?page=1&page_size=100", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const payload = await res.json();
      const list: StudentSummary[] = Array.isArray(payload?.data?.accessibleStudents?.data)
        ? payload.data.accessibleStudents.data
        : [];
      setStudents(list);

      const firstStudent = list[0];
      if (!selectedStudentId && firstStudent && user?.role !== "admin") {
        setSelectedStudentId(firstStudent.id);
        setPlanForm((prev) => ({ ...prev, studentId: firstStudent.id }));
      }
    } catch {
      // Non-blocking fallback
    }
  }, [selectedStudentId, user?.role]);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (selectedStudentId) qs.set("studentId", selectedStudentId);

      const url = `/api/v1/learning-plans${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 404) {
        setPlans([]);
        setLoadingPlans(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Unable to load weekly learning plans (${res.status})`);
      }

      const payload = await res.json();
      const list: LearningPlanRecord[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];

      // Students only see published/active/completed plans once published
      const visiblePlans =
        user?.role === "student"
          ? list.filter((p) => p.status !== "draft")
          : list;

      setPlans(visiblePlans);
      const firstPlan = visiblePlans[0];
      if (firstPlan) {
        const exists = visiblePlans.some((p) => p.id === selectedPlanId);
        if (!exists) {
          setSelectedPlanId(firstPlan.id);
        }
      } else {
        setSelectedPlanId("");
        setItems([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load learning plans");
    } finally {
      setLoadingPlans(false);
    }
  }, [selectedStudentId, selectedPlanId, user?.role]);

  const loadPlanItems = useCallback(async (planId: string) => {
    if (!planId) {
      setItems([]);
      return;
    }
    setLoadingItems(true);
    try {
      const res = await fetch(
        `/api/v1/learning-plan-items?planId=${encodeURIComponent(planId)}`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      if (!res.ok) {
        setItems([]);
        setLoadingItems(false);
        return;
      }
      const payload = await res.json();
      const list: LearningPlanItemRecord[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];
      setItems([...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading) {
      void loadAccessibleStudents();
      void loadPlans();
    }
  }, [userLoading, loadAccessibleStudents, loadPlans]);

  useEffect(() => {
    void loadPlanItems(selectedPlanId);
  }, [selectedPlanId, loadPlanItems]);

  const studentLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      map.set(s.id, `${s.firstName} ${s.lastName} (Grade ${s.gradeLevel === 0 ? "K" : s.gradeLevel})`);
    }
    return map;
  }, [students]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const completionSummary = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [items]);

  function handleStudentFilterChange(nextStudentId: string) {
    setSelectedStudentId(nextStudentId);
    setPlanForm((prev) => ({ ...prev, studentId: nextStudentId || prev.studentId }));
    const nextParams = new URLSearchParams(searchParams);
    if (nextStudentId) {
      nextParams.set("studentId", nextStudentId);
    } else {
      nextParams.delete("studentId");
    }
    setSearchParams(nextParams, { replace: true });
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!canManagePlans) return;
    const targetStudentId = planForm.studentId || selectedStudentId;
    if (!targetStudentId) {
      setError("Please select a student for the weekly plan.");
      return;
    }

    setCreatingPlan(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/v1/learning-plans", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: targetStudentId,
          weekStart: planForm.weekStart,
          tutorNotes: planForm.tutorNotes.trim(),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Failed to create plan (${res.status})`);
      }

      setPlanForm((prev) => ({ ...prev, tutorNotes: "" }));
      setShowCreatePlan(false);
      setNotice("Weekly learning plan created as draft.");
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create learning plan");
    } finally {
      setCreatingPlan(false);
    }
  }

  async function handlePublishPlan(planId: string) {
    if (!canManagePlans) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/learning-plans/${encodeURIComponent(planId)}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Failed to publish plan (${res.status})`);
      }
      setNotice("Weekly plan published and visible to student & parent.");
      await loadPlans();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish plan");
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!canManagePlans || !selectedPlanId || !newItem.title.trim()) return;

    setAddingItem(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/v1/learning-plan-items", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          title: newItem.title.trim(),
          activityType: newItem.activityType,
          estimatedMinutes: Number(newItem.estimatedMinutes) || 30,
          sortOrder: items.length + 1,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Failed to add item (${res.status})`);
      }
      setNewItem((prev) => ({ ...prev, title: "" }));
      setNotice("Plan item added.");
      await loadPlanItems(selectedPlanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add plan item");
    } finally {
      setAddingItem(false);
    }
  }

  async function handleToggleComplete(item: LearningPlanItemRecord) {
    if (!canCompleteItems) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/learning-plan-items/${encodeURIComponent(item.id)}/complete`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: !item.completed }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Failed to update item (${res.status})`);
      }
      await loadPlanItems(selectedPlanId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update item completion");
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading weekly learning plans...
      </div>
    );
  }

  return (
    <Layout
      title="Weekly Learning Plans"
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Weekly Plans" },
      ]}
      currentUser={user}
      onSignOut={() => {
        void refreshUser();
      }}
      headerActions={
        canManagePlans ? (
          <button
            type="button"
            onClick={() => setShowCreatePlan((prev) => !prev)}
            className="rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            {showCreatePlan ? "Close Form" : "+ New Weekly Plan"}
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Deep Blue / Navy Banner */}
        <div
          className="rounded-xl p-5 sm:p-6 text-white"
          style={{
            background: `linear-gradient(120deg, ${DEEP_BLUE_THEME.colors.navy900} 0%, ${DEEP_BLUE_THEME.colors.navy800} 100%)`,
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
            Weekly Learning Plan Workflow
          </div>
          <h2 className="mt-1 text-xl font-bold">
            Structured Weekly Plans, Activities & Completion Tracking
          </h2>
          <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
            Tutors organize weekly lessons, practice sets, coding activities, and quizzes; once
            published, students complete items and parents monitor progress.
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

        {/* Create Weekly Plan Form (Tutors & Admins) */}
        {canManagePlans && showCreatePlan && (
          <form
            onSubmit={handleCreatePlan}
            className="rounded-xl bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs"
          >
            <h3 className="text-base font-semibold text-[#0F172A]">
              Create Weekly Learning Plan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Student
                </label>
                {students.length > 0 ? (
                  <select
                    value={planForm.studentId}
                    onChange={(e) =>
                      setPlanForm((p) => ({ ...p, studentId: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={planForm.studentId}
                    onChange={(e) =>
                      setPlanForm((p) => ({ ...p, studentId: e.target.value }))
                    }
                    placeholder="Student ID"
                    className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Week Starting (Monday)
                </label>
                <input
                  type="date"
                  required
                  value={planForm.weekStart}
                  onChange={(e) =>
                    setPlanForm((p) => ({ ...p, weekStart: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">
                Tutor Notes & Weekly Focus
              </label>
              <textarea
                rows={2}
                value={planForm.tutorNotes}
                onChange={(e) =>
                  setPlanForm((p) => ({ ...p, tutorNotes: e.target.value }))
                }
                placeholder="Goals for this week's lessons, coding practice, or quiz..."
                className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreatePlan(false)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingPlan}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
              >
                {creatingPlan ? "Creating..." : "Create Draft Plan"}
              </button>
            </div>
          </form>
        )}

        {/* Student Filter */}
        <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 max-w-md">
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Filter by Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => handleStudentFilterChange(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
            >
              <option value="">All Accessible Students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="text-xs text-[#64748B]">
            <span className="font-semibold text-[#0F172A]">{plans.length}</span> weekly plan
            {plans.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Plans List + Selected Plan Items */}
        {loadingPlans ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading weekly learning plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              No weekly learning plans available
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              {canManagePlans
                ? "Click '+ New Weekly Plan' to build a weekly learning schedule for a student."
                : "Your weekly learning plan will appear here once published by your tutor."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Weekly Plans */}
            <div className="lg:col-span-4 space-y-3">
              {plans.map((plan) => {
                const active = plan.id === selectedPlanId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      active
                        ? "bg-[#EFF6FF] border-[#1D4ED8]"
                        : "bg-white border-[#E2E8F0] hover:border-[#93C5FD]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1D4ED8]">
                        Week of {plan.weekStart}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getPlanStatusBadge(
                          plan.status,
                        )}`}
                      >
                        {plan.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-[#0F172A]">
                      {studentLabelById.get(plan.studentId) ?? `Student: ${plan.studentId}`}
                    </div>
                    {plan.tutorNotes && (
                      <p className="mt-1 text-xs text-[#475569] line-clamp-2">
                        {plan.tutorNotes}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: Selected Plan Items & Completion */}
            <div className="lg:col-span-8 rounded-xl bg-white border border-[#E2E8F0] p-5 space-y-5">
              {selectedPlan ? (
                <>
                  <div className="border-b border-[#E2E8F0] pb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                        Week Starting {selectedPlan.weekStart}
                      </div>
                      <h3 className="text-base font-bold text-[#0F172A] mt-0.5">
                        {studentLabelById.get(selectedPlan.studentId) ??
                          `Student: ${selectedPlan.studentId}`}
                      </h3>
                      {selectedPlan.tutorNotes && (
                        <p className="mt-1 text-sm text-[#475569]">
                          {selectedPlan.tutorNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getPlanStatusBadge(
                          selectedPlan.status,
                        )}`}
                      >
                        {selectedPlan.status.replace("_", " ")}
                      </span>
                      {canManagePlans && selectedPlan.status === "draft" && (
                        <button
                          type="button"
                          onClick={() => void handlePublishPlan(selectedPlan.id)}
                          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
                        >
                          Publish Plan
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Completion Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium text-[#475569]">
                      <span>Weekly Activity Completion</span>
                      <span className="font-semibold text-[#0F172A]">
                        {completionSummary.completed} / {completionSummary.total} (
                        {completionSummary.percent}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${completionSummary.percent}%`,
                          backgroundColor: DEEP_BLUE_THEME.colors.royal700,
                        }}
                      />
                    </div>
                  </div>

                  {/* Plan Items List */}
                  {loadingItems ? (
                    <div className="text-xs text-[#64748B] py-4">
                      Loading plan activities...
                    </div>
                  ) : items.length === 0 ? (
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-4 text-xs text-[#64748B]">
                      No learning activities added to this plan yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 bg-white flex items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              disabled={!canCompleteItems}
                              onChange={() => void handleToggleComplete(item)}
                              aria-label={`Mark ${item.title} completed`}
                              className="mt-1 h-4 w-4 rounded border-[#CBD5E1] text-[#1D4ED8] focus:ring-[#1D4ED8] disabled:opacity-50"
                            />
                            <div className="min-w-0">
                              <div
                                className={`text-sm font-semibold ${
                                  item.completed
                                    ? "line-through text-[#64748B]"
                                    : "text-[#0F172A]"
                                }`}
                              >
                                {item.title}
                              </div>
                              <div className="text-xs text-[#64748B] mt-0.5">
                                {item.activityType} • {item.estimatedMinutes} mins
                              </div>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              item.completed
                                ? "bg-[#DCFCE7] text-[#166534]"
                                : "bg-[#F1F5F9] text-[#475569]"
                            }`}
                          >
                            {item.completed ? "Done" : "Pending"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Plan Item Form (Tutors & Admins) */}
                  {canManagePlans && (
                    <form
                      onSubmit={handleAddItem}
                      className="pt-4 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                    >
                      <div className="sm:col-span-6">
                        <label className="block text-xs font-medium text-[#475569] mb-1">
                          Activity Title
                        </label>
                        <input
                          type="text"
                          required
                          value={newItem.title}
                          onChange={(e) =>
                            setNewItem((p) => ({ ...p, title: e.target.value }))
                          }
                          placeholder="e.g. Fraction Equivalence Practice"
                          className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-xs font-medium text-[#475569] mb-1">
                          Type
                        </label>
                        <select
                          value={newItem.activityType}
                          onChange={(e) =>
                            setNewItem((p) => ({ ...p, activityType: e.target.value }))
                          }
                          className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
                        >
                          <option value="Lesson">Lesson</option>
                          <option value="Practice">Practice</option>
                          <option value="Coding">Coding</option>
                          <option value="Assessment">Assessment</option>
                          <option value="Session">Session</option>
                        </select>
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-xs font-medium text-[#475569] mb-1">
                          Mins
                        </label>
                        <input
                          type="number"
                          min={5}
                          max={240}
                          value={newItem.estimatedMinutes}
                          onChange={(e) =>
                            setNewItem((p) => ({
                              ...p,
                              estimatedMinutes: Number(e.target.value),
                            }))
                          }
                          className="w-full rounded-lg border border-[#CBD5E1] px-2 py-2 text-sm"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          disabled={addingItem}
                          className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
                        >
                          {addingItem ? "Adding..." : "+ Add Item"}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}