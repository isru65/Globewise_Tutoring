import { defineAction } from "@agent-native/core/action";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb, schema } from "../server/db.js";
import { getCurrentUser } from "../server/lib/access.js";

export default defineAction({
  description: "List subscription plans. Admins also see inactive plans.",
  schema: z.object({}),
  http: { method: "GET" },
  run: async () => {
    const user = await getCurrentUser();
    const query = getDb().select().from(schema.subscriptionPlans);
    return (
      user.role === "admin" ? query : query.where(eq(schema.subscriptionPlans.active, true))
    ).orderBy(asc(schema.subscriptionPlans.priceCents));
  },
});
