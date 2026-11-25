import { defineEventHandler, setResponseStatus } from "h3";
import { sql } from "drizzle-orm";

import { getDb } from "../../db.js";
import { apiError, apiSuccess } from "../../lib/api-response.js";

export default defineEventHandler(async (event) => {
  try {
    const db = getDb();
    await db.execute(sql`SELECT 1`);

    setResponseStatus(event, 200);
    return apiSuccess({
      service: "globewise-tutoring",
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    setResponseStatus(event, 503);
    return apiError(
      "SERVICE_UNAVAILABLE",
      err instanceof Error ? err.message : "Database health check failed",
    );
  }
});