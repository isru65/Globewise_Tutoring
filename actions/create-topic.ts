import { defineAction } from "@agent-native/core/action";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, requireRole } from "../server/lib/access.js";

export default defineAction({
  description:
    "Add a curriculum topic with objectives, prerequisites, and standards (tutors and admins).",
  schema: z.object({
    program: z.enum(["academic", "coding"]),
    gradeLevel: z.number().int().min(0).max(8),
    subject: z.string().min(1),
    unit: z.string().min(1),
    title: z.string().min(1),
    description: z.string().default(""),
    objectives: z.string().default(""),
    standards: z.string().default(""),
    prerequisiteIds: z.array(z.string()).default([]),
    durationMinutes: z.number().int().min(5).max(240).default(45),
    difficulty: z.enum(["Intro", "Core", "Advanced"]).default("Core"),
    sortOrder: z.number().int().default(0),
  }),
  run: async (input) => {
    requireRole(await getCurrentUser(), ["tutor", "admin"]);
    const [row = expectRow()] = await getDb()
      .insert(schema.curriculumTopics)
      .values({ id: crypto.randomUUID(), ...input, title: input.title.trim() })
      .returning();
    return row;
  },
});
