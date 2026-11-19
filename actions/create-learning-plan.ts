import { defineAction } from "@agent-native/core/action";
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
    "Create a draft weekly learning plan for an assigned student with its lessons, practice, and assessments.",
  schema: z.object({
    studentId: z.string(),
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    tutorNotes: z.string().default(""),
    items: z
      .array(
        z.object({
          topicId: z.string().optional(),
          title: z.string().min(1),
          activityType: z
            .enum(["Lesson", "Reading", "Video", "Practice", "Coding Activity", "Assessment"])
            .default("Lesson"),
          estimatedMinutes: z.number().int().min(5).max(240).default(30),
        }),
      )
      .min(1),
  }),
  run: async ({ studentId, weekStart, tutorNotes, items }) => {
    const user = await getCurrentUser();
    assertCanTutorStudent(user, await loadStudent(studentId));
    const plan = await getDb().transaction(async (tx) => {
      const [created = expectRow()] = await tx
        .insert(schema.learningPlans)
        .values({
          id: crypto.randomUUID(),
          studentId,
          weekStart,
          tutorNotes,
          status: "draft",
          createdByEmail: user.email,
        })
        .returning();
      await tx.insert(schema.learningPlanItems).values(
        items.map((item, index) => ({
          id: crypto.randomUUID(),
          planId: created.id,
          topicId: item.topicId,
          title: item.title.trim(),
          activityType: item.activityType,
          estimatedMinutes: item.estimatedMinutes,
          sortOrder: index + 1,
        })),
      );
      return created;
    });
    await recordAudit(user.email, "plan.create", "learning_plan", plan.id, null, plan);
    return plan;
  },
});
