import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import {
  assertCanTutorStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";
import { recordAudit } from "../server/lib/platform.js";

export default defineAction({
  description:
    "Add a tutor note to a session. Notes are private to tutors unless parentVisible is true.",
  schema: z.object({
    sessionId: z.string(),
    body: z.string().min(1).max(5000),
    parentVisible: z.boolean().default(false),
  }),
  run: async ({ sessionId, body, parentVisible }) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [session] = await db
      .select()
      .from(schema.tutoringSessions)
      .where(eq(schema.tutoringSessions.id, sessionId));
    if (!session) fail("Session not found", { statusCode: 404 });
    assertCanTutorStudent(user, await loadStudent(session.studentId));
    const [note = expectRow()] = await db
      .insert(schema.sessionNotes)
      .values({
        id: crypto.randomUUID(),
        sessionId,
        authorEmail: user.email,
        body: body.trim(),
        parentVisible,
      })
      .returning();
    await recordAudit(user.email, "session.note", "session_note", note.id, null, note);
    return note;
  },
});
