import { defineAction, fail } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import {
  assertCanViewStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";

const UNPUBLISHED = ["draft", "pending_review", "approved"];

export default defineAction({
  description: "List the lessons, practice, and assessments inside one weekly learning plan.",
  schema: z.object({ planId: z.string() }),
  http: { method: "GET" },
  run: async ({ planId }) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [plan] = await db
      .select()
      .from(schema.learningPlans)
      .where(eq(schema.learningPlans.id, planId));
    if (!plan) fail("Plan not found", { statusCode: 404 });
    assertCanViewStudent(user, await loadStudent(plan.studentId));
    if (
      (user.role === "parent" || user.role === "student") &&
      UNPUBLISHED.includes(plan.status)
    ) {
      fail("Plan not found", { statusCode: 404 });
    }
    return db
      .select()
      .from(schema.learningPlanItems)
      .where(eq(schema.learningPlanItems.planId, planId))
      .orderBy(asc(schema.learningPlanItems.sortOrder));
  },
});
