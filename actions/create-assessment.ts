import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, requireRole } from "../server/lib/access.js";
import { recordAudit } from "../server/lib/platform.js";

const questionSchema = z.object({
  questionType: z.enum(["multiple_choice", "multiple_select", "true_false", "short_answer", "numeric", "matching", "coding"]),
  prompt: z.string().min(1),
  options: z.array(z.string()).optional(),
  correctAnswer: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  points: z.number().int().min(1).max(20).default(1),
});

export default defineAction({
  description:
    "Create an assessment with its questions and answer keys. Set status to published to release it to students.",
  schema: z.object({
    title: z.string().min(1),
    subject: z.string().min(1),
    gradeLevel: z.number().int().min(0).max(8),
    timeLimitMinutes: z.number().int().min(1).max(240).nullable().optional(),
    attemptLimit: z.number().int().min(1).max(10).default(2),
    passingScore: z.number().int().min(0).max(100).default(70),
    status: z.enum(["draft", "published"]).default("draft"),
    questions: z.array(questionSchema).min(1),
  }),
  run: async ({ questions, ...fields }) => {
    const user = await getCurrentUser();
    requireRole(user, ["tutor", "admin"]);
    for (const question of questions) {
      if (["multiple_choice", "multiple_select"].includes(question.questionType) && !question.options?.length) {
        fail("Choice questions need options", { statusCode: 400 });
      }
    }
    const assessment = await getDb().transaction(async (tx) => {
      const [created = expectRow()] = await tx
        .insert(schema.assessments)
        .values({ id: crypto.randomUUID(), ...fields, createdByEmail: user.email })
        .returning();
      await tx.insert(schema.assessmentQuestions).values(
        questions.map((question, index) => ({
          id: crypto.randomUUID(),
          assessmentId: created.id,
          questionType: question.questionType,
          prompt: question.prompt,
          options: question.options ?? null,
          correctAnswer: question.correctAnswer,
          points: question.points,
          sortOrder: index + 1,
        })),
      );
      return created;
    });
    await recordAudit(user.email, "assessment.create", "assessment", assessment.id, null, assessment);
    return assessment;
  },
});
