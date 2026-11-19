import { useActionQuery } from "@agent-native/core/client/hooks";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";

import { EmptyState, PageHeader, Section, StatCard, StatusBadge, fieldClass } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { formatDate } from "@/lib/globewise";
import {
  addDays,
  dateKey,
  isActive,
  parseDateKey,
  startOfWeek,
  tutoringHours,
} from "@/lib/session-schedule";
import { cn } from "@/lib/utils";

export function meta() {
  return [{ title: "Weekly planner · Globewise Tutoring" }];
}

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function PlannerRoute() {
  const now = useNow();
  const [params, setParams] = useSearchParams();
  const weekStart = startOfWeek(parseDateKey(params.get("week")) ?? now);
  const weekEnd = addDays(weekStart, 7);
  const weekStartKey = dateKey(weekStart);
  const weekEndKey = dateKey(addDays(weekStart, 6));
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const [studentId, setStudentId] = useState("all");

  const sessions = useActionQuery("list-sessions", {});
  const students = useActionQuery("list-students", {});
  const plans = useActionQuery("list-learning-plans", {});
  const names = new Map((students.data ?? []).map((s) => [s.id, `${s.firstName} ${s.lastName}`]));

  const matchesStudent = (id: string) => studentId === "all" || id === studentId;
  const weekSessions = (sessions.data ?? [])
    .filter((s) => {
      const start = Date.parse(s.startsAt);
      return start >= weekStart.getTime() && start < weekEnd.getTime() && matchesStudent(s.studentId);
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const weekPlans = (plans.data ?? []).filter(
    (p) => p.weekStart >= weekStartKey && p.weekStart <= weekEndKey && matchesStudent(p.studentId),
  );
  const countedSessions = weekSessions.filter((s) => s.status !== "cancelled");
  const todayKey = dateKey(now);

  function goToWeek(date: Date) {
    setParams({ week: dateKey(date) });
  }

  return (
    <>
      <PageHeader
        title="Weekly planner"
        description={`Sessions for ${formatDate(weekStartKey)} to ${formatDate(weekEndKey)}, shown in your local time zone.`}
        actions={
          <>
            <Button variant="outline" size="sm" aria-label="Previous week" onClick={() => goToWeek(addDays(weekStart, -7))}>
              <IconChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setParams({})}>This week</Button>
            <Button variant="outline" size="sm" aria-label="Next week" onClick={() => goToWeek(addDays(weekStart, 7))}>
              <IconChevronRight className="size-4" />
            </Button>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Student</span>
          <select aria-label="Filter by student" className={`${fieldClass} w-auto min-w-48`} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="all">All students</option>
            {(students.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sessions" value={countedSessions.length} hint="Excludes cancelled" />
        <StatCard label="Tutoring hours" value={tutoringHours(weekSessions)} hint="Completed and scheduled" />
        <StatCard label="Students" value={new Set(countedSessions.map((s) => s.studentId)).size} hint="With a session this week" />
        <StatCard label="Plans starting" value={weekPlans.length} hint="Learning plans for this week" />
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const key = dateKey(day);
          const daySessions = weekSessions.filter((s) => dateKey(new Date(s.startsAt)) === key);
          const isToday = key === todayKey;
          return (
            <section
              key={key}
              aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              className={cn("flex min-h-40 flex-col rounded-lg border bg-card", isToday ? "border-primary/50" : "border-border")}
            >
              <header className="flex items-center justify-between border-b border-border px-3 py-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {day.toLocaleDateString(undefined, { weekday: "short" })}
                  </p>
                  <p className={cn("text-lg font-semibold tabular-nums", isToday ? "text-primary" : "text-foreground")}>{day.getDate()}</p>
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{daySessions.length}</span>
              </header>
              <ul className="flex-1 space-y-2 p-2">
                {daySessions.length === 0 ? (
                  <li className="px-1 py-2 text-xs text-muted-foreground">No sessions</li>
                ) : (
                  daySessions.map((s) => (
                    <li key={s.id} className={cn("rounded-md border border-border bg-background p-2.5", s.status === "cancelled" && "opacity-60")}>
                      <p className="text-xs font-medium tabular-nums text-primary">
                        {formatClock(s.startsAt)} – {formatClock(s.endsAt)}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                        {s.subject}
                        {s.topic ? ` · ${s.topic}` : ""}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{names.get(s.studentId) ?? "Student"}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <StatusBadge status={s.status} />
                        {isActive(s.status) ? (
                          <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
                            Join
                          </a>
                        ) : null}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </section>
          );
        })}
      </div>

      <Section
        title="Learning plans this week"
        description="Plans whose week starts in this range. Edit them in Weekly Plans."
        action={<Link to="/plans" className="text-xs font-medium text-primary hover:underline">Open weekly plans</Link>}
        className="mt-6"
      >
        {weekPlans.length === 0 ? (
          <EmptyState title="No plans start this week" />
        ) : (
          <ul className="divide-y divide-border">
            {weekPlans.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{names.get(p.studentId) ?? "Student"}</p>
                  <p className="text-xs text-muted-foreground">Week of {formatDate(p.weekStart)}</p>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
