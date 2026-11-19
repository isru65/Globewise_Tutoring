import { defineAction } from "@agent-native/core/action";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser } from "../server/lib/access.js";

export default defineAction({
  description: "List the caller's in-app notifications, newest first.",
  schema: z.object({ limit: z.number().int().min(1).max(100).default(50) }),
  http: { method: "GET" },
  run: async ({ limit }) => {
    const user = await getCurrentUser();
    return getDb()
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.recipientEmail, user.email))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit);
  },
});
