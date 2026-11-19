import { defineAction, fail } from "@agent-native/core/action";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, requireRole } from "../server/lib/access.js";
import { recordAudit } from "../server/lib/platform.js";

export default defineAction({
  description:
    "Change an account's role or approval status (admin only). Setting the tutor role puts the account in pending until approved.",
  schema: z.object({
    id: z.string().describe("User id"),
    role: z.enum(["student", "parent", "tutor", "admin"]).optional(),
    status: z.enum(["active", "pending", "suspended"]).optional(),
  }),
  run: async ({ id, role, status }) => {
    const admin = await getCurrentUser();
    requireRole(admin, ["admin"]);
    const db = getDb();
    const [before] = await db
      .select()
      .from(schema.appUsers)
      .where(eq(schema.appUsers.id, id));
    if (!before) fail("User not found", { statusCode: 404 });

    const patch: { role?: string; status?: string } = {};
    if (role !== undefined) patch.role = role;
    if (status !== undefined) patch.status = status;
    else if (role === "tutor" && before.role !== "tutor") patch.status = "pending";
    if (before.email === admin.email && patch.role && patch.role !== "admin") {
      fail("Admins cannot remove their own admin role", { statusCode: 400 });
    }

    const [after = expectRow()] = await db
      .update(schema.appUsers)
      .set(patch)
      .where(eq(schema.appUsers.id, id))
      .returning();
    await recordAudit(admin.email, "user.update", "user", id, before, after);
    return after;
  },
});
