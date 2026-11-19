import { defineAction, fail } from "@agent-native/core/action";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, requireRole } from "../server/lib/access.js";
import { recordAudit } from "../server/lib/platform.js";

export default defineAction({
  description:
    "Assign an approved tutor to a student and optionally link the student's own login (admin only).",
  schema: z.object({
    id: z.string().describe("Student id"),
    tutorEmail: z.string().email().nullable().optional(),
    studentEmail: z.string().email().nullable().optional(),
  }),
  run: async ({ id, tutorEmail, studentEmail }) => {
    const admin = await getCurrentUser();
    requireRole(admin, ["admin"]);
    const db = getDb();
    const [before] = await db
      .select()
      .from(schema.students)
      .where(eq(schema.students.id, id));
    if (!before) fail("Student not found", { statusCode: 404 });

    if (tutorEmail) {
      const [tutor] = await db
        .select()
        .from(schema.appUsers)
        .where(
          and(
            eq(schema.appUsers.email, tutorEmail),
            eq(schema.appUsers.role, "tutor"),
            eq(schema.appUsers.status, "active"),
          ),
        );
      if (!tutor) fail("Tutor must be an approved tutor account", { statusCode: 400 });
    }

    const patch: { tutorEmail?: string | null; studentEmail?: string | null } = {};
    if (tutorEmail !== undefined) patch.tutorEmail = tutorEmail;
    if (studentEmail !== undefined) patch.studentEmail = studentEmail;
    const [after = expectRow()] = await db
      .update(schema.students)
      .set(patch)
      .where(eq(schema.students.id, id))
      .returning();
    await recordAudit(admin.email, "student.link", "student", id, before, after);
    return after;
  },
});
