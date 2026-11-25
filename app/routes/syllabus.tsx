import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface SyllabusUploadRecord {
  id: string;
  studentId: string;
  weekStart: string;
  fileName: string;
  fileType: string;
  status: string;
  uploadedByEmail: string;
  reviewedByEmail?: string | null;
  reviewNote?: string;
  createdAt?: string;
}

export interface SyllabusTopicRecord {
  id: string;
  uploadId: string;
  schoolSubject: string;
  schoolTopic: string;
  schoolDate?: string;
  objective?: string;
  suggestedTopicId?: string | null;
  curriculumTopicId?: string | null;
  mappingConfirmed: boolean;
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

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "approved":
      return "bg-[#DCFCE7] text-[#166534]";
    case "rejected":
      return "bg-[#FEE2E2] text-[#991B1B]";
    case "in_review":
    case "extracted":
    case "extracting":
      return "bg-[#FEF3C7] text-[#92400E]";
    default:
      return "bg-[#E0F2FE] text-[#075985]";
  }
}

export default function SyllabusRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStudentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [uploads, setUploads] = useState<SyllabusUploadRecord[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>("");
  const [topics, setTopics] = useState<SyllabusTopicRecord[]>([]);

  const [loadingUploads, setLoadingUploads] = useState<boolean>(true);
  const [loadingTopics, setLoadingTopics] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Upload form state (Parent / Admin)
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadForm, setUploadForm] = useState({
    studentId: initialStudentId,
    weekStart: getDefaultWeekStart(),
    fileName: "",
    fileType: "application/pdf",
  });

  // Tutor review state
  const [reviewNote, setReviewNote] = useState<string>("");
  const [reviewing, setReviewing] = useState<boolean>(false);

  const canUpload = user?.role === "parent" || user?.role === "admin";
  const canReview = user?.role === "tutor" || user?.role === "admin";

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
      if (!selectedStudentId && firstStudent && user?.role === "parent") {
        setSelectedStudentId(firstStudent.id);
        setUploadForm((prev) => ({ ...prev, studentId: firstStudent.id }));
      }
    } catch {
      // Non-blocking fallback
    }
  }, [selectedStudentId, user?.role]);

  const loadUploads = useCallback(async () => {
    setLoadingUploads(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (selectedStudentId) qs.set("studentId", selectedStudentId);

      const url = `/api/v1/syllabus-uploads${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 404) {
        setUploads([]);
        setLoadingUploads(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Unable to load syllabus uploads (${res.status})`);
      }

      const payload = await res.json();
      const list: SyllabusUploadRecord[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];

      setUploads(list);
      const firstUpload = list[0];
      if (firstUpload) {
        const stillExists = list.some((u) => u.id === selectedUploadId);
        if (!stillExists) {
          setSelectedUploadId(firstUpload.id);
        }
      } else {
        setSelectedUploadId("");
        setTopics([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load syllabi");
    } finally {
      setLoadingUploads(false);
    }
  }, [selectedStudentId, selectedUploadId]);

  const loadUploadTopics = useCallback(async (uploadId: string) => {
    if (!uploadId) {
      setTopics([]);
      return;
    }
    setLoadingTopics(true);
    try {
      const res = await fetch(
        `/api/v1/syllabus-topics?uploadId=${encodeURIComponent(uploadId)}`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      if (!res.ok) {
        setTopics([]);
        setLoadingTopics(false);
        return;
      }
      const payload = await res.json();
      const items: SyllabusTopicRecord[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];
      setTopics(
        [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
      );
    } catch {
      setTopics([]);
    } finally {
      setLoadingTopics(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading) {
      void loadAccessibleStudents();
      void loadUploads();
    }
  }, [userLoading, loadAccessibleStudents, loadUploads]);

  useEffect(() => {
    void loadUploadTopics(selectedUploadId);
    const active = uploads.find((u) => u.id === selectedUploadId);
    setReviewNote(active?.reviewNote ?? "");
  }, [selectedUploadId, uploads, loadUploadTopics]);

  const studentNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) {
      map.set(s.id, `${s.firstName} ${s.lastName} (Grade ${s.gradeLevel === 0 ? "K" : s.gradeLevel})`);
    }
    return map;
  }, [students]);

  const selectedUpload = useMemo(
    () => uploads.find((u) => u.id === selectedUploadId) ?? null,
    [uploads, selectedUploadId],
  );

  function handleStudentFilterChange(nextId: string) {
    setSelectedStudentId(nextId);
    setUploadForm((prev) => ({ ...prev, studentId: nextId || prev.studentId }));
    const nextParams = new URLSearchParams(searchParams);
    if (nextId) {
      nextParams.set("studentId", nextId);
    } else {
      nextParams.delete("studentId");
    }
    setSearchParams(nextParams, { replace: true });
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canUpload) return;

    const targetStudentId = uploadForm.studentId || selectedStudentId;
    if (!targetStudentId || !uploadForm.fileName.trim()) {
      setError("Please select a student and enter or choose a syllabus file name.");
      return;
    }

    setUploading(true);
    setError(null);
    setActionNotice(null);
    try {
      const res = await fetch("/api/v1/syllabus-uploads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: targetStudentId,
          weekStart: uploadForm.weekStart,
          fileName: uploadForm.fileName.trim(),
          fileType: uploadForm.fileType,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Upload failed (${res.status})`);
      }

      setUploadForm((prev) => ({ ...prev, fileName: "" }));
      setShowUploadForm(false);
      setActionNotice("Syllabus uploaded and queued for review.");
      await loadUploads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload syllabus");
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmMapping(topic: SyllabusTopicRecord) {
    if (!canReview) return;
    setActionNotice(null);
    try {
      const res = await fetch(`/api/v1/syllabus-topics/${encodeURIComponent(topic.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curriculumTopicId: topic.curriculumTopicId || topic.suggestedTopicId || null,
          mappingConfirmed: true,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Failed to confirm mapping (${res.status})`);
      }
      setActionNotice(`Confirmed mapping for "${topic.schoolTopic}".`);
      await loadUploadTopics(selectedUploadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update topic mapping");
    }
  }

  async function handleReviewDecision(decision: "approved" | "rejected") {
    if (!canReview || !selectedUpload) return;
    setReviewing(true);
    setError(null);
    setActionNotice(null);
    try {
      const res = await fetch(
        `/api/v1/syllabus-uploads/${encodeURIComponent(selectedUpload.id)}/review`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: decision,
            reviewNote: reviewNote.trim(),
          }),
        },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Review update failed (${res.status})`);
      }
      setActionNotice(`Syllabus marked as ${decision}.`);
      await loadUploads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit syllabus review");
    } finally {
      setReviewing(false);
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading syllabus workspace...
      </div>
    );
  }

  return (
    <Layout
      title="School Syllabi & Topic Mapping"
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Syllabi" },
      ]}
      currentUser={user}
      onSignOut={() => {
        void refreshUser();
      }}
      headerActions={
        canUpload ? (
          <button
            type="button"
            onClick={() => setShowUploadForm((prev) => !prev)}
            className="rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            {showUploadForm ? "Close Uploader" : "+ Upload Syllabus"}
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
            Weekly School Syllabus Workflow
          </div>
          <h2 className="mt-1 text-xl font-bold">
            School Syllabus Uploads & Tutor Curriculum Mapping
          </h2>
          <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
            Parents upload weekly school syllabi (PDF, DOCX, or images); tutors review extracted
            school topics, confirm curriculum mappings, and approve syllabi for weekly learning plans.
          </p>
        </div>

        {actionNotice && (
          <div className="rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] px-4 py-2.5 text-xs font-medium">
            {actionNotice}
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

        {/* Upload Form (Parents & Admins) */}
        {canUpload && showUploadForm && (
          <form
            onSubmit={handleUploadSubmit}
            className="rounded-xl bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs"
          >
            <h3 className="text-base font-semibold text-[#0F172A]">
              Upload Weekly School Syllabus
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Student
                </label>
                {students.length > 0 ? (
                  <select
                    value={uploadForm.studentId}
                    onChange={(e) =>
                      setUploadForm((p) => ({ ...p, studentId: e.target.value }))
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
                    value={uploadForm.studentId}
                    onChange={(e) =>
                      setUploadForm((p) => ({ ...p, studentId: e.target.value }))
                    }
                    placeholder="Student ID"
                    className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Week Starting
                </label>
                <input
                  type="date"
                  required
                  value={uploadForm.weekStart}
                  onChange={(e) =>
                    setUploadForm((p) => ({ ...p, weekStart: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  File Type
                </label>
                <select
                  value={uploadForm.fileType}
                  onChange={(e) =>
                    setUploadForm((p) => ({ ...p, fileType: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
                >
                  <option value="application/pdf">PDF Document (.pdf)</option>
                  <option value="application/vnd.openxmlformats-officedocument.wordprocessingml.document">
                    Word Document (.docx)
                  </option>
                  <option value="image/png">PNG Image (.png)</option>
                  <option value="image/jpeg">JPEG Image (.jpg)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Syllabus File Name / Picker
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={uploadForm.fileName}
                    onChange={(e) =>
                      setUploadForm((p) => ({ ...p, fileName: e.target.value }))
                    }
                    placeholder="grade4-week3-syllabus.pdf"
                    className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  />
                  <label className="shrink-0 cursor-pointer rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#EFF6FF]">
                    Browse
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadForm((p) => ({
                            ...p,
                            fileName: file.name,
                            fileType: file.type || p.fileType,
                          }));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadForm(false)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
              >
                {uploading ? "Uploading..." : "Submit Syllabus"}
              </button>
            </div>
          </form>
        )}

        {/* Student Filter Bar */}
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
            Showing <span className="font-semibold text-[#0F172A]">{uploads.length}</span> syllabus
            upload{uploads.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Two-Column Workspace: Uploads List + Extracted Topic Mapping & Review */}
        {loadingUploads ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading syllabus uploads...
          </div>
        ) : uploads.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              No syllabus uploads found
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              {canUpload
                ? "Click '+ Upload Syllabus' to submit a weekly school syllabus for your child."
                : "No school syllabi have been uploaded for your assigned students yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Upload Queue */}
            <div className="lg:col-span-5 space-y-3">
              {uploads.map((item) => {
                const isSelected = item.id === selectedUploadId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedUploadId(item.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? "bg-[#EFF6FF] border-[#1D4ED8]"
                        : "bg-white border-[#E2E8F0] hover:border-[#93C5FD]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1D4ED8]">
                        Week of {item.weekStart}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                          item.status,
                        )}`}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-[#0F172A] truncate">
                      {item.fileName}
                    </div>
                    <div className="mt-1 text-xs text-[#64748B]">
                      {studentNameById.get(item.studentId) ?? `Student: ${item.studentId}`}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Topic Mapping & Tutor Review */}
            <div className="lg:col-span-7 rounded-xl bg-white border border-[#E2E8F0] p-5 space-y-4">
              {selectedUpload ? (
                <>
                  <div className="border-b border-[#E2E8F0] pb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                        Selected Syllabus
                      </div>
                      <h3 className="text-base font-bold text-[#0F172A] mt-0.5">
                        {selectedUpload.fileName}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-1">
                        Uploaded by {selectedUpload.uploadedByEmail} • Week of{" "}
                        {selectedUpload.weekStart}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                        selectedUpload.status,
                      )}`}
                    >
                      {selectedUpload.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Extracted Topics */}
                  <div>
                    <h4 className="text-sm font-semibold text-[#0F172A] mb-2.5">
                      Extracted Syllabus Topics & Curriculum Mapping
                    </h4>

                    {loadingTopics ? (
                      <div className="text-xs text-[#64748B] py-4">
                        Loading syllabus topics...
                      </div>
                    ) : topics.length === 0 ? (
                      <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-4 text-xs text-[#64748B]">
                        No extracted syllabus topics recorded yet for this upload.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {topics.map((topic) => (
                          <div
                            key={topic.id}
                            className="rounded-lg border border-[#E2E8F0] p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-[#1D4ED8]">
                                {topic.schoolSubject}
                                {topic.schoolDate ? ` • ${topic.schoolDate}` : ""}
                              </div>
                              <div className="text-sm font-semibold text-[#0F172A]">
                                {topic.schoolTopic}
                              </div>
                              {topic.objective && (
                                <p className="text-xs text-[#475569]">{topic.objective}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {topic.mappingConfirmed ? (
                                <span className="rounded-full bg-[#DCFCE7] text-[#166534] px-2.5 py-1 text-xs font-semibold">
                                  Mapped
                                </span>
                              ) : canReview ? (
                                <button
                                  type="button"
                                  onClick={() => void handleConfirmMapping(topic)}
                                  className="rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] px-3 py-1.5 text-xs font-semibold hover:bg-[#DBEAFE]"
                                >
                                  Confirm Mapping
                                </button>
                              ) : (
                                <span className="rounded-full bg-[#F1F5F9] text-[#64748B] px-2.5 py-1 text-xs font-medium">
                                  Pending Tutor Review
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tutor Review Controls */}
                  {canReview && (
                    <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                      <label className="block text-xs font-semibold text-[#0F172A]">
                        Tutor Review Note
                      </label>
                      <textarea
                        rows={2}
                        value={reviewNote}
                        onChange={(e) => setReviewNote(e.target.value)}
                        placeholder="Add guidance or notes for the parent and weekly plan..."
                        className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                      />
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={reviewing}
                          onClick={() => void handleReviewDecision("rejected")}
                          className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B] px-4 py-2 text-xs font-semibold hover:bg-[#FEE2E2] disabled:opacity-60"
                        >
                          Request Revision
                        </button>
                        <button
                          type="button"
                          disabled={reviewing}
                          onClick={() => void handleReviewDecision("approved")}
                          className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
                        >
                          {reviewing ? "Saving..." : "Approve Syllabus"}
                        </button>
                      </div>
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