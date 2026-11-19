import { defineAction } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser } from "../server/lib/access.js";

export default defineAction({
  description: "Mark one of the caller's notifications as read.",
  schema: z.object({ id: z.string() }),
  run: async ({ id }) => {
    const user = await getCurrentUser();
    const [row = expectRow()] = await getDb()
      .update(schema.notifications)
      .set({ read: true })
      .where(
        and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.recipientEmail, user.email),
        ),
      )
      .returning();
    return row ?? null;
  },
});
