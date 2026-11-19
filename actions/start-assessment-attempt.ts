import { defineAction, fail } from "@agent-native/core/action";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, loadStudent } from "../server/lib/access.js";

export default defineAction({
  description:
    "Start a student's attempt at a published assessment, or resume the open one. Enforces the attempt limit.",
  schema: z.object({
    assessmentId: z.string(),
    studentId: z.string(),
  }),
  run: async ({ assessmentId, studentId }) => {
    const user = await getCurrentUser();
    const student = await loadStudent(studentId);
    const isOwnStudent = user.role === "student" && student.studentEmail === user.email;
    if (!isOwnStudent && user.role !== "admin") {
      fail("Only the student can start this assessment", { statusCode: 403 });
    }
    const db = getDb();
    const [assessment] = await db
      .select()
      .from(schema.assessments)
      .where(eq(schema.assessments.id, assessmentId));
    if (!assessment || assessment.status !== "published") {
      fail("Assessment not found", { statusCode: 404 });
    }

    const [open] = await db
      .select()
      .from(schema.assessmentAttempts)
      .where(
        and(
          eq(schema.assessmentAttempts.assessmentId, assessmentId),
          eq(schema.assessmentAttempts.studentId, studentId),
          eq(schema.assessmentAttempts.status, "in_progress"),
        ),
      )
      .orderBy(desc(schema.assessmentAttempts.startedAt));
    if (open) return open;

    const [{ used } = expectRow()] = await db
      .select({ used: count() })
      .from(schema.assessmentAttempts)
      .where(
        and(
          eq(schema.assessmentAttempts.assessmentId, assessmentId),
          eq(schema.assessmentAttempts.studentId, studentId),
        ),
      );
    if (used >= assessment.attemptLimit) {
      fail("No attempts left for this assessment", { statusCode: 409 });
    }
    const [attempt = expectRow()] = await db
      .insert(schema.assessmentAttempts)
      .values({
        id: crypto.randomUUID(),
        assessmentId,
        studentId,
        attemptNumber: used + 1,
      })
      .returning();
    return attempt;
  },
});
