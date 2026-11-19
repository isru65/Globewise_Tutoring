import { defineAction } from "@agent-native/core/action";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser } from "../server/lib/access.js";

export default defineAction({
  description:
    "List subscriptions with their plan. Parents see their own; admins see all.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const user = await getCurrentUser();
    const query = getDb()
      .select({ subscription: schema.subscriptions, plan: schema.subscriptionPlans })
      .from(schema.subscriptions)
      .innerJoin(schema.subscriptionPlans, eq(schema.subscriptions.planId, schema.subscriptionPlans.id));
    const rows = await (
      user.role === "admin"
        ? query
        : query.where(eq(schema.subscriptions.parentEmail, user.email))
    ).orderBy(desc(schema.subscriptions.createdAt));
    return rows.map(({ subscription, plan }) => ({
      ...subscription,
      planName: plan.name,
      priceCents: plan.priceCents,
      billingInterval: plan.billingInterval,
    }));
  },
});
