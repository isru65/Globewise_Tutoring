import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import {
  assertCanTutorStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";
import { notify, recordAudit } from "../server/lib/platform.js";

const STATUSES = [
  "draft",
  "pending_review",
  "approved",
  "published",
  "in_progress",
  "completed",
  "archived",
] as const;

const ALLOWED: Record<string, string[]> = {
  draft: ["pending_review"],
  pending_review: ["approved", "draft"],
  approved: ["published", "pending_review"],
  published: ["in_progress", "archived"],
  in_progress: ["completed", "archived"],
  completed: ["archived"],
  archived: [],
};

export default defineAction({
  description:
    "Move a learning plan through its workflow (Draft, Pending Review, Approved, Published, In Progress, Completed, Archived). Publishing gives the student access and notifies the family.",
  schema: z.object({
    id: z.string(),
    status: z.enum(STATUSES),
  }),
  run: async ({ id, status }) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [plan] = await db
      .select()
      .from(schema.learningPlans)
      .where(eq(schema.learningPlans.id, id));
    if (!plan) fail("Plan not found", { statusCode: 404 });
    const student = await loadStudent(plan.studentId);
    assertCanTutorStudent(user, student);
    if (!ALLOWED[plan.status]?.includes(status)) {
      fail(`A ${plan.status.replace("_", " ")} plan cannot move to ${status.replace("_", " ")}`, {
        statusCode: 409,
      });
    }
    const [after = expectRow()] = await db
      .update(schema.learningPlans)
      .set({
        status,
        publishedAt: status === "published" ? new Date().toISOString() : plan.publishedAt,
      })
      .where(eq(schema.learningPlans.id, id))
      .returning();
    if (status === "published") {
      await notify(student.parentEmail, "Weekly plan published", `${student.firstName}'s plan for the week of ${plan.weekStart} is ready.`);
      if (student.studentEmail) {
        await notify(student.studentEmail, "New weekly plan", `Your plan for the week of ${plan.weekStart} is ready.`);
      }
    }
    await recordAudit(user.email, `plan.${status}`, "learning_plan", id, plan, after);
    return after;
  },
});
