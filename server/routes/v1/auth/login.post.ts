import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { eq } from "drizzle-orm";

import { getDb, schema } from "../../../db.js";
import {
  isValidRole,
  normalizeEmail,
  type AppRole,
} from "../../../lib/access.js";
import { apiError, apiSuccess } from "../../../lib/api-response.js";
import { checkRateLimit } from "../../../middleware/rate-limit.js";
import { PORTAL_CONFIG_BY_ROLE } from "../../../../app/design-system.js";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) as {
    email?: string;
    portalRole?: string;
    role?: string;
  };

  const email = normalizeEmail(body.email);
  const requestedRole = body.portalRole ?? body.role;

  const rate = checkRateLimit(email || "anonymous", {
    keyPrefix: "v1-auth-login",
    limit: 20,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    setResponseStatus(event, 429);
    return apiError(
      "RATE_LIMITED",
      "Too many sign-in attempts. Please wait a moment and try again.",
      { retry_after_seconds: rate.retryAfterSeconds },
    );
  }

  if (!email) {
    setResponseStatus(event, 400);
    return apiError("VALIDATION_ERROR", "Email is required to sign in.");
  }

  if (
    requestedRole !== undefined &&
    requestedRole !== "" &&
    !isValidRole(requestedRole)
  ) {
    setResponseStatus(event, 400);
    return apiError(
      "INVALID_ROLE",
      "Portal role must be one of: student, tutor, parent, admin.",
    );
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(schema.appUsers)
    .where(eq(schema.appUsers.email, email));

  if (!user) {
    setResponseStatus(event, 403);
    return apiError(
      "ACCOUNT_NOT_FOUND",
      "No user account was found for this email address.",
    );
  }

  if (user.status !== "active") {
    setResponseStatus(event, 403);
    return apiError(
      "ACCOUNT_PENDING_APPROVAL",
      `Account status is currently "${user.status}". Contact an administrator for approval.`,
    );
  }

  const roleRows = await db
    .select({ roleSlug: schema.userRoles.roleSlug })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, user.id));

  const assignedRoles: AppRole[] = Array.from(
    new Set([
      ...(isValidRole(user.role) ? [user.role] : []),
      ...roleRows
        .map((r) => r.roleSlug)
        .filter((r): r is AppRole => isValidRole(r)),
    ]),
  );

  const targetRole: AppRole = requestedRole
    ? (requestedRole as AppRole)
    : assignedRoles[0] ?? "parent";

  if (!assignedRoles.includes(targetRole)) {
    setResponseStatus(event, 403);
    return apiError(
      "ROLE_NOT_AUTHORIZED",
      `Your account is not authorized for the ${PORTAL_CONFIG_BY_ROLE[targetRole].label} portal.`,
      { assigned_roles: assignedRoles, requested_role: targetRole },
    );
  }

  await db.insert(schema.auditLogs).values({
    id: crypto.randomUUID(),
    actorEmail: user.email,
    action: "auth.login",
    targetType: "app_user",
    targetId: user.id,
    before: null,
    after: { email: user.email, portalRole: targetRole, assignedRoles },
  });

  setResponseStatus(event, 200);
  return apiSuccess({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: targetRole,
      roles: assignedRoles,
      status: user.status,
    },
    redirectTo: PORTAL_CONFIG_BY_ROLE[targetRole].homePath,
  });
});