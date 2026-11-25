import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface AiOutputRecord {
  id: string;
  jobType: string;
  gradeLevel: number;
  subject: string;
  topic?: string;
  criteria?: string;
  title: string;
  body: string;
  reviewStatus: string;
  requestedByEmail: string;
  reviewedByEmail?: string | null;
  createdAt?: string;
}

const JOB_TYPES = [
  { value: "lesson_draft", label: "Lesson Draft" },
  { value: "concept_explanation", label: "Concept Explanation" },
  { value: "practice_questions", label: "Practice Questions" },
  { value: "coding_exercise", label: "Coding Exercise" },
];

function formatGrade(grade: number): string {
  return grade === 0 ? "Kindergarten (K)" : `Grade ${grade}`;
}

function getReviewBadgeClass(status: string): string {
  switch (status) {
    case "approved":
      return "bg-[#DCFCE7] text-[#166534]";
    case "rejected":
      return "bg-[#FEE2E2] text-[#991B1B]";
    case "edited":
      return "bg-[#E0F2FE] text-[#075985]";
    default:
      return "bg-[#FEF3C7] text-[#92400E]";
  }
}

export default function AiRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();

  const [outputs, setOutputs] = useState<AiOutputRecord[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");

  // Generator form state (Tutor / Admin)
  const [showGenerator, setShowGenerator] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [genForm, setGenForm] = useState({
    jobType: "lesson_draft",
    gradeLevel: 4,
    subject: "Mathematics",
    topic: "",
    criteria: "",
  });

  // Review action state
  const [reviewing, setReviewing] = useState<boolean>(false);

  const canGenerateAndReview = user?.role === "tutor" || user?.role === "admin";

  const loadOutputs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/ai/outputs", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 404) {
        setOutputs([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Unable to load AI outputs (${res.status})`);
      }

      const payload = await res.json();
      const list: AiOutputRecord[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];

      // Non-tutors/admins only see approved outputs
      const visible = canGenerateAndReview
        ? list
        : list.filter((item) => item.reviewStatus === "approved");

      setOutputs(visible);
      const firstVisible = visible[0];
      if (firstVisible) {
        const exists = visible.some((item) => item.id === selectedOutputId);
        if (!exists) {
          setSelectedOutputId(firstVisible.id);
        }
      } else {
        setSelectedOutputId("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI content");
    } finally {
      setLoading(false);
    }
  }, [canGenerateAndReview, selectedOutputId]);

  useEffect(() => {
    if (!userLoading) {
      void loadOutputs();
    }
  }, [userLoading, loadOutputs]);

  const subjects = useMemo(() => {
    const set = new Set<string>(["Mathematics", "Science", "English Language Arts", "Coding"]);
    for (const item of outputs) {
      if (item.subject) set.add(item.subject);
    }
    return ["all", ...Array.from(set)];
  }, [outputs]);

  const filteredOutputs = useMemo(() => {
    return outputs.filter((item) => {
      if (statusFilter !== "all" && item.reviewStatus !== statusFilter) {
        return false;
      }
      if (subjectFilter !== "all" && item.subject !== subjectFilter) {
        return false;
      }
      return true;
    });
  }, [outputs, statusFilter, subjectFilter]);

  const selectedOutput = useMemo(
    () => filteredOutputs.find((o) => o.id === selectedOutputId) ?? outputs.find((o) => o.id === selectedOutputId) ?? null,
    [filteredOutputs, outputs, selectedOutputId],
  );

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!canGenerateAndReview) return;
    if (!genForm.topic.trim()) {
      setError("Please enter a topic before generating content.");
      return;
    }

    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/v1/ai/generations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobType: genForm.jobType,
          gradeLevel: Number(genForm.gradeLevel),
          subject: genForm.subject.trim(),
          topic: genForm.topic.trim(),
          criteria: genForm.criteria.trim(),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Generation failed (${res.status})`);
      }

      setGenForm((prev) => ({ ...prev, topic: "", criteria: "" }));
      setShowGenerator(false);
      setNotice("AI draft generated and placed in the tutor review queue.");
      await loadOutputs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate AI content");
    } finally {
      setGenerating(false);
    }
  }

  async function handleReviewAction(reviewStatus: "approved" | "rejected") {
    if (!canGenerateAndReview || !selectedOutput) return;
    setReviewing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/v1/ai/outputs/${encodeURIComponent(selectedOutput.id)}/review`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewStatus }),
        },
      );

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Review update failed (${res.status})`);
      }

      setNotice(`AI output marked as ${reviewStatus}.`);
      await loadOutputs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update AI output review status");
    } finally {
      setReviewing(false);
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading AI content studio...
      </div>
    );
  }

  return (
    <Layout
      title="AI Content Generator & Review"
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "AI Content" },
      ]}
      currentUser={user}
      onSignOut={() => {
        void refreshUser();
      }}
      headerActions={
        canGenerateAndReview ? (
          <button
            type="button"
            onClick={() => setShowGenerator((prev) => !prev)}
            className="rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            {showGenerator ? "Close Generator" : "+ Generate Draft"}
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
            Human-in-the-Loop AI Workflow
          </div>
          <h2 className="mt-1 text-xl font-bold">
            AI Lesson, Practice & Coding Drafts with Tutor Approval
          </h2>
          <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
            Generate grade-appropriate explanations, practice problems, and coding exercises using
            minimized topic context, with mandatory tutor review before learner use.
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

        {/* AI Generator Form (Tutors & Admins) */}
        {canGenerateAndReview && showGenerator && (
          <form
            onSubmit={handleGenerate}
            className="rounded-xl bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs"
          >
            <h3 className="text-base font-semibold text-[#0F172A]">
              Generate Learning Material Draft
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Content Type
                </label>
                <select
                  value={genForm.jobType}
                  onChange={(e) =>
                    setGenForm((p) => ({ ...p, jobType: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
                >
                  {JOB_TYPES.map((jt) => (
                    <option key={jt.value} value={jt.value}>
                      {jt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Grade Level
                </label>
                <select
                  value={genForm.gradeLevel}
                  onChange={(e) =>
                    setGenForm((p) => ({ ...p, gradeLevel: Number(e.target.value) }))
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

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={genForm.subject}
                  onChange={(e) =>
                    setGenForm((p) => ({ ...p, subject: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  placeholder="e.g. Mathematics, Coding"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">
                Topic Focus
              </label>
              <input
                type="text"
                required
                value={genForm.topic}
                onChange={(e) => setGenForm((p) => ({ ...p, topic: e.target.value }))}
                className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                placeholder="e.g. Adding Fractions with Unlike Denominators or Loops in Python"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1">
                Pedagogical Criteria & Constraints (No Student PII)
              </label>
              <textarea
                rows={2}
                value={genForm.criteria}
                onChange={(e) =>
                  setGenForm((p) => ({ ...p, criteria: e.target.value }))
                }
                className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                placeholder="Include 3 scaffolded examples, visual explanation notes, and 2 practice checks..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={generating}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
              >
                {generating ? "Generating..." : "Generate Draft"}
              </button>
            </div>
          </form>
        )}

        {/* Filters */}
        <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Subject
            </label>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
            >
              {subjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj === "all" ? "All Subjects" : subj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Review Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft / Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="edited">Edited</option>
            </select>
          </div>
        </div>

        {/* Outputs List + Preview & Review */}
        {loading ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading AI content drafts...
          </div>
        ) : filteredOutputs.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              No AI content items available
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              {canGenerateAndReview
                ? "Click '+ Generate Draft' to create a lesson, explanation, practice set, or coding exercise."
                : "Approved AI learning materials will appear here once reviewed by a tutor."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Drafts Queue */}
            <div className="lg:col-span-4 space-y-3">
              {filteredOutputs.map((item) => {
                const isSelected = item.id === selectedOutput?.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedOutputId(item.id)}
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
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getReviewBadgeClass(
                          item.reviewStatus,
                        )}`}
                      >
                        {item.reviewStatus.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-[#0F172A] line-clamp-2">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs text-[#64748B]">
                      {item.jobType.replace("_", " ")}
                      {item.topic ? ` • ${item.topic}` : ""}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Draft Content & Tutor Review */}
            <div className="lg:col-span-8 rounded-xl bg-white border border-[#E2E8F0] p-5 space-y-4">
              {selectedOutput ? (
                <>
                  <div className="border-b border-[#E2E8F0] pb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                        {formatGrade(selectedOutput.gradeLevel)} • {selectedOutput.subject} •{" "}
                        {selectedOutput.jobType.replace("_", " ")}
                      </div>
                      <h3 className="text-lg font-bold text-[#0F172A] mt-0.5">
                        {selectedOutput.title}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-1">
                        Requested by {selectedOutput.requestedByEmail}
                        {selectedOutput.reviewedByEmail
                          ? ` • Reviewed by ${selectedOutput.reviewedByEmail}`
                          : ""}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getReviewBadgeClass(
                        selectedOutput.reviewStatus,
                      )}`}
                    >
                      {selectedOutput.reviewStatus.replace("_", " ")}
                    </span>
                  </div>

                  {selectedOutput.criteria && (
                    <div className="rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] px-3.5 py-2.5 text-xs text-[#1E3A8A]">
                      <span className="font-semibold">Criteria:</span> {selectedOutput.criteria}
                    </div>
                  )}

                  <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-4 text-sm text-[#0F172A] whitespace-pre-wrap leading-relaxed">
                    {selectedOutput.body}
                  </div>

                  {canGenerateAndReview && (
                    <div className="pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={reviewing}
                        onClick={() => void handleReviewAction("rejected")}
                        className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] px-4 py-2 text-xs font-semibold hover:bg-[#FEE2E2] disabled:opacity-60"
                      >
                        Reject Draft
                      </button>
                      <button
                        type="button"
                        disabled={reviewing}
                        onClick={() => void handleReviewAction("approved")}
                        className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                        style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
                      >
                        {reviewing ? "Updating..." : "Approve for Use"}
                      </button>
                    </div>
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