import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import {
  assertCanTutorStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";

export default defineAction({
  description:
    "Correct an extracted school topic and map it to a curriculum topic. A mapping only counts once the tutor confirms it.",
  schema: z.object({
    id: z.string(),
    schoolSubject: z.string().min(1).optional(),
    schoolTopic: z.string().min(1).optional(),
    schoolDate: z.string().optional(),
    objective: z.string().optional(),
    curriculumTopicId: z.string().nullable().optional(),
    mappingConfirmed: z.boolean().optional(),
  }),
  run: async ({ id, ...fields }) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [topic] = await db
      .select()
      .from(schema.syllabusTopics)
      .where(eq(schema.syllabusTopics.id, id));
    if (!topic) fail("Syllabus topic not found", { statusCode: 404 });
    const [upload] = await db
      .select()
      .from(schema.syllabusUploads)
      .where(eq(schema.syllabusUploads.id, topic.uploadId));
    if (!upload) fail("Syllabus upload not found", { statusCode: 404 });
    assertCanTutorStudent(user, await loadStudent(upload.studentId));
    if (upload.status === "approved") fail("Approved syllabi are locked", { statusCode: 409 });

    const patch = { ...fields } as Record<string, unknown>;
    const nextCurriculumId =
      fields.curriculumTopicId !== undefined ? fields.curriculumTopicId : topic.curriculumTopicId;
    if (fields.mappingConfirmed && !nextCurriculumId) {
      fail("Choose a curriculum topic before confirming the mapping", { statusCode: 400 });
    }
    if (fields.curriculumTopicId !== undefined && fields.mappingConfirmed === undefined) {
      patch.mappingConfirmed = false;
    }
    const [row = expectRow()] = await db
      .update(schema.syllabusTopics)
      .set(patch)
      .where(eq(schema.syllabusTopics.id, id))
      .returning();
    return row;
  },
});
