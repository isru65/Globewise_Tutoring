import { defineAction } from "@agent-native/core/action";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser, scopeByStudent } from "../server/lib/access.js";

export default defineAction({
  description:
    "List weekly school syllabus uploads visible to the caller, newest first, optionally for one student.",
  schema: z.object({ studentId: z.string().optional() }),
  http: { method: "GET" },
  run: async ({ studentId }) => {
    const user = await getCurrentUser();
    const conditions = [
      studentId ? eq(schema.syllabusUploads.studentId, studentId) : undefined,
      scopeByStudent(user, schema.syllabusUploads.studentId),
    ].filter((c) => c !== undefined);
    return getDb()
      .select()
      .from(schema.syllabusUploads)
      .where(and(...conditions))
      .orderBy(desc(schema.syllabusUploads.weekStart));
  },
});
