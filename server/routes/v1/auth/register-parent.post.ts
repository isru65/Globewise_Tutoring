import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { eq } from "drizzle-orm";

import { getDb, schema } from "../../../db.js";
import { normalizeEmail } from "../../../lib/access.js";
import { apiError, apiSuccess } from "../../../lib/api-response.js";
import { checkRateLimit } from "../../../middleware/rate-limit.js";
import { PORTAL_CONFIG_BY_ROLE } from "../../../../app/design-system.js";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) as {
    name?: string;
    email?: string;
    phone?: string;
    timezone?: string;
    consentAccepted?: boolean;
  };

  const name = (body.name ?? "").trim();
  const email = normalizeEmail(body.email);
  const phone = (body.phone ?? "").trim();
  const timezone = (body.timezone ?? "America/New_York").trim() || "America/New_York";
  const consentAccepted = Boolean(body.consentAccepted);

  const rate = checkRateLimit(email || "anonymous", {
    keyPrefix: "v1-auth-register-parent",
    limit: 10,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    setResponseStatus(event, 429);
    return apiError(
      "RATE_LIMITED",
      "Too many registration requests. Please try again shortly.",
      { retry_after_seconds: rate.retryAfterSeconds },
    );
  }

  if (!name || !email) {
    setResponseStatus(event, 400);
    return apiError("VALIDATION_ERROR", "Full name and email address are required.");
  }

  if (!consentAccepted) {
    setResponseStatus(event, 422);
    return apiError(
      "CONSENT_REQUIRED",
      "Parental privacy and COPPA/FERPA consent must be accepted to create a parent account.",
    );
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(schema.appUsers)
    .where(eq(schema.appUsers.email, email));

  if (existing) {
    setResponseStatus(event, 409);
    return apiError(
      "ACCOUNT_EXISTS",
      "An account with this email already exists. Please sign in to your portal.",
    );
  }

  const userId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db.insert(schema.appUsers).values({
    id: userId,
    email,
    name,
    role: "parent",
    status: "active",
  });

  await db
    .insert(schema.userRoles)
    .values({
      id: crypto.randomUUID(),
      userId,
      roleSlug: "parent",
      isPrimary: true,
      assignedByEmail: email,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.parentProfiles)
    .values({
      id: crypto.randomUUID(),
      userId,
      phone,
      timezone,
      consentAcceptedAt: nowIso,
      updatedAt: nowIso,
    })
    .onConflictDoNothing();

  await db.insert(schema.auditLogs).values({
    id: crypto.randomUUID(),
    actorEmail: email,
    action: "auth.register_parent",
    targetType: "app_user",
    targetId: userId,
    before: null,
    after: { email, name, role: "parent", timezone, consentAccepted: true },
  });

  setResponseStatus(event, 201);
  return apiSuccess({
    user: {
      id: userId,
      email,
      name,
      role: "parent",
      roles: ["parent"],
      status: "active",
    },
    redirectTo: PORTAL_CONFIG_BY_ROLE.parent.homePath,
  });
});