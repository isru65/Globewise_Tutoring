import { useActionQuery } from "@agent-native/core/client/hooks";
import { useState } from "react";

import { EmptyState, PageHeader, Section, StatCard, StatusBadge } from "@/components/app/primitives";
import { formatDate, formatDateTime } from "@/lib/globewise";

export function meta() {
  return [{ title: "Progress reports · Globewise Tutoring" }];
}

function percent(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

export default function ProgressRoute() {
  const students = useActionQuery("list-students", {});
  const [selected, setSelected] = useState("");
  const studentId = selected || students.data?.[0]?.id || "";
  const report = useActionQuery("get-progress-report", { studentId }, { enabled: Boolean(studentId) });

  if (!studentId && students.isSuccess) {
    return (
      <>
        <PageHeader title="Progress reports" />
        <EmptyState title="No linked students" description="Add a child from the Children page to see progress." />
      </>
    );
  }

  const data = report.data;

  return (
    <>
      <PageHeader
        title="Progress reports"
        description="Weekly completion, assessment history, tutoring attendance, and notes shared by your tutor."
        actions={
          (students.data ?? []).length > 1 ? (
            <select
              aria-label="Choose child"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={studentId}
              onChange={(e) => setSelected(e.target.value)}
            >
              {(students.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
            </select>
          ) : null
        }
      />

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Lesson completion" value={percent(data.lessonCompletionRate)} />
            <StatCard label="Assessment average" value={percent(data.assessmentAverage)} hint={`${data.assessmentAttempts.length} graded attempt(s)`} />
            <StatCard label="Attendance" value={percent(data.attendanceRate)} hint={`${data.sessionsAttended} of ${data.sessionsPast} past sessions`} />
            <StatCard label="Topics completed" value={data.topicsCompleted} hint={`${data.topicsActive} active`} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Section title="Weekly plans">
              {data.plans.length === 0 ? (
                <EmptyState title="No published plans yet" />
              ) : (
                <ul className="divide-y divide-border">
                  {data.plans.map((plan) => (
                    <li key={plan.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span>Week of {formatDate(plan.weekStart)}</span>
                      <span className="flex items-center gap-3 text-muted-foreground">
                        {plan.completed} of {plan.total} done
                        <StatusBadge status={plan.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Assessment history">
              {data.assessmentAttempts.length === 0 ? (
                <EmptyState title="No graded assessments yet" />
              ) : (
                <ul className="divide-y divide-border">
                  {data.assessmentAttempts.map((attempt) => (
                    <li key={attempt.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                      <span className="text-muted-foreground">{formatDateTime(attempt.submittedAt)}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums">{attempt.percent}%</span>
                        <StatusBadge status={attempt.passed ? "passed" : "rejected"} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Tutor notes" className="lg:col-span-2">
              {data.parentVisibleNotes.length === 0 ? (
                <EmptyState title="No shared notes yet" description="Tutors can mark session notes as visible to parents." />
              ) : (
                <ul className="space-y-3">
                  {data.parentVisibleNotes.map((note) => (
                    <li key={note.id} className="rounded-md bg-muted/40 p-4 text-sm">
                      <p className="whitespace-pre-wrap text-foreground">{note.body}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      )}
    </>
  );
}
