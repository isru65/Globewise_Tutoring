import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "../../../server/db.js";

export type MasteryStatus =
  | "not_started"
  | "mastered"
  | "validated_ahead"
  | "attempted"
  | "targeted_focus";

export interface TopicMasterySummary {
  topicId: string;
  questionCount: number;
  scoreTotal: number;
  status: MasteryStatus;
}

export interface MasterySyncResult {
  attemptId: string;
  studentId: string;
  updatedTopics: TopicMasterySummary[];
}

function deriveMasteryStatus(percent: number): MasteryStatus {
  if (percent >= 85) return "mastered";
  if (percent >= 50) return "attempted";
  return "targeted_focus";
}

function normalizeMasteryStatus(
  rawStatus: string | undefined,
  fallback: MasteryStatus,
): MasteryStatus {
  if (
    rawStatus === "not_started" ||
    rawStatus === "mastered" ||
    rawStatus === "validated_ahead" ||
    rawStatus === "attempted" ||
    rawStatus === "targeted_focus"
  ) {
    return rawStatus;
  }
  return fallback;
}

export async function syncMasteryFromAssessment(
  attemptId: string,
  studentId: string,
): Promise<MasterySyncResult> {
  const db = getDb();
  const nowIso: string = new Date().toISOString();

  return db.transaction(async (tx) => {
    const [attempt] = await tx
      .update(schema.assessmentAttempts)
      .set({
        status: "submitted",
        submittedAt: nowIso,
      })
      .where(
        and(
          eq(schema.assessmentAttempts.id, attemptId),
          eq(schema.assessmentAttempts.studentId, studentId),
        ),
      )
      .returning();

    if (!attempt) {
      throw new Error(
        `Assessment attempt id=${attemptId} not found for student id=${studentId}`,
      );
    }

    const derivedStatus: MasteryStatus = deriveMasteryStatus(attempt.percent);

    const questionRows = await tx
      .select({
        topicId: schema.assessmentQuestions.topicId,
        questionCount: sql<number>`count(*)::int`,
        scoreTotal: sql<number>`coalesce(sum(${schema.assessmentQuestions.points}), 0)::int`,
      })
      .from(schema.assessmentQuestions)
      .where(eq(schema.assessmentQuestions.assessmentId, attempt.assessmentId))
      .groupBy(schema.assessmentQuestions.topicId);

    const updatedTopics: TopicMasterySummary[] = [];

    for (const row of questionRows) {
      const topicId: string | null = row.topicId;
      if (!topicId) continue;

      const [progressRow] = await tx
        .insert(schema.topicProgress)
        .values({
          id: crypto.randomUUID(),
          studentId,
          topicId,
          status: derivedStatus,
          updatedAt: nowIso,
        })
        .onConflictDoUpdate({
          target: [
            schema.topicProgress.studentId,
            schema.topicProgress.topicId,
          ],
          set: {
            status: sql`CASE
              WHEN ${schema.topicProgress.status} = 'validated_ahead'
                THEN 'validated_ahead'
              ELSE ${derivedStatus}
            END`,
            updatedAt: nowIso,
          },
        })
        .returning();

      const finalStatus: MasteryStatus = normalizeMasteryStatus(
        progressRow?.status,
        derivedStatus,
      );

      updatedTopics.push({
        topicId,
        questionCount: row.questionCount,
        scoreTotal: row.scoreTotal,
        status: finalStatus,
      });
    }

    return {
      attemptId,
      studentId,
      updatedTopics,
    };
  });
}