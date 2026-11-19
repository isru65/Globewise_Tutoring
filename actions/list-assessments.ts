import { defineAction } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser } from "../server/lib/access.js";

export default defineAction({
  description:
    "List assessments. Tutors and admins see drafts too; students and parents see published assessments only.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const user = await getCurrentUser();
    const staff = user.role === "tutor" || user.role === "admin";
    const db = getDb();
    const query = db.select().from(schema.assessments);
    return (
      staff
        ? query
        : query.where(eq(schema.assessments.status, "published"))
    ).orderBy(asc(schema.assessments.title));
  },
});
