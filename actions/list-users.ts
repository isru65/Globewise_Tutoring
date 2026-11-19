import { defineAction } from "@agent-native/core/action";
import { asc } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser, requireRole } from "../server/lib/access.js";

export default defineAction({
  description: "List all accounts with their roles and approval status (admin only).",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    requireRole(await getCurrentUser(), ["admin"]);
    return getDb()
      .select()
      .from(schema.appUsers)
      .orderBy(asc(schema.appUsers.name));
  },
});
