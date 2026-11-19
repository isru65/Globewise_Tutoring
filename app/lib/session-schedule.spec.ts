import { describe, expect, it } from "vitest";

import {
  addDays,
  dashboardStats,
  dateKey,
  matchesFilter,
  parseDateKey,
  readiness,
  sortForFilter,
  startOfWeek,
  tutoringHours,
  type ScheduledSession,
} from "./session-schedule";

function session(overrides: Partial<ScheduledSession>): ScheduledSession {
  return {
    id: "s1",
    studentId: "st1",
    subject: "Math",
    topic: "",
    startsAt: "2026-11-16T14:00:00",
    endsAt: "2026-11-16T14:45:00",
    status: "scheduled",
    attendance: null,
    ...overrides,
  };
}

describe("startOfWeek", () => {
  it("returns the Monday at local midnight", () => {
    const sunday = new Date(2026, 10, 15, 18, 30);
    expect(dateKey(startOfWeek(sunday))).toBe("2026-11-09");
    const monday = new Date(2026, 10, 9, 8, 0);
    expect(dateKey(startOfWeek(monday))).toBe("2026-11-09");
  });
});

describe("addDays and parseDateKey", () => {
  it("moves across month boundaries", () => {
    expect(dateKey(addDays(new Date(2026, 10, 28), 7))).toBe("2026-12-05");
  });

  it("rejects malformed week keys", () => {
    expect(parseDateKey("2026-13")).toBeNull();
    expect(parseDateKey(null)).toBeNull();
    expect(dateKey(parseDateKey("2026-11-09") ?? new Date(0))).toBe("2026-11-09");
  });
});

describe("readiness", () => {
  const start = new Date(2026, 10, 16, 14, 0);
  const at = (minutes: number) => new Date(start.getTime() + minutes * 60_000);

  it("flags sessions starting within the hour", () => {
    expect(readiness(session({ startsAt: start.toISOString(), endsAt: at(45).toISOString() }), at(-20))).toEqual({ kind: "soon", minutes: 20 });
  });

  it("ignores sessions further away", () => {
    expect(readiness(session({ startsAt: start.toISOString(), endsAt: at(45).toISOString() }), at(-180))).toBeNull();
  });

  it("marks sessions in progress as live", () => {
    expect(readiness(session({ startsAt: start.toISOString(), endsAt: at(45).toISOString() }), at(5))).toEqual({ kind: "live" });
  });

  it("asks for a status once an active session has ended", () => {
    expect(readiness(session({ startsAt: start.toISOString(), endsAt: at(45).toISOString() }), at(60))).toEqual({ kind: "needs_update" });
  });

  it("stays silent for closed sessions", () => {
    expect(readiness(session({ status: "cancelled", startsAt: start.toISOString(), endsAt: at(45).toISOString() }), at(60))).toBeNull();
  });
});

describe("matchesFilter", () => {
  const now = new Date(2026, 10, 16, 15, 0);
  const past = session({ id: "past", startsAt: new Date(2026, 10, 16, 9, 0).toISOString(), endsAt: new Date(2026, 10, 16, 9, 45).toISOString() });
  const later = session({ id: "later", startsAt: new Date(2026, 10, 16, 18, 0).toISOString(), endsAt: new Date(2026, 10, 16, 18, 45).toISOString() });

  it("separates active sessions that still need a status from upcoming ones", () => {
    expect(matchesFilter(past, "needs_update", now)).toBe(true);
    expect(matchesFilter(past, "upcoming", now)).toBe(false);
    expect(matchesFilter(later, "upcoming", now)).toBe(true);
    expect(matchesFilter(later, "needs_update", now)).toBe(false);
  });

  it("matches today's sessions regardless of status", () => {
    expect(matchesFilter({ ...later, status: "completed" }, "today", now)).toBe(true);
  });
});

describe("sortForFilter", () => {
  it("lists completed sessions newest first", () => {
    const older = session({ id: "a", startsAt: "2026-11-02T10:00:00Z", endsAt: "2026-11-02T10:45:00Z", status: "completed" });
    const newer = session({ id: "b", startsAt: "2026-11-09T10:00:00Z", endsAt: "2026-11-09T10:45:00Z", status: "completed" });
    expect(sortForFilter("completed", [older, newer]).map((s) => s.id)).toEqual(["b", "a"]);
    expect(sortForFilter("upcoming", [newer, older]).map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("dashboardStats and tutoringHours", () => {
  const now = new Date(2026, 10, 16, 15, 0);
  const sessions = [
    session({ id: "done", startsAt: new Date(2026, 10, 16, 10).toISOString(), endsAt: new Date(2026, 10, 16, 11).toISOString(), status: "completed" }),
    session({ id: "stale", startsAt: new Date(2026, 10, 16, 9).toISOString(), endsAt: new Date(2026, 10, 16, 9, 45).toISOString() }),
    session({ id: "soon", startsAt: new Date(2026, 10, 18, 9).toISOString(), endsAt: new Date(2026, 10, 18, 9, 30).toISOString() }),
    session({ id: "gone", status: "cancelled", startsAt: new Date(2026, 10, 16, 17).toISOString(), endsAt: new Date(2026, 10, 16, 17, 45).toISOString() }),
  ];

  it("counts the dashboard summary", () => {
    expect(dashboardStats(sessions, now)).toEqual({ today: 2, nextSevenDays: 1, needsUpdate: 1, completedThisWeek: 1 });
  });

  it("totals hours from completed and active sessions only", () => {
    expect(tutoringHours(sessions)).toBe(2.3);
  });
});
