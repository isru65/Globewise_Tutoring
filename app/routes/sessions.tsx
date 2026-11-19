import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useState, type FormEvent } from "react";

import { EmptyState, ErrorNote, FieldLabel, PageHeader, Section, StatCard, StatusBadge, fieldClass } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useNow } from "@/hooks/use-now";
import { TIMEZONES, errorText, formatDateTime, gradeLabel, label } from "@/lib/globewise";
import { cn } from "@/lib/utils";
import {
  SESSION_FILTERS,
  dashboardStats,
  dateKey,
  matchesFilter,
  readiness,
  sortForFilter,
  type Readiness,
  type SessionFilter,
} from "@/lib/session-schedule";

export function meta() {
  return [{ title: "Sessions · Globewise Tutoring" }];
}

const SESSION_STATUSES = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show", "rescheduled"] as const;
const ATTENDANCE = ["present", "late", "absent"] as const;

type StudentOption = { id: string; firstName: string; lastName: string; timezone: string; gradeLevel: number };
type Session = {
  id: string;
  studentId: string;
  tutorEmail: string;
  subject: string;
  topic: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  meetingUrl: string;
  status: string;
  attendance: string | null;
};

const EMPTY_FORM = { studentId: "", subject: "Mathematics", topic: "", startsAt: "", endsAt: "", timezone: "America/New_York", meetingUrl: "" };

