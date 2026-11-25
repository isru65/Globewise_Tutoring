import { randomUUID } from "node:crypto";
import { eventHandler, readBody, setResponseStatus } from "h3";
import { getDb, schema } from "../../../db";

interface CreateCurriculumTopicBody {
  program?: unknown;
  gradeLevel?: unknown;
  subject?: unknown;
  unit?: unknown;
  title?: unknown;
  description?: unknown;
  objectives?: unknown;
  standards?: unknown;
  prerequisiteIds?: unknown;
  durationMinutes?: unknown;
  difficulty?: unknown;
  sortOrder?: unknown;
}

export default eventHandler(async (event) => {
  try {
    const rawBody = (await readBody(event)) as CreateCurriculumTopicBody | null;
    const body = rawBody ?? {};

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const unit = typeof body.unit === "string" ? body.unit.trim() : "";
    const subject =
      typeof body.subject === "string" && body.subject.trim()
        ? body.subject.trim()
        : "Mathematics";
    const program =
      typeof body.program === "string" && body.program.trim()
        ? body.program.trim()
        : "K-8 Core & Coding";

    const gradeNum = Number(body.gradeLevel);
    if (!title || !unit || Number.isNaN(gradeNum) || gradeNum < 0 || gradeNum > 12) {
      setResponseStatus(event, 400);
      return {
        error: {
          code: "INVALID_CURRICULUM_TOPIC",
          message:
            "A valid gradeLevel (0-12), unit, and topic title are required.",
        },
      };
    }

    const prerequisiteIds = Array.isArray(body.prerequisiteIds)
      ? body.prerequisiteIds.filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        )
      : [];

    const durationMinutes =
      typeof body.durationMinutes === "number" && Number.isFinite(body.durationMinutes)
        ? Math.max(5, Math.min(300, Math.round(body.durationMinutes)))
        : 45;

    const sortOrder =
      typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
        ? Math.round(body.sortOrder)
        : 0;

    const db = await getDb();
    const table = schema.curriculumTopics;

    const record: typeof table.$inferInsert = {
      id: randomUUID(),
      program,
      gradeLevel: gradeNum,
      subject,
      unit,
      title,
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : undefined,
      objectives:
        typeof body.objectives === "string" && body.objectives.trim()
          ? body.objectives.trim()
          : undefined,
      standards:
        typeof body.standards === "string" && body.standards.trim()
          ? body.standards.trim()
          : undefined,
      prerequisiteIds,
      durationMinutes,
      difficulty:
        typeof body.difficulty === "string" && body.difficulty.trim()
          ? body.difficulty.trim()
          : "Core",
      sortOrder,
      createdAt: new Date().toISOString(),
    };

    const [inserted] = await db.insert(table).values(record).returning();

    setResponseStatus(event, 201);
    return {
      data: inserted ?? record,
    };
  } catch (err) {
    setResponseStatus(event, 500);
    return {
      error: {
        code: "CURRICULUM_TOPIC_CREATE_FAILED",
        message:
          err instanceof Error ? err.message : "Failed to create curriculum topic",
      },
    };
  }
});