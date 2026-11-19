import { defineAction, fail } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import {
  assertCanViewStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";

export default defineAction({
  description: "List the school topics extracted from one syllabus upload, with their curriculum mappings.",
  schema: z.object({ uploadId: z.string() }),
  http: { method: "GET" },
  run: async ({ uploadId }) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [upload] = await db
      .select()
      .from(schema.syllabusUploads)
      .where(eq(schema.syllabusUploads.id, uploadId));
    if (!upload) fail("Upload not found", { statusCode: 404 });
    assertCanViewStudent(user, await loadStudent(upload.studentId));
    return db
      .select()
      .from(schema.syllabusTopics)
      .where(eq(schema.syllabusTopics.uploadId, uploadId))
      .orderBy(asc(schema.syllabusTopics.sortOrder));
  },
});