function ScheduleForm({ students }: { students: StudentOption[] }) {
  const create = useActionMutation("create-session");
  const [form, setForm] = useState({ ...EMPTY_FORM, studentId: students[0]?.id ?? "", timezone: students[0]?.timezone ?? EMPTY_FORM.timezone });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function pickStudent(studentId: string) {
    const student = students.find((s) => s.id === studentId);
    setForm((f) => ({ ...f, studentId, timezone: student?.timezone ?? f.timezone }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      {
        studentId: form.studentId,
        subject: form.subject.trim(),
        topic: form.topic.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        timezone: form.timezone,
        meetingUrl: form.meetingUrl.trim(),
      },
      { onSuccess: () => setForm((f) => ({ ...f, topic: "", startsAt: "", endsAt: "", meetingUrl: "" })) },
    );
  }

  return (
    <Section title="Schedule a session" description="Paste a Zoom or Google Meet link. Times are checked for overlaps before saving.">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <FieldLabel>Student</FieldLabel>
          <select required className={fieldClass} value={form.studentId} onChange={(e) => pickStudent(e.target.value)}>
            {students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </select>
        </label>
        <label className="block">
          <FieldLabel>Subject</FieldLabel>
          <Input required value={form.subject} onChange={(e) => set("subject", e.target.value)} />
        </label>
        <label className="block">
          <FieldLabel>Topic</FieldLabel>
          <Input value={form.topic} onChange={(e) => set("topic", e.target.value)} />
        </label>
        <label className="block">
          <FieldLabel>Start</FieldLabel>
          <Input required type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
        </label>
        <label className="block">
          <FieldLabel>End</FieldLabel>
          <Input required type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />
        </label>
        <label className="block">
          <FieldLabel>Time zone</FieldLabel>
          <select className={fieldClass} value={form.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </label>
        <label className="block md:col-span-2">
          <FieldLabel>Meeting link (Zoom or Google Meet)</FieldLabel>
          <Input required type="url" placeholder="https://meet.google.com/abc-defg-hij" value={form.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} />
        </label>
        <div className="flex items-end justify-end gap-3 md:col-span-1">
          <Button type="submit" disabled={create.isPending || !form.studentId}>Schedule session</Button>
        </div>
        <div className="md:col-span-3">
          <ErrorNote error={create.error ? new Error(errorText(create.error)) : null} />
        </div>
      </form>
    </Section>
  );
}

function NotesPanel({ sessionId }: { sessionId: string }) {
  const notes = useActionQuery("list-session-notes", { sessionId });
  const add = useActionMutation("add-session-note");
  const [body, setBody] = useState("");
  const [parentVisible, setParentVisible] = useState(false);

  function save(event: FormEvent) {
    event.preventDefault();
    add.mutate(
      { sessionId, body, parentVisible },
      { onSuccess: () => { setBody(""); setParentVisible(false); } },
    );
  }

  return (
    <div className="space-y-4 rounded-md bg-muted/40 p-4">
      {(notes.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {(notes.data ?? []).map((note) => (
            <li key={note.id} className="text-sm">
              <p className="whitespace-pre-wrap text-foreground">{note.body}</p>
              <p className="text-xs text-muted-foreground">
                {note.parentVisible ? "Visible to parent" : "Private to tutors"} · {formatDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={save} className="space-y-2">
        <textarea
          aria-label="New session note"
          required
          maxLength={5000}
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-md border border-input bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={parentVisible} onChange={(e) => setParentVisible(e.target.checked)} />
            Share with parent
          </label>
          <Button type="submit" size="sm" disabled={add.isPending || !body.trim()}>Add note</Button>
        </div>
        <ErrorNote error={add.error ? new Error(errorText(add.error)) : null} />
      </form>
    </div>
  );
}

function RescheduleForm({ session, onDone }: { session: Session; onDone: () => void }) {
  const update = useActionMutation("update-session");
  const [times, setTimes] = useState({ startsAt: "", endsAt: "" });

  function save(event: FormEvent) {
    event.preventDefault();
    update.mutate(
      {
        id: session.id,
        startsAt: new Date(times.startsAt).toISOString(),
        endsAt: new Date(times.endsAt).toISOString(),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={save} className="grid gap-3 rounded-md bg-muted/40 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label className="block">
        <FieldLabel>New start</FieldLabel>
        <Input required type="datetime-local" value={times.startsAt} onChange={(e) => setTimes({ ...times, startsAt: e.target.value })} />
      </label>
      <label className="block">
        <FieldLabel>New end</FieldLabel>
        <Input required type="datetime-local" value={times.endsAt} onChange={(e) => setTimes({ ...times, endsAt: e.target.value })} />
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={update.isPending}>Save new time</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
      <div className="md:col-span-3">
        <ErrorNote error={update.error ? new Error(errorText(update.error)) : null} />
      </div>
    </form>
  );
}

function ReadinessChip({ state }: { state: Readiness }) {
  const text = state.kind === "live" ? "Live now" : state.kind === "soon" ? `Starts in ${state.minutes} min` : "Update status";
  const tone =
    state.kind === "live"
      ? "bg-primary/10 text-primary ring-primary/20"
      : state.kind === "soon"
        ? "bg-amber-500/10 text-amber-800 ring-amber-600/20 dark:text-amber-300"
        : "bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-300";
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tone)}>
      {text}
    </span>
  );
}

type StudentSummary = { name: string; gradeLevel: number };

function SessionItem({ session, student, isStaff, now }: { session: Session; student: StudentSummary | undefined; isStaff: boolean; now: Date }) {
  const update = useActionMutation("update-session");
  const [panel, setPanel] = useState<"none" | "notes" | "reschedule">("none");
  const state = readiness(session, now);

  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {session.subject}
            {session.topic ? ` · ${session.topic}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            {student ? `${student.name} · ${gradeLabel(student.gradeLevel)}` : "Student"} · {formatDateTime(session.startsAt, session.timezone)} to {formatDateTime(session.endsAt, session.timezone)} ({session.timezone})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {state ? <ReadinessChip state={state} /> : null}
          <StatusBadge status={session.status} />
          {session.attendance ? <StatusBadge status={session.attendance} /> : null}
          <a
            href={session.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Join meeting
          </a>
        </div>
      </div>

      {isStaff ? (
        <div className="flex flex-wrap items-center gap-2">
          {state?.kind === "needs_update" ? (
            <Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ id: session.id, status: "completed" })}>
              Mark completed
            </Button>
          ) : null}
          <select
            aria-label="Session status"
            className={`${fieldClass} w-auto`}
            value={session.status}
            disabled={update.isPending}
            onChange={(e) => update.mutate({ id: session.id, status: e.target.value as (typeof SESSION_STATUSES)[number] })}
          >
            {SESSION_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
          <select
            aria-label="Attendance"
            className={`${fieldClass} w-auto`}
            value={session.attendance ?? ""}
            disabled={update.isPending}
            onChange={(e) => update.mutate({ id: session.id, attendance: e.target.value ? (e.target.value as (typeof ATTENDANCE)[number]) : null })}
          >
            <option value="">Attendance not marked</option>
            {ATTENDANCE.map((a) => <option key={a} value={a}>{label(a)}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => setPanel(panel === "reschedule" ? "none" : "reschedule")}>Reschedule</Button>
          <Button size="sm" variant="outline" onClick={() => setPanel(panel === "notes" ? "none" : "notes")}>Notes</Button>
        </div>
      ) : null}

      <ErrorNote error={update.error ? new Error(errorText(update.error)) : null} />
      {panel === "reschedule" ? <RescheduleForm session={session} onDone={() => setPanel("none")} /> : null}
      {panel === "notes" ? <NotesPanel sessionId={session.id} /> : null}
    </li>
  );
}

function groupByDay<T extends { startsAt: string }>(items: T[]) {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const date = new Date(item.startsAt);
    const key = dateKey(date);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.items.push(item);
    } else {
      groups.push({
        key,
        label: date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
        items: [item],
      });
    }
  }
  return groups;
}

export default function SessionsRoute() {
  const { user } = useCurrentUser();
  const isStaff = user?.role === "tutor" || user?.role === "admin";
  const students = useActionQuery("list-students", {});
  const sessions = useActionQuery("list-sessions", {});
  const now = useNow();
  const [filter, setFilter] = useState<SessionFilter>("upcoming");

  const allSessions = (sessions.data ?? []) as Session[];
  const studentById = new Map(
    (students.data ?? []).map((s) => [s.id, { name: `${s.firstName} ${s.lastName}`, gradeLevel: s.gradeLevel }]),
  );
  const activeFilter: SessionFilter = isStaff ? filter : "all";
  const visible = sortForFilter(activeFilter, allSessions.filter((s) => matchesFilter(s, activeFilter, now)));
  const groups = groupByDay(visible);
  const stats = dashboardStats(allSessions, now);

  return (
    <>
      <PageHeader
        title={isStaff ? "Session dashboard" : "My schedule"}
        description={
          isStaff
            ? "Today's sessions, sessions that still need a status, and what is coming up. Conflicts are blocked before a session is saved."
            : "Your tutoring sessions with Zoom or Google Meet links."
        }
      />

      {isStaff ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Today" value={stats.today} hint="Sessions starting today" />
            <StatCard label="Next 7 days" value={stats.nextSevenDays} hint="Active sessions" />
            <StatCard label="Needs update" value={stats.needsUpdate} hint="Ended without a status" />
            <StatCard label="Completed this week" value={stats.completedThisWeek} hint="Since Monday" />
          </div>
          {(students.data ?? []).length > 0 ? (
            <div className="mb-6">
              <ScheduleForm students={students.data ?? []} />
            </div>
          ) : null}
        </>
      ) : null}

      <Section title="Sessions" description="Times are shown in each session's time zone.">
        {isStaff ? (
          <div role="group" aria-label="Filter sessions" className="mb-5 flex flex-wrap gap-2">
            {SESSION_FILTERS.map((f) => {
              const count = allSessions.filter((s) => matchesFilter(s, f.id, now)).length;
              return (
                <Button
                  key={f.id}
                  size="sm"
                  variant={filter === f.id ? "default" : "outline"}
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label} <span className="tabular-nums opacity-80">({count})</span>
                </Button>
              );
            })}
          </div>
        ) : null}

        {visible.length === 0 ? (
          <EmptyState
            title={isStaff ? "No sessions in this view" : "No sessions scheduled"}
            description={isStaff ? "Choose another filter, or schedule a session above." : "Your tutor will add sessions here."}
          />
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.key}>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</h3>
                <ul className="divide-y divide-border">
                  {group.items.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      student={studentById.get(session.studentId)}
                      isStaff={isStaff}
                      now={now}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
