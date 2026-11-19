import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, gt, inArray, lt, or } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import {
  assertCanTutorStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";
import { notify, recordAudit } from "../server/lib/platform.js";

const INACTIVE_STATUSES = ["cancelled", "no_show", "rescheduled"];

function isAllowedMeetingUrl(raw: string) {
  try {
    const url = new URL(raw);
    const host = url.hostname;
    return (
      url.protocol === "https:" &&
      (host === "zoom.us" || host.endsWith(".zoom.us") || host === "meet.google.com")
    );
  } catch {
    return false;
  }
}

export default defineAction({
  description:
    "Schedule a 1-on-1 session with an external Zoom or Google Meet link. Rejects overlaps for the tutor or the student and notifies the parent.",
  schema: z.object({
    studentId: z.string(),
    subject: z.string().min(1),
    topic: z.string().default(""),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    timezone: z.string().optional(),
    meetingUrl: z.string().min(1),
  }),
  run: async (input) => {
    const user = await getCurrentUser();
    const student = await loadStudent(input.studentId);
    assertCanTutorStudent(user, student);
    if (new Date(input.endsAt) <= new Date(input.startsAt)) {
      fail("End time must be after the start time", { statusCode: 400 });
    }
    if (!isAllowedMeetingUrl(input.meetingUrl)) {
      fail("Use an https Zoom or Google Meet link", { statusCode: 400 });
    }
    const tutorEmail = student.tutorEmail ?? user.email;
    const db = getDb();
    const [conflict] = await db
      .select({ id: schema.tutoringSessions.id })
      .from(schema.tutoringSessions)
      .where(
        and(
          or(
            eq(schema.tutoringSessions.tutorEmail, tutorEmail),
            eq(schema.tutoringSessions.studentId, student.id),
          ),
          inArray(schema.tutoringSessions.status, ["scheduled", "confirmed", "in_progress"]),
          lt(schema.tutoringSessions.startsAt, input.endsAt),
          gt(schema.tutoringSessions.endsAt, input.startsAt),
        ),
      );
    if (conflict) fail("This time overlaps another session", { statusCode: 409 });

    const [session = expectRow()] = await db
      .insert(schema.tutoringSessions)
      .values({
        id: crypto.randomUUID(),
        studentId: student.id,
        tutorEmail,
        subject: input.subject,
        topic: input.topic,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timezone: input.timezone ?? student.timezone,
        meetingUrl: input.meetingUrl,
      })
      .returning();
    await notify(student.parentEmail, "Session scheduled", `${student.firstName} has a ${input.subject} session at ${input.startsAt}.`);
    await recordAudit(user.email, "session.create", "tutoring_session", session.id, null, session);
    return session;
  },
});
