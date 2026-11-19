import { defineAction, fail } from "@agent-native/core/action";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, requireRole } from "../server/lib/access.js";
import { recordAudit } from "../server/lib/platform.js";

export default defineAction({
  description:
    "Register a child under the caller's parent account. Grades run from 0 (Kindergarten) to 8.",
  schema: z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    gradeLevel: z.number().int().min(0).max(8),
    timezone: z.string().min(1).default("America/New_York"),
    parentEmail: z.string().email().optional().describe("Admin only"),
  }),
  run: async ({ firstName, lastName, gradeLevel, timezone, parentEmail }) => {
    const user = await getCurrentUser();
    requireRole(user, ["parent", "admin"]);
    if (parentEmail && user.role !== "admin") {
      fail("Only admins can register a child for another parent", { statusCode: 403 });
    }
    const [student = expectRow()] = await getDb()
      .insert(schema.students)
      .values({
        id: crypto.randomUUID(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gradeLevel,
        timezone,
        parentEmail: parentEmail ?? user.email,
      })
      .returning();
    await recordAudit(user.email, "student.create", "student", student.id, null, student);
    return student;
  },
});
