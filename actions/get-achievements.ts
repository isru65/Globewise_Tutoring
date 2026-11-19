import { defineAction } from "@agent-native/core/action";
import { asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import {
  assertCanViewStudent,
  getCurrentUser,
  loadStudent,
} from "../server/lib/access.js";

const POINTS_PER_LEVEL = 100;

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function streakDays(isoDates: string[]) {
  const days = new Set(isoDates.map(dayKey));
  const cursor = new Date();
  if (!days.has(dayKey(cursor.toISOString()))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export default defineAction({
  description:
    "Return a student's points, level, badges, learning streak, and recent points activity.",
  schema: z.object({ studentId: z.string() }),
  http: { method: "GET" },
  run: async ({ studentId }) => {
    const user = await getCurrentUser();
    assertCanViewStudent(user, await loadStudent(studentId));
    const db = getDb();
    const ledger = await db
      .select()
      .from(schema.pointsLedger)
      .where(eq(schema.pointsLedger.studentId, studentId))
      .orderBy(desc(schema.pointsLedger.createdAt));
    const badges = await db.select().from(schema.badges).orderBy(asc(schema.badges.pointsRequired));

    const totalPoints = ledger.reduce((sum, row) => sum + row.pointsDelta, 0);
    return {
      totalPoints,
      level: Math.floor(totalPoints / POINTS_PER_LEVEL) + 1,
      pointsToNextLevel: POINTS_PER_LEVEL - (totalPoints % POINTS_PER_LEVEL),
      streakDays: streakDays(ledger.map((row) => row.createdAt)),
      badges: badges.map((badge) => ({ ...badge, earned: totalPoints >= badge.pointsRequired })),
      recentActivity: ledger.slice(0, 15),
    };
  },
});
