import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface ProgressReportPayload {
  studentId?: string;
  planCompletionPercent?: number;
  completedPlanItems?: number;
  totalPlanItems?: number;
  completedTopicsCount?: number;
  totalTopicsCount?: number;
  averageAssessmentScore?: number | null;
  passedAssessmentsCount?: number;
  completedSessionsCount?: number;
  pointsBalance?: number;
  streakDays?: number;
  badges?: Array<{ id?: string; title: string; description?: string; earnedAt?: string }>;
  recentAssessments?: Array<{
    id?: string;
    title?: string;
    scorePercent: number;
    passed: boolean;
    submittedAt?: string;
  }>;
  subjectBreakdown?: Array<{
    subject: string;
    completedTopics: number;
    totalTopics: number;
  }>;
}

interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
}

function formatGrade(grade: number): string {
  return grade === 0 ? "Kindergarten (K)" : `Grade ${grade}`;
}

export default function ProgressRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStudentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [report, setReport] = useState<ProgressReportPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
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
      if (!selectedStudentId && firstStudent) {
        setSelectedStudentId(firstStudent.id);
      }
    } catch {
      // Non-blocking fallback
    }
  }, [selectedStudentId]);

  const loadProgressReport = useCallback(async (studentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
      const res = await fetch(`/api/v1/progress-report${qs}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 404) {
        setReport(null);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        throw new Error(
          errPayload?.error?.message || `Unable to load progress report (${res.status})`,
        );
      }

      const payload = await res.json();
      const data = payload?.data ?? null;
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load progress report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading) {
      void loadStudents();
    }
  }, [userLoading, loadStudents]);

  useEffect(() => {
    if (!userLoading) {
      void loadProgressReport(selectedStudentId);
    }
  }, [userLoading, selectedStudentId, loadProgressReport]);

  const activeStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId],
  );

  function handleStudentChange(nextId: string) {
    setSelectedStudentId(nextId);
    const nextParams = new URLSearchParams(searchParams);
    if (nextId) {
      nextParams.set("studentId", nextId);
    } else {
      nextParams.delete("studentId");
    }
    setSearchParams(nextParams, { replace: true });
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading progress report...
      </div>
    );
  }

  const planPercent = report?.planCompletionPercent ?? 0;
  const avgScoreText =
    typeof report?.averageAssessmentScore === "number"
      ? `${report.averageAssessmentScore}%`
      : "—";

  return (
    <Layout
      title="Progress Reports & Mastery"
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Progress Reports" },
      ]}
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
              Cross-Feature Learning Analytics
            </div>
            <h2 className="mt-1 text-xl font-bold">
              {activeStudent
                ? `${activeStudent.firstName} ${activeStudent.lastName} — ${formatGrade(
                    activeStudent.gradeLevel,
                  )}`
                : "Student Progress & Mastery Summary"}
            </h2>
            <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
              Review weekly plan completion, curriculum topic progress, assessment scores,
              1-on-1 session attendance, and earned points or badges in one place.
            </p>
          </div>

          {activeStudent && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                to={`/plans?studentId=${encodeURIComponent(activeStudent.id)}`}
                className="rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                Weekly Plans
              </Link>
              <Link
                to={`/sessions?studentId=${encodeURIComponent(activeStudent.id)}`}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#0F172A] hover:bg-blue-50"
              >
                Sessions
              </Link>
            </div>
          )}
        </div>

        {/* Student Selector */}
        {students.length > 0 && (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-medium text-[#475569] mb-1">
                Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({formatGrade(s.gradeLevel)})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-[#64748B]">
              Role scope: <span className="font-semibold text-[#0F172A]">{user?.role ?? "guest"}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-[#FEE2E2] border border-[#FECACA] text-[#991B1B] px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadProgressReport(selectedStudentId)}
              className="underline font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading progress analytics...
          </div>
        ) : (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl bg-white border border-[#E2E8F0] p-5">
                <div className="text-xs font-medium text-[#64748B]">Weekly Plan Completion</div>
                <div className="mt-1.5 text-2xl font-bold text-[#0F172A]">{planPercent}%</div>
                <div className="mt-1 text-xs text-[#475569]">
                  {report?.completedPlanItems ?? 0} of {report?.totalPlanItems ?? 0} items done
                </div>
              </div>

              <div className="rounded-xl bg-white border border-[#E2E8F0] p-5">
                <div className="text-xs font-medium text-[#64748B]">Assessment Average</div>
                <div className="mt-1.5 text-2xl font-bold text-[#0F172A]">{avgScoreText}</div>
                <div className="mt-1 text-xs text-[#475569]">
                  {report?.passedAssessmentsCount ?? 0} passed
                </div>
              </div>

              <div className="rounded-xl bg-white border border-[#E2E8F0] p-5">
                <div className="text-xs font-medium text-[#64748B]">Tutoring Sessions</div>
                <div className="mt-1.5 text-2xl font-bold text-[#0F172A]">
                  {report?.completedSessionsCount ?? 0}
                </div>
                <div className="mt-1 text-xs text-[#475569]">Completed 1-on-1 sessions</div>
              </div>

              <div className="rounded-xl bg-white border border-[#E2E8F0] p-5">
                <div className="text-xs font-medium text-[#64748B]">Points & Streak</div>
                <div className="mt-1.5 text-2xl font-bold text-[#1D4ED8]">
                  {report?.pointsBalance ?? 0} pts
                </div>
                <div className="mt-1 text-xs text-[#475569]">
                  {report?.streakDays ?? 0}-day learning streak
                </div>
              </div>
            </div>

            {/* Subject Breakdown + Recent Assessments & Badges */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Subject Progress */}
              <div className="lg:col-span-6 rounded-xl bg-white border border-[#E2E8F0] p-5 space-y-4">
                <h3 className="text-base font-semibold text-[#0F172A]">
                  Curriculum Topic Progress by Subject
                </h3>

                {report?.subjectBreakdown && report.subjectBreakdown.length > 0 ? (
                  <div className="space-y-3.5">
                    {report.subjectBreakdown.map((subj) => {
                      const pct =
                        subj.totalTopics > 0
                          ? Math.round((subj.completedTopics / subj.totalTopics) * 100)
                          : 0;
                      return (
                        <div key={subj.subject} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="font-semibold text-[#0F172A]">{subj.subject}</span>
                            <span className="text-[#475569]">
                              {subj.completedTopics} / {subj.totalTopics} topics ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-[#E2E8F0] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: DEEP_BLUE_THEME.colors.royal700,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-4 text-xs text-[#64748B]">
                    Topics completed: {report?.completedTopicsCount ?? 0}
                    {typeof report?.totalTopicsCount === "number"
                      ? ` of ${report.totalTopicsCount}`
                      : ""}
                    . Detailed per-subject mastery will appear as topics and assessments are
                    completed.
                  </div>
                )}
              </div>

              {/* Recent Assessments & Badges */}
              <div className="lg:col-span-6 space-y-5">
                <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 space-y-3">
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    Recent Assessment Attempts
                  </h3>
                  {report?.recentAssessments && report.recentAssessments.length > 0 ? (
                    <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden">
                      {report.recentAssessments.map((att, idx) => (
                        <div
                          key={att.id ?? `${idx}`}
                          className="p-3 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-medium text-[#0F172A]">
                            {att.title || "Assessment Attempt"}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 font-semibold ${
                              att.passed
                                ? "bg-[#DCFCE7] text-[#166534]"
                                : "bg-[#FEF3C7] text-[#92400E]"
                            }`}
                          >
                            {att.scorePercent}% • {att.passed ? "Passed" : "Review"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B]">
                      No recent assessment attempts recorded yet.
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 space-y-3">
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    Earned Badges
                  </h3>
                  {report?.badges && report.badges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {report.badges.map((b, idx) => (
                        <span
                          key={b.id ?? `${b.title}-${idx}`}
                          className="rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] px-3 py-1 text-xs font-semibold"
                        >
                          {b.title}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#64748B]">
                      Complete weekly plan items, pass assessments, and attend sessions to earn
                      badges.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}