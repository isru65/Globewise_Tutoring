import { defineAction } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import {
  assertCanTutorStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";

export default defineAction({
  description:
    "Mark a topic active or completed for an assigned student, or reset it (tutors and admins).",
  schema: z.object({
    studentId: z.string(),
    topicId: z.string(),
    status: z.enum(["active", "completed", "reset"]),
  }),
  run: async ({ studentId, topicId, status }) => {
    const user = await getCurrentUser();
    assertCanTutorStudent(user, await loadStudent(studentId));
    const db = getDb();
    if (status === "reset") {
      await db
        .delete(schema.topicProgress)
        .where(
          and(
            eq(schema.topicProgress.studentId, studentId),
            eq(schema.topicProgress.topicId, topicId),
          ),
        );
      return { studentId, topicId, status: "reset" };
    }
    const [row = expectRow()] = await db
      .insert(schema.topicProgress)
      .values({ id: crypto.randomUUID(), studentId, topicId, status })
      .onConflictDoUpdate({
        target: [schema.topicProgress.studentId, schema.topicProgress.topicId],
        set: { status, updatedAt: new Date().toISOString() },
      })
      .returning();
    return row;
  },
});
