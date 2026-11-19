import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, gt, inArray, lt, ne, or } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import {
  assertCanTutorStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";
import { notify, recordAudit } from "../server/lib/platform.js";

export default defineAction({
  description:
    "Update a session's status or attendance, or reschedule it to new times with a conflict check. Parents are notified of cancellations and reschedules.",
  schema: z.object({
    id: z.string(),
    status: z
      .enum(["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show", "rescheduled"])
      .optional(),
    attendance: z.enum(["present", "absent", "late"]).nullable().optional(),
    startsAt: z.string().datetime({ offset: true }).optional(),
    endsAt: z.string().datetime({ offset: true }).optional(),
  }),
  run: async ({ id, status, attendance, startsAt, endsAt }) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [before] = await db
      .select()
      .from(schema.tutoringSessions)
      .where(eq(schema.tutoringSessions.id, id));
    if (!before) fail("Session not found", { statusCode: 404 });
    const student = await loadStudent(before.studentId);
    assertCanTutorStudent(user, student);

    const nextStart = startsAt ?? before.startsAt;
    const nextEnd = endsAt ?? before.endsAt;
    const timesChanged = startsAt !== undefined || endsAt !== undefined;
    if (timesChanged) {
      if (new Date(nextEnd) <= new Date(nextStart)) {
        fail("End time must be after the start time", { statusCode: 400 });
      }
      const [conflict] = await db
        .select({ id: schema.tutoringSessions.id })
        .from(schema.tutoringSessions)
        .where(
          and(
            ne(schema.tutoringSessions.id, id),
            or(
              eq(schema.tutoringSessions.tutorEmail, before.tutorEmail),
              eq(schema.tutoringSessions.studentId, before.studentId),
            ),
            inArray(schema.tutoringSessions.status, ["scheduled", "confirmed", "in_progress"]),
            lt(schema.tutoringSessions.startsAt, nextEnd),
            gt(schema.tutoringSessions.endsAt, nextStart),
          ),
        );
      if (conflict) fail("The new time overlaps another session", { statusCode: 409 });
    }

    const patch: Record<string, unknown> = {};
    if (attendance !== undefined) patch.attendance = attendance;
    if (timesChanged) {
      patch.startsAt = nextStart;
      patch.endsAt = nextEnd;
      patch.status = status ?? "rescheduled";
    } else if (status !== undefined) {
      patch.status = status;
    }
    const [after = expectRow()] = await db
      .update(schema.tutoringSessions)
      .set(patch)
      .where(eq(schema.tutoringSessions.id, id))
      .returning();

    if (after.status === "cancelled" || after.status === "rescheduled") {
      await notify(
        student.parentEmail,
        after.status === "cancelled" ? "Session cancelled" : "Session rescheduled",
        `${student.firstName}'s ${after.subject} session is now ${after.status}.`,
      );
    }
    await recordAudit(user.email, "session.update", "tutoring_session", id, before, after);
    return after;
  },
});
