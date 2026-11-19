import { defineAction } from "@agent-native/core/action";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser, scopeByStudent } from "../server/lib/access.js";

export default defineAction({
  description:
    "List tutoring sessions visible to the caller, soonest first, optionally for one student.",
  schema: z.object({ studentId: z.string().optional() }),
  http: { method: "GET" },
  run: async ({ studentId }) => {
    const user = await getCurrentUser();
    const conditions = [
      studentId ? eq(schema.tutoringSessions.studentId, studentId) : undefined,
      scopeByStudent(user, schema.tutoringSessions.studentId),
    ].filter((c) => c !== undefined);
    return getDb()
      .select()
      .from(schema.tutoringSessions)
      .where(and(...conditions))
      .orderBy(asc(schema.tutoringSessions.startsAt));
  },
});
