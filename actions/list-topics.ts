import { defineAction } from "@agent-native/core/action";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser } from "../server/lib/access.js";

export default defineAction({
  description:
    "List curriculum topics, optionally filtered by program (academic or coding) and grade level.",
  schema: z.object({
    program: z.enum(["academic", "coding"]).optional(),
    gradeLevel: z.number().int().min(0).max(8).optional(),
  }),
  http: { method: "GET" },
  run: async ({ program, gradeLevel }) => {
    await getCurrentUser();
    const conditions = [
      program ? eq(schema.curriculumTopics.program, program) : undefined,
      gradeLevel !== undefined
        ? eq(schema.curriculumTopics.gradeLevel, gradeLevel)
        : undefined,
    ].filter((c) => c !== undefined);
    return getDb()
      .select()
      .from(schema.curriculumTopics)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(
        asc(schema.curriculumTopics.gradeLevel),
        asc(schema.curriculumTopics.sortOrder),
      );
  },
});
