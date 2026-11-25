import { asc } from "drizzle-orm";
import { eventHandler, getQuery, setResponseStatus } from "h3";
import { getDb, schema } from "../../../db";

type ProgressRow = {
  topicId?: unknown;
  curriculumTopicId?: unknown;
  studentId?: unknown;
  userId?: unknown;
  status?: unknown;
  completed?: unknown;
  completedAt?: unknown;
  masteryScore?: unknown;
};

async function resolveCompletedTopicIds(
  db: Awaited<ReturnType<typeof getDb>>,
  studentIdFilter?: string,
): Promise<string[]> {
  const schemaRecord = schema as Record<string, unknown>;
  const candidateTable =
    schemaRecord.studentTopicProgress ??
    schemaRecord.topicProgress ??
    schemaRecord.studentProgress ??
    schemaRecord.curriculumProgress ??
    schemaRecord.progress;

  if (!candidateTable) {
    return [];
  }

  const rows = (await db
    .select()
    .from(candidateTable as Parameters<Awaited<ReturnType<typeof getDb>>["select"]>[0] extends never
      ? never
      : never)) as unknown as ProgressRow[];

  const completedSet = new Set<string>();

  for (const row of rows) {
    const rowStudentId =
      typeof row.studentId === "string"
        ? row.studentId
        : typeof row.userId === "string"
          ? row.userId
          : undefined;

    if (studentIdFilter && rowStudentId && rowStudentId !== studentIdFilter) {
      continue;
    }

    const isCompleted =
      row.completed === true ||
      row.status === "completed" ||
      row.status === "mastered" ||
      Boolean(row.completedAt) ||
      (typeof row.masteryScore === "number" && row.masteryScore >= 80);

    if (!isCompleted) {
      continue;
    }

    const topicId =
      typeof row.topicId === "string" && row.topicId.length > 0
        ? row.topicId
        : typeof row.curriculumTopicId === "string" && row.curriculumTopicId.length > 0
          ? row.curriculumTopicId
          : null;

    if (topicId) {
      completedSet.add(topicId);
    }
  }

  return Array.from(completedSet);
}

export default eventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const gradeParam = typeof query.grade === "string" ? query.grade.trim() : "";
    const subjectParam = typeof query.subject === "string" ? query.subject.trim() : "";
    const unitParam = typeof query.unit === "string" ? query.unit.trim() : "";
    const studentIdParam =
      typeof query.studentId === "string" && query.studentId.trim()
        ? query.studentId.trim()
        : undefined;
    const searchParam =
      typeof query.q === "string" ? query.q.trim().toLowerCase() : "";

    const db = await getDb();
    const table = schema.curriculumTopics;

    const [rows, completedTopicIds] = await Promise.all([
      db
        .select()
        .from(table)
        .orderBy(asc(table.sortOrder), asc(table.title)),
      resolveCompletedTopicIds(db, studentIdParam),
    ]);

    const filtered = rows.filter((row) => {
      if (gradeParam && gradeParam !== "all") {
        const gradeNum = Number(gradeParam);
        if (!Number.isNaN(gradeNum) && Number(row.gradeLevel) !== gradeNum) {
          return false;
        }
      }
      if (subjectParam && subjectParam !== "all" && row.subject !== subjectParam) {
        return false;
      }
      if (unitParam && unitParam !== "all" && row.unit !== unitParam) {
        return false;
      }
      if (searchParam) {
        const haystack = [
          row.title,
          row.unit,
          row.subject,
          row.description ?? "",
          row.objectives ?? "",
          row.standards ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(searchParam)) {
          return false;
        }
      }
      return true;
    });

    return {
      data: filtered,
      meta: {
        count: filtered.length,
        completedTopicIds,
      },
    };
  } catch (err) {
    setResponseStatus(event, 500);
    return {
      error: {
        code: "CURRICULUM_TOPICS_FETCH_FAILED",
        message:
          err instanceof Error ? err.message : "Failed to load curriculum topics",
      },
    };
  }
});