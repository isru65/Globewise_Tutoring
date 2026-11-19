import { defineAction, fail } from "@agent-native/core/action";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import {
  assertCanTutorStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";

export default defineAction({
  description:
    "Add a school topic from the original syllabus file to an upload the tutor is reviewing. Use this for the extracted text the tutor corrects.",
  schema: z.object({
    uploadId: z.string(),
    schoolSubject: z.string().min(1),
    schoolTopic: z.string().min(1),
    schoolDate: z.string().default(""),
    objective: z.string().default(""),
    suggestedTopicId: z.string().optional(),
  }),
  run: async (input) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [upload] = await db
      .select()
      .from(schema.syllabusUploads)
      .where(eq(schema.syllabusUploads.id, input.uploadId));
    if (!upload) fail("Upload not found", { statusCode: 404 });
    assertCanTutorStudent(user, await loadStudent(upload.studentId));
    if (upload.status === "approved") fail("Approved syllabi are locked", { statusCode: 409 });
    const [{ sortOrder } = expectRow()] = await db
      .select({ sortOrder: count() })
      .from(schema.syllabusTopics)
      .where(eq(schema.syllabusTopics.uploadId, input.uploadId));
    const [row = expectRow()] = await db
      .insert(schema.syllabusTopics)
      .values({
        id: crypto.randomUUID(),
        ...input,
        sortOrder: sortOrder + 1,
      })
      .returning();
    return row;
  },
});
