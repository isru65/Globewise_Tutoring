import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface TutoringSessionRecord {
  id: string;
  studentId: string;
  tutorEmail: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  meetingLink?: string | null;
  topicSummary?: string | null;
}

export interface SessionNoteRecord {
  id: string;
  sessionId: string;
  authorEmail: string;
  noteText: string;
  createdAt?: string;
}

interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  tutorEmail?: string | null;
}

function formatGrade(grade: number): string {
  return grade === 0 ? "Kindergarten (K)" : `Grade ${grade}`;
}

function getSessionStatusBadge(status: string): string {
  switch (status) {
    case "completed":
      return "bg-[#DCFCE7] text-[#166534]";
    case "cancelled":
    case "no_show":
      return "bg-[#FEE2E2] text-[#991B1B]";
    case "in_progress":
      return "bg-[#E0F2FE] text-[#075985]";
    default:
      return "bg-[#FEF3C7] text-[#92400E]";
  }
}

function getDefaultScheduledInput(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(
    tomorrow.getDate(),
  )}T${pad(tomorrow.getHours())}:00`;
}

export default function SessionsRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStudentId = searchParams.get("studentId") || "";

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [sessions, setSessions] = useState<TutoringSessionRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [notes, setNotes] = useState<SessionNoteRecord[]>([]);

  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [loadingNotes, setLoadingNotes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Schedule session form (Tutor / Admin)
  const [showScheduleForm, setShowScheduleForm] = useState<boolean>(false);
  const [scheduling, setScheduling] = useState<boolean>(false);
  const [scheduleForm, setScheduleForm] = useState({
    studentId: initialStudentId,
    scheduledAt: getDefaultScheduledInput(),
    durationMinutes: 45,
    topicSummary: "",
    meetingLink: "",
  });

  // Session note form (Tutor / Admin)
  const [newNoteText, setNewNoteText] = useState<string>("");
  const [savingNote, setSavingNote] = useState<boolean>(false);

  const canManageSessions = user?.role === "tutor" || user?.role === "admin";

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
        setScheduleForm((prev) => ({ ...prev, studentId: firstStudent.id }));
      }
    } catch {
      // Non-blocking fallback
    }
  }, [selectedStudentId, user?.role]);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (selectedStudentId) qs.set("studentId", selectedStudentId);

      const url = `/api/v1/sessions${qs.toString() ? `?${qs.toString()}` : ""}`;
      const res = await fetch(url, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 404) {
        setSessions([]);
        setLoadingSessions(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Unable to load tutoring sessions (${res.status})`);
      }

      const payload = await res.json();
      const list: TutoringSessionRecord[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];

      const sorted = [...list].sort(
        (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      );
      setSessions(sorted);

      const firstSession = sorted[0];
      if (firstSession) {
        const exists = sorted.some((s) => s.id === selectedSessionId);
        if (!exists) {
          setSelectedSessionId(firstSession.id);
        }
      } else {
        setSelectedSessionId("");
        setNotes([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoadingSessions(false);
    }
  }, [selectedStudentId, selectedSessionId]);

  const loadSessionNotes = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setNotes([]);
      return;
    }
    setLoadingNotes(true);
    try {
      const res = await fetch(
        `/api/v1/sessions/${encodeURIComponent(sessionId)}/notes`,
        {
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      if (!res.ok) {
        setNotes([]);
        setLoadingNotes(false);
        return;
      }
      const payload = await res.json();
      const list: SessionNoteRecord[] = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.items)
          ? payload.data.items
          : [];
      setNotes(list);
    } catch {
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading) {
      void loadStudents();
      void loadSessions();
    }
  }, [userLoading, loadStudents, loadSessions]);

  useEffect(() => {
    void loadSessionNotes(selectedSessionId);
  }, [selectedSessionId, loadSessionNotes]);

  const studentMap = useMemo(() => {
    const map = new Map<string, StudentSummary>();
    for (const s of students) {
      map.set(s.id, s);
    }
    return map;
  }, [students]);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  function handleStudentFilterChange(nextStudentId: string) {
    setSelectedStudentId(nextStudentId);
    setScheduleForm((prev) => ({ ...prev, studentId: nextStudentId || prev.studentId }));
    const nextParams = new URLSearchParams(searchParams);
    if (nextStudentId) {
      nextParams.set("studentId", nextStudentId);
    } else {
      nextParams.delete("studentId");
    }
    setSearchParams(nextParams, { replace: true });
  }

  async function handleScheduleSession(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageSessions) return;
    const targetStudentId = scheduleForm.studentId || selectedStudentId;
    if (!targetStudentId || !scheduleForm.scheduledAt) {
      setError("Please select a student and session date/time.");
      return;
    }

    setScheduling(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/v1/sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: targetStudentId,
          scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
          durationMinutes: Number(scheduleForm.durationMinutes) || 45,
          topicSummary: scheduleForm.topicSummary.trim() || null,
          meetingLink: scheduleForm.meetingLink.trim() || null,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Failed to schedule session (${res.status})`);
      }

      setScheduleForm((prev) => ({
        ...prev,
        topicSummary: "",
        meetingLink: "",
      }));
      setShowScheduleForm(false);
      setNotice("1-on-1 tutoring session scheduled.");
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule session");
    } finally {
      setScheduling(false);
    }
  }

  async function handleUpdateSessionStatus(sessionId: string, nextStatus: string) {
    if (!canManageSessions) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/v1/sessions/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Status update failed (${res.status})`);
      }

      setNotice(`Session status updated to ${nextStatus}.`);
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update session status");
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!canManageSessions || !selectedSessionId || !newNoteText.trim()) return;

    setSavingNote(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/v1/sessions/${encodeURIComponent(selectedSessionId)}/notes`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteText: newNoteText.trim() }),
        },
      );

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Failed to save note (${res.status})`);
      }

      setNewNoteText("");
      setNotice("Session note recorded.");
      await loadSessionNotes(selectedSessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add session note");
    } finally {
      setSavingNote(false);
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading tutoring sessions...
      </div>
    );
  }

  return (
    <Layout
      title="Tutoring Sessions & Notes"
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Sessions" },
      ]}
      currentUser={user}
      onSignOut={() => {
        void refreshUser();
      }}
      headerActions={
        canManageSessions ? (
          <button
            type="button"
            onClick={() => setShowScheduleForm((prev) => !prev)}
            className="rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            {showScheduleForm ? "Close Scheduler" : "+ Schedule Session"}
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
            1-on-1 Live Instruction & Session Logs
          </div>
          <h2 className="mt-1 text-xl font-bold">
            Tutoring Schedule, Attendance & Session Notes
          </h2>
          <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
            Schedule live 1-on-1 sessions, launch meeting links, mark attendance/completion, and
            share structured session notes across students, tutors, and parents.
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

        {/* Schedule Session Form (Tutors & Admins) */}
        {canManageSessions && showScheduleForm && (
          <form
            onSubmit={handleScheduleSession}
            className="rounded-xl bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs"
          >
            <h3 className="text-base font-semibold text-[#0F172A]">
              Schedule 1-on-1 Tutoring Session
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Student
                </label>
                {students.length > 0 ? (
                  <select
                    value={scheduleForm.studentId}
                    onChange={(e) =>
                      setScheduleForm((p) => ({ ...p, studentId: e.target.value }))
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
                    value={scheduleForm.studentId}
                    onChange={(e) =>
                      setScheduleForm((p) => ({ ...p, studentId: e.target.value }))
                    }
                    placeholder="Student ID"
                    className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleForm.scheduledAt}
                  onChange={(e) =>
                    setScheduleForm((p) => ({ ...p, scheduledAt: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={15}
                  max={180}
                  value={scheduleForm.durationMinutes}
                  onChange={(e) =>
                    setScheduleForm((p) => ({
                      ...p,
                      durationMinutes: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Session Focus / Topic Summary
                </label>
                <input
                  type="text"
                  value={scheduleForm.topicSummary}
                  onChange={(e) =>
                    setScheduleForm((p) => ({ ...p, topicSummary: e.target.value }))
                  }
                  placeholder="e.g. Equivalent fractions & word problems"
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Meeting Link (Zoom / Meet)
                </label>
                <input
                  type="url"
                  value={scheduleForm.meetingLink}
                  onChange={(e) =>
                    setScheduleForm((p) => ({ ...p, meetingLink: e.target.value }))
                  }
                  placeholder="https://zoom.us/j/..."
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={scheduling}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
              >
                {scheduling ? "Scheduling..." : "Save Session"}
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
            <span className="font-semibold text-[#0F172A]">{sessions.length}</span> session
            {sessions.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Sessions List + Selected Session Details & Notes */}
        {loadingSessions ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading tutoring sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              No tutoring sessions scheduled
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              {canManageSessions
                ? "Click '+ Schedule Session' above to book a 1-on-1 session."
                : "Upcoming and completed 1-on-1 tutoring sessions will appear here."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Session List */}
            <div className="lg:col-span-5 space-y-3">
              {sessions.map((sess) => {
                const isSelected = sess.id === selectedSessionId;
                const st = studentMap.get(sess.studentId);
                const when = new Date(sess.scheduledAt);
                const whenText = Number.isNaN(when.getTime())
                  ? sess.scheduledAt
                  : when.toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    });

                return (
                  <button
                    key={sess.id}
                    type="button"
                    onClick={() => setSelectedSessionId(sess.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-colors ${
                      isSelected
                        ? "bg-[#EFF6FF] border-[#1D4ED8]"
                        : "bg-white border-[#E2E8F0] hover:border-[#93C5FD]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1D4ED8]">
                        {whenText}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getSessionStatusBadge(
                          sess.status,
                        )}`}
                      >
                        {sess.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="mt-1.5 text-sm font-semibold text-[#0F172A]">
                      {st
                        ? `${st.firstName} ${st.lastName} (${formatGrade(st.gradeLevel)})`
                        : `Student: ${sess.studentId}`}
                    </div>

                    <div className="mt-1 text-xs text-[#475569]">
                      {sess.topicSummary || "1-on-1 Tutoring Session"} • {sess.durationMinutes} mins
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Session Controls & Notes */}
            <div className="lg:col-span-7 rounded-xl bg-white border border-[#E2E8F0] p-5 space-y-5">
              {selectedSession ? (
                <>
                  <div className="border-b border-[#E2E8F0] pb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                        Session Details
                      </div>
                      <h3 className="text-lg font-bold text-[#0F172A] mt-0.5">
                        {selectedSession.topicSummary || "1-on-1 Tutoring Session"}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-1">
                        Tutor: {selectedSession.tutorEmail} • Duration:{" "}
                        {selectedSession.durationMinutes} mins
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getSessionStatusBadge(
                        selectedSession.status,
                      )}`}
                    >
                      {selectedSession.status.replace("_", " ")}
                    </span>
                  </div>

                  {selectedSession.meetingLink && (
                    <div className="rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] p-3.5 flex items-center justify-between gap-3">
                      <div className="text-xs text-[#1E3A8A] truncate">
                        Meeting Link:{" "}
                        <span className="font-medium">{selectedSession.meetingLink}</span>
                      </div>
                      <a
                        href={selectedSession.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
                      >
                        Join Session
                      </a>
                    </div>
                  )}

                  {canManageSessions && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-[#475569] mr-1">
                        Mark Status:
                      </span>
                      {(["scheduled", "completed", "cancelled"] as const).map((stVal) => (
                        <button
                          key={stVal}
                          type="button"
                          onClick={() => void handleUpdateSessionStatus(selectedSession.id, stVal)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                            selectedSession.status === stVal
                              ? "bg-[#0F172A] text-white border-[#0F172A]"
                              : "bg-white text-[#0F172A] border-[#CBD5E1] hover:bg-[#F8FAFC]"
                          }`}
                        >
                          {stVal.charAt(0).toUpperCase() + stVal.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Session Notes */}
                  <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                    <h4 className="text-sm font-semibold text-[#0F172A]">
                      Session Notes & Takeaways
                    </h4>

                    {loadingNotes ? (
                      <div className="text-xs text-[#64748B]">Loading notes...</div>
                    ) : notes.length === 0 ? (
                      <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 text-xs text-[#64748B]">
                        No session notes recorded yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {notes.map((n) => (
                          <div
                            key={n.id}
                            className="rounded-lg border border-[#E2E8F0] p-3.5 bg-[#F8FAFC]"
                          >
                            <p className="text-sm text-[#0F172A] whitespace-pre-wrap">
                              {n.noteText}
                            </p>
                            <div className="mt-1.5 text-[11px] text-[#64748B]">
                              By {n.authorEmail}
                              {n.createdAt
                                ? ` • ${new Date(n.createdAt).toLocaleDateString()}`
                                : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {canManageSessions && (
                      <form onSubmit={handleAddNote} className="space-y-2 pt-2">
                        <textarea
                          rows={2}
                          value={newNoteText}
                          onChange={(e) => setNewNoteText(e.target.value)}
                          placeholder="Add post-session summary, strengths, or next steps for the student & parent..."
                          className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={savingNote}
                            className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
                          >
                            {savingNote ? "Saving Note..." : "Add Session Note"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}