import { defineAction } from "@agent-native/core/action";
import { desc } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser, requireRole } from "../server/lib/access.js";

export default defineAction({
  description: "List recent audit log entries for administrative and workflow changes (admin only).",
  schema: z.object({ limit: z.number().int().min(1).max(500).default(200) }),
  http: { method: "GET" },
  run: async ({ limit }) => {
    requireRole(await getCurrentUser(), ["admin"]);
    return getDb()
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);
  },
});
