import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, loadStudent } from "../server/lib/access.js";
import { awardPoints } from "../server/lib/platform.js";

const SUBMIT_POINTS = 30;
const TIME_GRACE_MS = 60_000;
const OBJECTIVE_TYPES = ["multiple_choice", "multiple_select", "true_false", "numeric"];

function isCorrect(type: string, given: unknown, expected: unknown) {
  if (type === "numeric") return Number(given) === Number(expected);
  if (type === "multiple_select") {
    const a = Array.isArray(given) ? [...given].map(String).sort() : [];
    const b = Array.isArray(expected) ? [...expected].map(String).sort() : [];
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }
  return String(given).trim().toLowerCase() === String(expected).trim().toLowerCase();
}

export default defineAction({
  description:
    "Submit an open attempt. Objective questions are auto-graded; short-answer questions wait for tutor grading. Submissions after the time limit are rejected.",
  schema: z.object({
    attemptId: z.string(),
    answers: z.record(z.string(), z.unknown()).default({}),
  }),
  run: async ({ attemptId, answers }) => {
    const user = await getCurrentUser();
    const db = getDb();
    const [attempt] = await db
      .select()
      .from(schema.assessmentAttempts)
      .where(eq(schema.assessmentAttempts.id, attemptId));
    if (!attempt) fail("Attempt not found", { statusCode: 404 });
    const student = await loadStudent(attempt.studentId);
    const isOwnStudent = user.role === "student" && student.studentEmail === user.email;
    if (!isOwnStudent && user.role !== "admin") {
      fail("Only the student can submit this attempt", { statusCode: 403 });
    }
    if (attempt.status !== "in_progress") fail("This attempt is already submitted", { statusCode: 409 });

    const [assessment] = await db
      .select()
      .from(schema.assessments)
      .where(eq(schema.assessments.id, attempt.assessmentId));
    if (!assessment) fail("Assessment not found", { statusCode: 404 });
    if (assessment.timeLimitMinutes) {
      const elapsed = Date.now() - new Date(attempt.startedAt).getTime();
      if (elapsed > assessment.timeLimitMinutes * 60_000 + TIME_GRACE_MS) {
        fail("The time limit for this attempt has passed", { statusCode: 409 });
      }
    }

    const questions = await db
      .select()
      .from(schema.assessmentQuestions)
      .where(eq(schema.assessmentQuestions.assessmentId, assessment.id));
    let score = 0;
    let maxScore = 0;
    let needsTutor = false;
    for (const question of questions) {
      maxScore += question.points;
      if (!OBJECTIVE_TYPES.includes(question.questionType)) {
        needsTutor = true;
        continue;
      }
      if (isCorrect(question.questionType, answers[question.id], question.correctAnswer)) {
        score += question.points;
      }
    }
    const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 100);
    const status = needsTutor ? "pending_grading" : "graded";

    const [after = expectRow()] = await db
      .update(schema.assessmentAttempts)
      .set({
        answers,
        status,
        score,
        maxScore,
        percent,
        passed: status === "graded" && percent >= assessment.passingScore,
        submittedAt: new Date().toISOString(),
      })
      .where(eq(schema.assessmentAttempts.id, attemptId))
      .returning();
    await awardPoints(student.id, SUBMIT_POINTS, `Assessment completed: ${assessment.title}`, `attempt:${attemptId}`);
    return after;
  },
});
