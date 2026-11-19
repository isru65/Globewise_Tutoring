import { defineAction, fail } from "@agent-native/core/action";
import { getRequestUserEmail } from "@agent-native/core/server/request-context";
import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";

export default defineAction({
  description:
    "Return the signed-in user's app profile, creating it on first sign-in. The first account becomes admin; later accounts start as parents.",
  schema: z.object({}),
  run: async () => {
    const email = getRequestUserEmail();
    if (!email) fail("Not authenticated", { statusCode: 401 });
    const db = getDb();
    const [existing] = await db
      .select()
      .from(schema.appUsers)
      .where(eq(schema.appUsers.email, email));
    if (existing) return existing;
    const [{ admins } = expectRow()] = await db
      .select({ admins: count() })
      .from(schema.appUsers)
      .where(eq(schema.appUsers.role, "admin"));
    const [created = expectRow()] = await db
      .insert(schema.appUsers)
      .values({
        id: crypto.randomUUID(),
        email,
        name: email.split("@")[0],
        role: admins === 0 ? "admin" : "parent",
        status: "active",
      })
      .returning();
    return created;
  },
});
