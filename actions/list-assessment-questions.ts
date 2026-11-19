import { defineAction, fail } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser } from "../server/lib/access.js";

export default defineAction({
  description:
    "List the questions of an assessment. Answer keys are only returned to tutors and admins.",
  schema: z.object({ assessmentId: z.string() }),
  http: { method: "GET" },
  run: async ({ assessmentId }) => {
    const user = await getCurrentUser();
    const staff = user.role === "tutor" || user.role === "admin";
    const db = getDb();
    const [assessment] = await db
      .select()
      .from(schema.assessments)
      .where(eq(schema.assessments.id, assessmentId));
    if (!assessment) fail("Assessment not found", { statusCode: 404 });
    if (!staff && assessment.status !== "published") {
      fail("Assessment not found", { statusCode: 404 });
    }
    const questions = await db
      .select()
      .from(schema.assessmentQuestions)
      .where(eq(schema.assessmentQuestions.assessmentId, assessmentId))
      .orderBy(asc(schema.assessmentQuestions.sortOrder));
    if (staff) return questions;
    return questions.map(({ correctAnswer: _hidden, ...question }) => question);
  },
});
