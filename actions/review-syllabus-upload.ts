import { defineAction, fail } from "@agent-native/core/action";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import {
  assertCanTutorStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";
import { notify, recordAudit } from "../server/lib/platform.js";

export default defineAction({
  description:
    "Approve a syllabus as the baseline for planning (every topic must have a confirmed mapping) or send it back with a note.",
  schema: z.object({
    id: z.string(),
    decision: z.enum(["approve", "reject"]),
    note: z.string().max(1000).default(""),
  }),
  run: async ({ id, decision, note }) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [upload] = await db
      .select()
      .from(schema.syllabusUploads)
      .where(eq(schema.syllabusUploads.id, id));
    if (!upload) fail("Upload not found", { statusCode: 404 });
    const student = await loadStudent(upload.studentId);
    assertCanTutorStudent(user, student);
    if (decision === "reject" && !note.trim()) {
      fail("Add a note explaining what to correct", { statusCode: 400 });
    }

    if (decision === "approve") {
      const [{ total } = expectRow()] = await db
        .select({ total: count() })
        .from(schema.syllabusTopics)
        .where(eq(schema.syllabusTopics.uploadId, id));
      const [{ unconfirmed } = expectRow()] = await db
        .select({ unconfirmed: count() })
        .from(schema.syllabusTopics)
        .where(
          and(
            eq(schema.syllabusTopics.uploadId, id),
            eq(schema.syllabusTopics.mappingConfirmed, false),
          ),
        );
      if (total === 0) fail("Add at least one school topic before approving", { statusCode: 400 });
      if (unconfirmed > 0) {
        fail(`${unconfirmed} topic mapping(s) still need confirmation`, { statusCode: 400 });
      }
    }

    const status = decision === "approve" ? "approved" : "rejected";
    const [after = expectRow()] = await db
      .update(schema.syllabusUploads)
      .set({ status, reviewedByEmail: user.email, reviewNote: note })
      .where(eq(schema.syllabusUploads.id, id))
      .returning();
    await notify(
      student.parentEmail,
      decision === "approve" ? "Syllabus approved" : "Syllabus needs changes",
      note || `Week of ${upload.weekStart} is approved.`,
    );
    await recordAudit(user.email, `syllabus.${decision}`, "syllabus_upload", id, upload, after);
    return after;
  },
});
