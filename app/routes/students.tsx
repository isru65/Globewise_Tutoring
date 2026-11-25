import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

export interface StudentRecord {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  timezone: string;
  parentEmail: string;
  tutorEmail?: string | null;
  studentEmail?: string | null;
  createdAt?: string;
}

function formatGrade(grade: number): string {
  return grade === 0 ? "Kindergarten (K)" : `Grade ${grade}`;
}

export default function StudentsRoute() {
  const { user, loading: userLoading, refresh: refreshUser } = useCurrentUser();

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  // Parent / Admin add-student form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    gradeLevel: 3,
    timezone: user?.timezone || "America/New_York",
    studentEmail: "",
    tutorEmail: "",
  });

  const canCreateStudent = user?.role === "parent" || user?.role === "admin";

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Uses /api/v1/me accessibleStudents first so role scoping is respected even before dedicated /api/v1/students exists
      const res = await fetch("/api/v1/me?page=1&page_size=100", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (res.status === 401 || res.status === 403) {
        setStudents([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Unable to load students (${res.status})`);
      }

      const payload = await res.json();
      const items = Array.isArray(payload?.data?.accessibleStudents?.data)
        ? payload.data.accessibleStudents.data
        : Array.isArray(payload?.data?.students)
          ? payload.data.students
          : [];

      setStudents(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student records");
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
    if (user?.timezone) {
      setFormState((prev) => ({ ...prev, timezone: user.timezone || prev.timezone }));
    }
  }, [user?.timezone]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (gradeFilter !== "all" && String(s.gradeLevel) !== gradeFilter) {
        return false;
      }
      if (q) {
        const full = `${s.firstName} ${s.lastName} ${s.parentEmail} ${s.tutorEmail ?? ""} ${s.studentEmail ?? ""}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [students, search, gradeFilter]);

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreateStudent) return;
    if (!formState.firstName.trim() || !formState.lastName.trim()) {
      setFormError("First name and last name are required.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/v1/students", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formState.firstName.trim(),
          lastName: formState.lastName.trim(),
          gradeLevel: Number(formState.gradeLevel),
          timezone: formState.timezone.trim() || "America/New_York",
          studentEmail: formState.studentEmail.trim() || null,
          tutorEmail: formState.tutorEmail.trim() || null,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error?.message || `Unable to add student (${res.status})`);
      }

      setFormState((prev) => ({
        ...prev,
        firstName: "",
        lastName: "",
        studentEmail: "",
        tutorEmail: "",
      }));
      setShowAddForm(false);
      await loadStudents();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create student profile");
    } finally {
      setSaving(false);
    }
  }

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white text-sm">
        Loading student workspace...
      </div>
    );
  }

  const pageTitle =
    user?.role === "parent"
      ? "Children & Profiles"
      : user?.role === "tutor"
        ? "Assigned Students"
        : user?.role === "student"
          ? "My Student Profile"
          : "All Students";

  return (
    <Layout
      title={pageTitle}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: pageTitle },
      ]}
      currentUser={user}
      onSignOut={() => {
        void refreshUser();
      }}
      headerActions={
        canCreateStudent ? (
          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            {showAddForm ? "Close Form" : "+ Add Student"}
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
            Role-Scoped Student Directory
          </div>
          <h2 className="mt-1 text-xl font-bold">{pageTitle}</h2>
          <p className="mt-1 text-sm text-blue-100/90 max-w-2xl">
            Access only the student profiles linked to your account or assigned to your teaching roster,
            with direct entry to syllabi, weekly plans, tutoring sessions, and progress reports.
          </p>
        </div>

        {/* Add Student Form (Parents & Admins) */}
        {canCreateStudent && showAddForm && (
          <form
            onSubmit={handleAddStudent}
            className="rounded-xl bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs"
          >
            <h3 className="text-base font-semibold text-[#0F172A]">
              Add Student Profile
            </h3>

            {formError && (
              <div className="rounded-lg bg-[#FEE2E2] text-[#991B1B] px-3.5 py-2 text-xs font-medium">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={formState.firstName}
                  onChange={(e) => setFormState((p) => ({ ...p, firstName: e.target.value }))}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={formState.lastName}
                  onChange={(e) => setFormState((p) => ({ ...p, lastName: e.target.value }))}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Grade Level (K–8)
                </label>
                <select
                  value={formState.gradeLevel}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, gradeLevel: Number(e.target.value) }))
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
                  Student Email (Optional)
                </label>
                <input
                  type="email"
                  value={formState.studentEmail}
                  onChange={(e) => setFormState((p) => ({ ...p, studentEmail: e.target.value }))}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  placeholder="learner@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  Assigned Tutor Email (Optional)
                </label>
                <input
                  type="email"
                  value={formState.tutorEmail}
                  onChange={(e) => setFormState((p) => ({ ...p, tutorEmail: e.target.value }))}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  placeholder="tutor@globewise.edu"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1">
                  IANA Timezone
                </label>
                <input
                  type="text"
                  value={formState.timezone}
                  onChange={(e) => setFormState((p) => ({ ...p, timezone: e.target.value }))}
                  className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
                  placeholder="America/New_York"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg border border-[#CBD5E1] px-4 py-2 text-xs font-medium text-[#475569]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
              >
                {saving ? "Saving..." : "Save Student"}
              </button>
            </div>
          </form>
        )}

        {/* Filter & Search Bar */}
        <div className="rounded-xl bg-white border border-[#E2E8F0] p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Filter by Grade
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm bg-white"
            >
              <option value="all">All Grades (K–8)</option>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                <option key={g} value={String(g)}>
                  {formatGrade(g)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#475569] mb-1">
              Search Student or Email
            </label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-[#CBD5E1] px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center text-sm text-[#64748B]">
            Loading student records...
          </div>
        ) : error ? (
          <div className="rounded-xl bg-[#FEE2E2] border border-[#FECACA] p-5 text-sm text-[#991B1B] flex items-center justify-between gap-4">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => void loadStudents()}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[#991B1B] border border-[#FCA5A5]"
            >
              Retry
            </button>
          </div>
        ) : !user ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              Sign in required to view student records
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              Student profiles are protected by role and ownership guards.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-lg px-4 py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
            >
              Go to Sign In
            </Link>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="rounded-xl bg-white border border-[#E2E8F0] p-8 text-center">
            <div className="text-base font-semibold text-[#0F172A]">
              No students found in your current scope
            </div>
            <p className="mt-1 text-sm text-[#64748B]">
              {canCreateStudent
                ? "Click '+ Add Student' above to create a linked student profile."
                : "No students are currently assigned or linked to your account."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="rounded-xl bg-white border border-[#E2E8F0] p-5 flex flex-col justify-between gap-4 shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#EFF6FF] text-[#1D4ED8] px-2.5 py-0.5 text-xs font-semibold">
                      {formatGrade(student.gradeLevel)}
                    </span>
                    <span className="text-xs text-[#64748B]">{student.timezone}</span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold text-[#0F172A]">
                    {student.firstName} {student.lastName}
                  </h3>

                  <div className="mt-2 space-y-1 text-xs text-[#475569]">
                    <div>
                      <span className="font-medium text-[#0F172A]">Parent:</span>{" "}
                      {student.parentEmail}
                    </div>
                    {student.tutorEmail && (
                      <div>
                        <span className="font-medium text-[#0F172A]">Tutor:</span>{" "}
                        {student.tutorEmail}
                      </div>
                    )}
                    {student.studentEmail && (
                      <div>
                        <span className="font-medium text-[#0F172A]">Student Email:</span>{" "}
                        {student.studentEmail}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <Link
                    to={`/syllabus?studentId=${encodeURIComponent(student.id)}`}
                    className="rounded-md bg-[#EFF6FF] text-[#1D4ED8] px-2.5 py-1.5 hover:bg-[#DBEAFE]"
                  >
                    Syllabus
                  </Link>
                  <Link
                    to={`/plans?studentId=${encodeURIComponent(student.id)}`}
                    className="rounded-md bg-[#EFF6FF] text-[#1D4ED8] px-2.5 py-1.5 hover:bg-[#DBEAFE]"
                  >
                    Weekly Plans
                  </Link>
                  <Link
                    to={`/progress?studentId=${encodeURIComponent(student.id)}`}
                    className="rounded-md bg-[#F1F5F9] text-[#0F172A] px-2.5 py-1.5 hover:bg-[#E2E8F0]"
                  >
                    Progress
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}