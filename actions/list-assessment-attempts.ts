import { defineAction } from "@agent-native/core/action";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser, scopeByStudent } from "../server/lib/access.js";

export default defineAction({
  description:
    "List assessment attempts and scores visible to the caller, optionally for one student or assessment.",
  schema: z.object({
    studentId: z.string().optional(),
    assessmentId: z.string().optional(),
  }),
  http: { method: "GET" },
  run: async ({ studentId, assessmentId }) => {
    const user = await getCurrentUser();
    const conditions = [
      studentId ? eq(schema.assessmentAttempts.studentId, studentId) : undefined,
      assessmentId ? eq(schema.assessmentAttempts.assessmentId, assessmentId) : undefined,
      scopeByStudent(user, schema.assessmentAttempts.studentId),
    ].filter((c) => c !== undefined);
    return getDb()
      .select()
      .from(schema.assessmentAttempts)
      .where(and(...conditions))
      .orderBy(desc(schema.assessmentAttempts.startedAt));
  },
});
