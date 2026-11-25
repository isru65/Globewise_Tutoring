import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface AssessmentRecord {
  id: string;
  title: string;
  subject: string;
  gradeLevel: number;
  topicId?: string | null;
  passingScore: number;
  timeLimitMinutes?: number | null;
  published?: boolean;
  createdByEmail?: string;
}

export interface AssessmentQuestionRecord {
  id: string;
  assessmentId: string;
  prompt: string;
  questionType?: string;
  options?: string[];
  points?: number;
  sortOrder?: number;
}

export interface AssessmentAttemptRecord {
  id: string;
  assessmentId: string;
  studentId: string;
  scorePercent: number;
  passed: boolean;
  submittedAt?: string;
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

export default function AssessmentsRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [questions, setQuestions] = useState<AssessmentQuestionRecord[]>([]);
  const [attempts, setAttempts] = useState<AssessmentAttemptRecord[]>([]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  const [submittingAttempt, setSubmittingAttempt] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Tutor / Admin create assessment form
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    subject: "Mathematics",
    gradeLevel: 4,
    passingScore: 70,
    timeLimitMinutes: 20,
    samplePrompt: "",
    sampleOptionsText: "Option A, Option B, Option C, Option D",
    sampleCorrectAnswer: "Option A",
  });

  const canCreateAssessment = user?.role === "tutor" || user?.role === "admin";
  const canTakeAssessment = user?.role === "student";

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
      if (!selectedStudentId && firstStudent && user?.role !== "admin") {
        setSelectedStudentId(firstStudent.id);
      }
    } catch {
      // Non-blocking fallback
    }
  }, [selectedStudentId, user?.role]);

  const loadAssessmentsAndAttempts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assessmentsRes, attemptsRes] = await Promise.all([
        fetch("/api/v1/assessments", {
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
        fetch(
          `/api/v1/assessment-attempts${
            selectedStudentId ? `?studentId=${encodeURIComponent(selectedStudentId)}` : ""
          }`,
          {
            credentials: "include",
            headers: { Accept: "application/json" },
          },
        ),
      ]);

      if (assessmentsRes.ok) {
        const payload = await assessmentsRes.json();
        const list: AssessmentRecord[] = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.data?.items)
            ? payload.data.items
            : [];
        setAssessments(list);
        const firstAssessment = list[0];
        if (firstAssessment) {
          const exists = list.some((a) => a.id === selectedAssessmentId);
          if (!exists) {
            setSelectedAssessmentId(firstAssessment.id);
          }
        } else {
          setSelectedAssessmentId("");
          setQuestions([]);
        }
      } else if (assessmentsRes.status !== 404) {
        throw new Error(`Unable to load assessments (${assessmentsRes.status})`);
      } else {
        setAssessments([]);
      }

      if (attemptsRes.ok) {
        const attPayload = await attemptsRes.json();
        const attList: AssessmentAttemptRecord[] = Array.isArray(attPayload?.data)
          ? attPayload.data
          : Array.isArray(attPayload?.data?.items)
            ? attPayload.data.items
            : [];
        setAttempts(attList);
      } else {
        setAttempts([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assessments");
    } finally {
      setLoading(false);
    }
  }, [selectedAssessmentId, selectedStudentId]);

  const loadQuestions = useCallback(async (assessmentId: string) => {
    if (!assessmentId) {
      setQuestions([]);
      setAnswers({});
      return;
    }
    setLoadingQuestions(true);
    try {
      const res = await fetch(
        `/api/v1/assessments/${encodeURIComponent(assessmentId)}/questions`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      if (!res.ok) {
        setQuestions([]);
        setAnswers({});
        setLoadingQuestions(false);
        return;
      }
      const payload = await res.json();
      const qList: AssessmentQuestionRecord[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];
      const sorted = [...qList].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setQuestions(sorted);
      setAnswers({});
    } catch {
      setQuestions([]);
      setAnswers({});
    } finally {
      setLoadingQuestions(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading) {
      void loadStudents();
      void loadAssessmentsAndAttempts();
    }
  }, [userLoading, loadStudents, loadAssessmentsAndAttempts]);

  useEffect(() => {
    void loadQuestions(selectedAssessmentId);
  }, [selectedAssessmentId, loadQuestions]);

  const selectedAssessment = useMemo(
    () => assessments.find((a) => a.id === selectedAssessmentId) ?? null,
    [assessments, selectedAssessmentId],
  );

  const assessmentAttempts = useMemo(
    () => attempts.filter((att) => att.assessmentId === selectedAssessmentId),
    [attempts, selectedAssessmentId],
  );

  async function handleCreateAssessment(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreateAssessment || !createForm.title.trim()) return;

    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const parsedOptions = createForm.sampleOptionsText
        .split(",")
        .map((opt) => opt.trim())
        .filter(Boolean);

      const res = await fetch("/api/v1/assessments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          subject: createForm.subject.trim(),
          gradeLevel: Number(createForm.gradeLevel),
          passingScore: Number(createForm.passingScore) || 70,
          timeLimitMinutes: Number(createForm.timeLimitMinutes) || 20,
          published: true,
          initialQuestion: createForm.samplePrompt.trim()
            ? {
                prompt: createForm.samplePrompt.trim(),
                options: parsedOptions.length > 0 ? parsedOptions : undefined,
                correctAnswer: createForm.sampleCorrectAnswer.trim() || undefined,
              }
            : undefined,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Failed to create assessment (${res.status})`);
      }

      setCreateForm((prev) => ({
        ...prev,
        title: "",
        samplePrompt: "",
      }));
      setShowCreateForm(false);
      setNotice("Assessment created.");
      await loadAssessmentsAndAttempts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create assessment");
    } finally {
      setCreating(false);
    }
  }

  async function handleSubmitAttempt(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssessment) return;

    const targetStudentId = selectedStudentId || students[0]?.id;
    if (!targetStudentId) {
      setError("No student profile found for attempt submission.");
      return;
    }

    setSubmittingAttempt(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/v1/assessments/${encodeURIComponent(selectedAssessment.id)}/attempts/submit`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: targetStudentId,
            answers,
          }),
        },
      );

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Attempt submission failed (${res.status})`);
      }

      const result = payload?.data ?? {};
      const score =
        typeof result.scorePercent === "number" ? `${result.scorePercent}%` : "recorded";
      const statusLabel = result.passed === true ? "Passed" : result.passed === false ? "Needs Review" : "Submitted";
      setNotice(`Attempt submitted — Score: ${score} (${statusLabel}).`);
      await loadAssessmentsAndAttempts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit assessment attempt");
    } finally {
      setSubmittingAttempt(false);
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading assessments workspace...
      </div>
    );
  }

  return (
    <Layout
      title="Assessments & Mastery Checks"
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Assessments" },
      ]}
      currentUser={user}
      onSignOut={() => {
        void refreshUser();
      }}
      headerActions={
        canCreateAssessment ? (
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            {showCreateForm ? "Close Form" : "+ New Assessment"}
          </button>
        ) : undefined
      }
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
            Skill Mastery & Quizzes
          </div>
          <h2 className="mt-1 text-xl font-bold">
            Topic Assessments, Attempts & Passing Status
          </h2>
          <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
            Complete structured quizzes and skill checks, review scores against passing thresholds,
            and track attempt history across linked or assigned learners.
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

        {/* Tutor / Admin Create Assessment Form */}
        {canCreateAssessment && showCreateForm && (
          <form
            onSubmit={handleCreateAssessment}
            className="rounded-xl bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs"
          >
            <h3 className="text-base font-semibold text-[#0F172A]">
              Create Assessment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Assessment Title
                </label>
                <input
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, title: e.target.value }))
                  }
                  placeholder="e.g. Grade 4 Fractions Mastery Quiz"
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={createForm.subject}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, subject: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Grade Level
                </label>
                <select
                  value={createForm.gradeLevel}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, gradeLevel: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                    <option key={g} value={g}>
                      {formatGrade(g)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={createForm.passingScore}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, passingScore: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={createForm.timeLimitMinutes}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      timeLimitMinutes: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#F1F5F9]">
              <div className="sm:col-span-3 text-xs font-semibold text-[#475569]">
                Optional Initial Question
              </div>
              <div className="sm:col-span-3">
                <input
                  type="text"
                  value={createForm.samplePrompt}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, samplePrompt: e.target.value }))
                  }
                  placeholder="Question prompt (optional)..."
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={createForm.sampleOptionsText}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, sampleOptionsText: e.target.value }))
                  }
                  placeholder="Comma-separated choices"
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={createForm.sampleCorrectAnswer}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      sampleCorrectAnswer: e.target.value,
                    }))
                  }
                  placeholder="Correct answer"
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
              >
                {creating ? "Creating..." : "Save Assessment"}
              </button>
            </div>
          </form>
        )}

        {/* Student Scope Selector (for Parent / Tutor / Admin) */}
        {students.length > 0 && (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-medium text-[#475569] mb-1">
                Student Context for Attempts
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
              >
                {user?.role === "admin" && <option value="">All Accessible Students</option>}
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({formatGrade(s.gradeLevel)})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-[#64748B]">
              <span className="font-semibold text-[#0F172A]">{assessments.length}</span>{" "}
              assessment{assessments.length === 1 ? "" : "s"} available
            </div>
          </div>
        )}

        {/* Main Assessments Workspace */}
        {loading ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading assessments...
          </div>
        ) : assessments.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              No assessments available yet
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              {canCreateAssessment
                ? "Click '+ New Assessment' above to create a quiz or mastery check."
                : "Your tutor will publish skill assessments here as you progress through topics."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Assessment List */}
            <div className="lg:col-span-4 space-y-3">
              {assessments.map((item) => {
                const isSelected = item.id === selectedAssessmentId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedAssessmentId(item.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? "bg-[#EFF6FF] border-[#1D4ED8]"
                        : "bg-white border-[#E2E8F0] hover:border-[#93C5FD]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1D4ED8]">
                        {formatGrade(item.gradeLevel)} • {item.subject}
                      </span>
                      <span className="text-xs font-medium text-[#475569]">
                        Pass: {item.passingScore}%
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-[#0F172A]">
                      {item.title}
                    </div>
                    {item.timeLimitMinutes && (
                      <div className="mt-1 text-xs text-[#64748B]">
                        Time limit: {item.timeLimitMinutes} mins
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: Attempt Runner / Questions + Attempt History */}
            <div className="lg:col-span-8 space-y-5">
              {selectedAssessment && (
                <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 space-y-4">
                  <div className="border-b border-[#E2E8F0] pb-3.5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                        {formatGrade(selectedAssessment.gradeLevel)} • {selectedAssessment.subject}
                      </div>
                      <h3 className="text-lg font-bold text-[#0F172A] mt-0.5">
                        {selectedAssessment.title}
                      </h3>
                    </div>
                    <div className="text-xs font-semibold text-[#0F172A] rounded-full bg-[#EFF6FF] px-3 py-1">
                      Passing Score: {selectedAssessment.passingScore}%
                    </div>
                  </div>

                  {loadingQuestions ? (
                    <div className="text-xs text-[#64748B] py-4">Loading questions...</div>
                  ) : questions.length === 0 ? (
                    <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-4 text-xs text-[#64748B]">
                      No questions attached to this assessment yet.
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitAttempt} className="space-y-4">
                      {questions.map((q, index) => (
                        <div
                          key={q.id}
                          className="rounded-lg border border-[#E2E8F0] p-4 space-y-2.5"
                        >
                          <div className="text-sm font-semibold text-[#0F172A]">
                            {index + 1}. {q.prompt}
                          </div>

                          {q.options && q.options.length > 0 ? (
                            <div className="space-y-1.5">
                              {q.options.map((opt) => (
                                <label
                                  key={opt}
                                  className="flex items-center gap-2.5 text-sm text-[#334155] cursor-pointer"
                                >
                                  <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    value={opt}
                                    checked={answers[q.id] === opt}
                                    onChange={() =>
                                      setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                                    }
                                    className="text-[#1D4ED8] focus:ring-[#1D4ED8]"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={answers[q.id] ?? ""}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                              placeholder="Enter your answer..."
                              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                            />
                          )}
                        </div>
                      ))}

                      {canTakeAssessment && (
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={submittingAttempt}
                            className="rounded-lg px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
                          >
                            {submittingAttempt ? "Submitting..." : "Submit Attempt"}
                          </button>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              )}

              {/* Attempt History */}
              <div className="rounded-xl bg-white border border-[#E2E8F0] p-5 space-y-3">
                <h4 className="text-sm font-semibold text-[#0F172A]">
                  Recorded Attempts for Selected Assessment
                </h4>
                {assessmentAttempts.length === 0 ? (
                  <p className="text-xs text-[#64748B]">
                    No attempts recorded yet for this assessment.
                  </p>
                ) : (
                  <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-lg overflow-hidden">
                    {assessmentAttempts.map((att) => (
                      <div
                        key={att.id}
                        className="p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-[#0F172A]">
                            Score: {att.scorePercent}%
                          </span>
                          {att.submittedAt && (
                            <span className="text-[#64748B] ml-2">
                              • {new Date(att.submittedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-semibold ${
                            att.passed
                              ? "bg-[#DCFCE7] text-[#166534]"
                              : "bg-[#FEF3C7] text-[#92400E]"
                          }`}
                        >
                          {att.passed ? "Passed" : "Needs Practice"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}