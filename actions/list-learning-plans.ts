import { defineAction } from "@agent-native/core/action";
import { and, desc, eq, notInArray } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser, scopeByStudent } from "../server/lib/access.js";

const UNPUBLISHED = ["draft", "pending_review", "approved"];

export default defineAction({
  description:
    "List weekly learning plans visible to the caller. Students and parents only see plans after publication.",
  schema: z.object({ studentId: z.string().optional() }),
  http: { method: "GET" },
  run: async ({ studentId }) => {
    const user = await getCurrentUser();
    const conditions = [
      studentId ? eq(schema.learningPlans.studentId, studentId) : undefined,
      scopeByStudent(user, schema.learningPlans.studentId),
      user.role === "tutor" || user.role === "admin"
        ? undefined
        : notInArray(schema.learningPlans.status, UNPUBLISHED),
    ].filter((c) => c !== undefined);
    return getDb()
      .select()
      .from(schema.learningPlans)
      .where(and(...conditions))
      .orderBy(desc(schema.learningPlans.weekStart));
  },
});
