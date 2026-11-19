import { defineAction } from "@agent-native/core/action";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import {
  assertCanViewStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";

const PLAN_VISIBLE = ["published", "in_progress", "completed", "archived"];

export default defineAction({
  description:
    "Build a student's progress report: plan completion, assessment scores, roadmap status, tutoring attendance, and parent-visible tutor notes.",
  schema: z.object({ studentId: z.string() }),
  http: { method: "GET" },
  run: async ({ studentId }) => {
    const user = await getCurrentUser();
    const student = await loadStudent(studentId);
    assertCanViewStudent(user, student);
    const db = getDb();

    const plans = await db
      .select()
      .from(schema.learningPlans)
      .where(
        and(
          eq(schema.learningPlans.studentId, studentId),
          inArray(schema.learningPlans.status, PLAN_VISIBLE),
        ),
      );
    const planIds = plans.map((plan) => plan.id);
    const items = planIds.length
      ? await db
          .select()
          .from(schema.learningPlanItems)
          .where(inArray(schema.learningPlanItems.planId, planIds))
      : [];
    const completedItems = items.filter((item) => item.completed).length;

    const attempts = await db
      .select()
      .from(schema.assessmentAttempts)
      .where(eq(schema.assessmentAttempts.studentId, studentId));
    const gradedAttempts = attempts.filter((attempt) => attempt.status === "graded");
    const averageScore = gradedAttempts.length
      ? Math.round(gradedAttempts.reduce((sum, a) => sum + a.percent, 0) / gradedAttempts.length)
      : null;

    const sessions = await db
      .select()
      .from(schema.tutoringSessions)
      .where(
        and(
          eq(schema.tutoringSessions.studentId, studentId),
          notInArray(schema.tutoringSessions.status, ["cancelled", "rescheduled"]),
        ),
      );
    const pastSessions = sessions.filter((s) => new Date(s.endsAt) <= new Date());
    const attended = pastSessions.filter((s) => s.attendance === "present" || s.attendance === "late").length;

    const sessionIds = sessions.map((s) => s.id);
    const parentNotes = sessionIds.length
      ? await db
          .select()
          .from(schema.sessionNotes)
          .where(
            and(
              inArray(schema.sessionNotes.sessionId, sessionIds),
              eq(schema.sessionNotes.parentVisible, true),
            ),
          )
      : [];

    const topicRows = await db
      .select()
      .from(schema.topicProgress)
      .where(eq(schema.topicProgress.studentId, studentId));

    return {
      studentName: `${student.firstName} ${student.lastName}`,
      plans: plans.map((plan) => {
        const planItems = items.filter((item) => item.planId === plan.id);
        return {
          id: plan.id,
          weekStart: plan.weekStart,
          status: plan.status,
          completed: planItems.filter((item) => item.completed).length,
          total: planItems.length,
        };
      }),
      lessonCompletionRate: items.length ? Math.round((completedItems / items.length) * 100) : 0,
      assessmentAverage: averageScore,
      assessmentAttempts: gradedAttempts.map((a) => ({
        id: a.id,
        percent: a.percent,
        passed: a.passed,
        submittedAt: a.submittedAt,
      })),
      attendanceRate: pastSessions.length ? Math.round((attended / pastSessions.length) * 100) : null,
      sessionsAttended: attended,
      sessionsPast: pastSessions.length,
      topicsCompleted: topicRows.filter((t) => t.status === "completed").length,
      topicsActive: topicRows.filter((t) => t.status === "active").length,
      parentVisibleNotes: parentNotes.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt })),
    };
  },
});
