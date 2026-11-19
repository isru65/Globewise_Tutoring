export const ACTIVE_STATUSES = ["scheduled", "confirmed", "in_progress"] as const;
const CLOSED_STATUSES = ["cancelled", "no_show", "rescheduled"] as const;
const LEAD_MINUTES = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ScheduledSession = {
  id: string;
  studentId: string;
  subject: string;
  topic: string;
  startsAt: string;
  endsAt: string;
  status: string;
  attendance: string | null;
};

export type Readiness =
  | { kind: "soon"; minutes: number }
  | { kind: "live" }
  | { kind: "needs_update" };

export const SESSION_FILTERS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "today", label: "Today" },
  { id: "needs_update", label: "Needs update" },
  { id: "completed", label: "Completed" },
  { id: "closed", label: "Cancelled or missed" },
  { id: "all", label: "All" },
] as const;

export type SessionFilter = (typeof SESSION_FILTERS)[number]["id"];

export function isActive(status: string) {
  return (ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function startOfWeek(date: Date) {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function parseDateKey(key: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function readiness(session: ScheduledSession, now: Date): Readiness | null {
  if (!isActive(session.status)) return null;
  const nowMs = now.getTime();
  if (nowMs >= Date.parse(session.endsAt)) return { kind: "needs_update" };
  const startMs = Date.parse(session.startsAt);
  if (nowMs >= startMs) return { kind: "live" };
  const minutes = Math.ceil((startMs - nowMs) / 60_000);
  return minutes <= LEAD_MINUTES ? { kind: "soon", minutes } : null;
}

export function matchesFilter(session: ScheduledSession, filter: SessionFilter, now: Date) {
  switch (filter) {
    case "upcoming":
      return isActive(session.status) && Date.parse(session.endsAt) > now.getTime();
    case "today":
      return dateKey(new Date(session.startsAt)) === dateKey(now);
    case "needs_update":
      return isActive(session.status) && Date.parse(session.endsAt) <= now.getTime();
    case "completed":
      return session.status === "completed";
    case "closed":
      return (CLOSED_STATUSES as readonly string[]).includes(session.status);
    case "all":
      return true;
  }
}

export function sortForFilter<T extends ScheduledSession>(filter: SessionFilter, sessions: T[]) {
  const newestFirst = filter === "completed" || filter === "closed";
  return [...sessions].sort((a, b) => {
    const diff = Date.parse(a.startsAt) - Date.parse(b.startsAt);
    return newestFirst ? -diff : diff;
  });
}

export function dashboardStats<T extends ScheduledSession>(sessions: T[], now: Date) {
  const weekStart = startOfWeek(now).getTime();
  const weekEnd = addDays(startOfWeek(now), 7).getTime();
  const horizon = now.getTime() + 7 * DAY_MS;
  let today = 0;
  let nextSevenDays = 0;
  let completedThisWeek = 0;
  for (const session of sessions) {
    const startMs = Date.parse(session.startsAt);
    if (matchesFilter(session, "today", now) && session.status !== "cancelled") today += 1;
    if (isActive(session.status) && startMs >= now.getTime() && startMs <= horizon) nextSevenDays += 1;
    if (session.status === "completed" && startMs >= weekStart && startMs < weekEnd) completedThisWeek += 1;
  }
  const needsUpdate = sessions.filter((s) => matchesFilter(s, "needs_update", now)).length;
  return { today, nextSevenDays, needsUpdate, completedThisWeek };
}

export function tutoringHours<T extends ScheduledSession>(sessions: T[]) {
  const minutes = sessions
    .filter((s) => s.status === "completed" || isActive(s.status))
    .reduce((total, s) => total + (Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 60_000, 0);
  return Math.round((minutes / 60) * 10) / 10;
}
