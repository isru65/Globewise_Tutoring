import { defineAction, fail } from "@agent-native/core/action";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, loadStudent } from "../server/lib/access.js";
import { awardPoints } from "../server/lib/platform.js";

const LESSON_POINTS = 20;

export default defineAction({
  description:
    "Mark a plan item done or not done for the student. The first completion awards points once; finishing every item completes the plan.",
  schema: z.object({
    itemId: z.string(),
    completed: z.boolean(),
  }),
  run: async ({ itemId, completed }) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [item] = await db
      .select()
      .from(schema.learningPlanItems)
      .where(eq(schema.learningPlanItems.id, itemId));
    if (!item) fail("Plan item not found", { statusCode: 404 });
    const [plan] = await db
      .select()
      .from(schema.learningPlans)
      .where(eq(schema.learningPlans.id, item.planId));
    if (!plan) fail("Learning plan not found", { statusCode: 404 });
    const student = await loadStudent(plan.studentId);
    const isOwnStudent = user.role === "student" && student.studentEmail === user.email;
    if (!isOwnStudent && user.role !== "admin") {
      fail("Only the student can complete plan items", { statusCode: 403 });
    }
    if (!["published", "in_progress"].includes(plan.status)) {
      fail("This plan is not open for work yet", { statusCode: 409 });
    }

    const [after = expectRow()] = await db
      .update(schema.learningPlanItems)
      .set({
        completed,
        completedAt: completed ? new Date().toISOString() : null,
      })
      .where(eq(schema.learningPlanItems.id, itemId))
      .returning();

    if (completed) {
      await awardPoints(student.id, LESSON_POINTS, `Completed: ${item.title}`, `plan-item:${itemId}`);
    }
    if (plan.status === "published") {
      await db
        .update(schema.learningPlans)
        .set({ status: "in_progress" })
        .where(eq(schema.learningPlans.id, plan.id));
    }
    const [{ remaining } = expectRow()] = await db
      .select({ remaining: count() })
      .from(schema.learningPlanItems)
      .where(
        and(
          eq(schema.learningPlanItems.planId, plan.id),
          ne(schema.learningPlanItems.completed, true),
        ),
      );
    if (remaining === 0 && completed) {
      await db
        .update(schema.learningPlans)
        .set({ status: "completed" })
        .where(eq(schema.learningPlans.id, plan.id));
    }
    return after;
  },
});
