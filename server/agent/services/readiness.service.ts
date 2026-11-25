import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "../../../server/db.js";

export type ReadinessAction =
  | "MARK_READY"
  | "TUTOR_JOIN"
  | "STUDENT_JOIN"
  | "TOGGLE_ACTIVE";

export async function updateSessionReadiness(
  sessionId: string,
  action: ReadinessAction,
) {
  const db = getDb();
  const sessionsTable = schema.tutoringSessions;
  const nowIso: string = new Date().toISOString();

  if (action === "MARK_READY") {
    const [updated] = await db
      .update(sessionsTable)
      .set({
        sessionPrepared: true,
        tutorReady: true,
        updatedAt: nowIso,
      })
      .where(eq(sessionsTable.id, sessionId))
      .returning();

    if (!updated) {
      throw new Error(`Tutoring session not found for id=${sessionId}`);
    }
    return updated;
  }

  if (action === "TUTOR_JOIN") {
    const [updated] = await db
      .update(sessionsTable)
      .set({
        tutorJoined: true,
        tutorReady: true,
        attendance: "tutor_joined",
        updatedAt: nowIso,
      })
      .where(eq(sessionsTable.id, sessionId))
      .returning();

    if (!updated) {
      throw new Error(`Tutoring session not found for id=${sessionId}`);
    }
    return updated;
  }

  if (action === "STUDENT_JOIN") {
    const [updated] = await db
      .update(sessionsTable)
      .set({
        studentJoined: true,
        attendance: "present",
        updatedAt: nowIso,
      })
      .where(eq(sessionsTable.id, sessionId))
      .returning();

    if (!updated) {
      throw new Error(`Tutoring session not found for id=${sessionId}`);
    }
    return updated;
  }

  const [updated] = await db
    .update(sessionsTable)
    .set({
      isActive: sql`NOT ${sessionsTable.isActive}`,
      updatedAt: nowIso,
    })
    .where(eq(sessionsTable.id, sessionId))
    .returning();

  if (!updated) {
    throw new Error(`Tutoring session not found for id=${sessionId}`);
  }

  return updated;
}