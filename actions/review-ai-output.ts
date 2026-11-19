import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, requireRole } from "../server/lib/access.js";
import { recordAudit } from "../server/lib/platform.js";

export default defineAction({
  description:
    "Edit, approve, or reject an AI draft. Only approved content reaches students.",
  schema: z.object({
    id: z.string(),
    decision: z.enum(["approve", "reject", "edit"]),
    body: z.string().min(1).max(20000).optional(),
    title: z.string().min(1).max(200).optional(),
  }),
  run: async ({ id, decision, body, title }) => {
    const user = await getCurrentUser();
    requireRole(user, ["tutor", "admin"]);
    const db = getDb();
    const [before] = await db
      .select()
      .from(schema.aiOutputs)
      .where(eq(schema.aiOutputs.id, id));
    if (!before) fail("AI output not found", { statusCode: 404 });
    if (decision === "edit" && body === undefined && title === undefined) {
      fail("Provide a title or body to edit", { statusCode: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (body !== undefined) patch.body = body;
    if (title !== undefined) patch.title = title;
    if (decision !== "edit") {
      patch.reviewStatus = decision === "approve" ? "approved" : "rejected";
      patch.reviewedByEmail = user.email;
    }
    const [after = expectRow()] = await db
      .update(schema.aiOutputs)
      .set(patch)
      .where(eq(schema.aiOutputs.id, id))
      .returning();
    await recordAudit(user.email, `ai.${decision}`, "ai_output", id, before, after);
    return after;
  },
});
