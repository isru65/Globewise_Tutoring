import { defineAction, fail } from "@agent-native/core/action";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import {
  assertCanViewStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";

export default defineAction({
  description:
    "List notes for a session. Parents only see notes the tutor marked parent-visible; students see none.",
  schema: z.object({ sessionId: z.string() }),
  http: { method: "GET" },
  run: async ({ sessionId }) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [session] = await db
      .select()
      .from(schema.tutoringSessions)
      .where(eq(schema.tutoringSessions.id, sessionId));
    if (!session) fail("Session not found", { statusCode: 404 });
    assertCanViewStudent(user, await loadStudent(session.studentId));
    if (user.role === "student") return [];
    const conditions = [
      eq(schema.sessionNotes.sessionId, sessionId),
      user.role === "parent" ? eq(schema.sessionNotes.parentVisible, true) : undefined,
    ].filter((c) => c !== undefined);
    return db
      .select()
      .from(schema.sessionNotes)
      .where(and(...conditions))
      .orderBy(asc(schema.sessionNotes.createdAt));
  },
});
