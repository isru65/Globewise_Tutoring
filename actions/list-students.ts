import { defineAction } from "@agent-native/core/action";
import { asc } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser, studentScope } from "../server/lib/access.js";

export default defineAction({
  description:
    "List the students the caller can see: their own children (parents), assigned students (tutors), or all students (admin).",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const user = await getCurrentUser();
    return getDb()
      .select()
      .from(schema.students)
      .where(studentScope(user))
      .orderBy(asc(schema.students.lastName));
  },
});
