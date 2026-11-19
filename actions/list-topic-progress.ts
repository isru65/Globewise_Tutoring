import { defineAction } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import {
  assertCanViewStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";

export default defineAction({
  description:
    "List a student's roadmap progress (active and completed topics). Topics without a row are locked or not yet started.",
  schema: z.object({ studentId: z.string() }),
  http: { method: "GET" },
  run: async ({ studentId }) => {
    const user = await getCurrentUser();
    assertCanViewStudent(user, await loadStudent(studentId));
    return getDb()
      .select()
      .from(schema.topicProgress)
      .where(eq(schema.topicProgress.studentId, studentId));
  },
});
