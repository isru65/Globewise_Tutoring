import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, requireRole } from "../server/lib/access.js";
import { recordAudit } from "../server/lib/platform.js";

export default defineAction({
  description:
    "Create an AI content draft from tutor criteria. The draft stays unpublished until a tutor approves it. No AI provider is connected yet, so the body is a labelled scaffold the tutor edits.",
  schema: z.object({
    jobType: z.enum(["lesson", "practice", "coding", "assessment_items", "summary"]),
    gradeLevel: z.number().int().min(0).max(8),
    subject: z.string().min(1),
    topic: z.string().default(""),
    criteria: z.string().min(1).max(2000),
  }),
  run: async ({ jobType, gradeLevel, subject, topic, criteria }) => {
    const user = await getCurrentUser();
    requireRole(user, ["tutor", "admin"]);
    const label = topic || subject;
    const [row = expectRow()] = await getDb()
      .insert(schema.aiOutputs)
      .values({
        id: crypto.randomUUID(),
        jobType,
        gradeLevel,
        subject,
        topic,
        criteria,
        title: `${label} (${jobType.replace("_", " ")})`,
        body: `Draft ${jobType.replace("_", " ")} for grade ${gradeLevel} ${subject}${topic ? `: ${topic}` : ""}.\n\nCriteria: ${criteria}\n\n[AI provider not connected yet. Edit this draft before approving.]`,
        requestedByEmail: user.email,
      })
      .returning();
    await recordAudit(user.email, "ai.generate", "ai_output", row.id, null, row);
    return row;
  },
});
