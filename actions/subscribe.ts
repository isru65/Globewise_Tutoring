import { defineAction, fail } from "@agent-native/core/action";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { expectRow, getDb, schema } from "../server/db.js";
import { getCurrentUser, requireRole } from "../server/lib/access.js";
import { recordAudit } from "../server/lib/platform.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export default defineAction({
  description:
    "Start a subscription plan for the caller's family. Trial days apply first. Payment is not collected yet: the Stripe checkout and webhook are not connected.",
  schema: z.object({ planId: z.string() }),
  run: async ({ planId }) => {
    const user = await getCurrentUser();
    requireRole(user, ["parent", "admin"]);
    const db = getDb();
    const [plan] = await db
      .select()
      .from(schema.subscriptionPlans)
      .where(and(eq(schema.subscriptionPlans.id, planId), eq(schema.subscriptionPlans.active, true)));
    if (!plan) fail("Plan not found", { statusCode: 404 });

    const [existing] = await db
      .select({ id: schema.subscriptions.id })
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.parentEmail, user.email),
          inArray(schema.subscriptions.status, ["trialing", "active"]),
        ),
      );
    if (existing) fail("You already have an active subscription", { statusCode: 409 });

    const periodDays = plan.trialDays > 0 ? plan.trialDays : plan.billingInterval === "year" ? 365 : 30;
    const [row = expectRow()] = await db
      .insert(schema.subscriptions)
      .values({
        id: crypto.randomUUID(),
        parentEmail: user.email,
        planId: plan.id,
        status: plan.trialDays > 0 ? "trialing" : "active",
        currentPeriodEnd: new Date(Date.now() + periodDays * DAY_MS).toISOString(),
      })
      .returning();
    await recordAudit(user.email, "subscription.start", "subscription", row.id, null, row);
    return row;
  },
});
