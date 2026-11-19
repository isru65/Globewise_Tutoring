import { defineAction } from "@agent-native/core/action";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser } from "../server/lib/access.js";

export default defineAction({
  description:
    "List AI content. Tutors and admins see every draft; students and parents see approved materials only.",
  schema: z.object({
    reviewStatus: z.enum(["draft", "approved", "rejected"]).optional(),
  }),
  http: { method: "GET" },
  run: async ({ reviewStatus }) => {
    const user = await getCurrentUser();
    const staff = user.role === "tutor" || user.role === "admin";
    const conditions = [
      staff ? undefined : eq(schema.aiOutputs.reviewStatus, "approved"),
      reviewStatus ? eq(schema.aiOutputs.reviewStatus, reviewStatus) : undefined,
    ].filter((c) => c !== undefined);
    return getDb()
      .select()
      .from(schema.aiOutputs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(schema.aiOutputs.createdAt));
  },
});
