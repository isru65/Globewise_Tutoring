import { fail } from "@agent-native/core/action";
import { getRequestUserEmail } from "@agent-native/core/server/request-context";
import { and, eq, inArray, or, type AnyColumn } from "drizzle-orm";

import { getDb, schema } from "../db.js";
import type { PortalRole } from "../../app/design-system.js";

export type AppRole = PortalRole;

export type AppUser = typeof schema.appUsers.$inferSelect & {
  roles: AppRole[];
  activeRole: AppRole;
};

export type Student = typeof schema.students.$inferSelect;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function isValidRole(role: unknown): role is AppRole {
  return (
    role === "student" ||
    role === "tutor" ||
    role === "parent" ||
    role === "admin"
  );
}

async function resolveUserRoles(userId: string, fallbackRole: string): Promise<AppRole[]> {
  const rows = await getDb()
    .select({ roleSlug: schema.userRoles.roleSlug })
    .from(schema.userRoles)
    .where(eq(schema.userRoles.userId, userId));

  const roles = rows
    .map((r) => r.roleSlug)
    .filter((r): r is AppRole => isValidRole(r));

  if (roles.length > 0) {
    return Array.from(new Set(roles));
  }
  return isValidRole(fallbackRole) ? [fallbackRole] : ["parent"];
}

export async function getCurrentUser(requestedPortalRole?: unknown): Promise<AppUser> {
  const rawEmail = getRequestUserEmail();
  if (!rawEmail) fail("Not authenticated", { statusCode: 401 });

  const normalizedEmail = normalizeEmail(rawEmail);
  const [user] = await getDb()
    .select()
    .from(schema.appUsers)
    .where(eq(schema.appUsers.email, normalizedEmail));

  if (!user) fail("No profile for this account yet", { statusCode: 403 });
  if (user.status !== "active") {
    fail("This account is waiting for approval or is inactive", { statusCode: 403 });
  }

  const assignedRoles = await resolveUserRoles(user.id, user.role);
  const primaryRole: AppRole = isValidRole(user.role)
    ? user.role
    : assignedRoles[0] ?? "parent";

  let activeRole: AppRole = primaryRole;
  if (requestedPortalRole !== undefined && requestedPortalRole !== null && requestedPortalRole !== "") {
    if (!isValidRole(requestedPortalRole)) {
      fail("Invalid portal role requested", { statusCode: 400 });
    }
    if (!assignedRoles.includes(requestedPortalRole)) {
      fail(`Your account does not have access to the ${requestedPortalRole} portal`, {
        statusCode: 403,
      });
    }
    activeRole = requestedPortalRole;
  }

  return {
    ...user,
    email: normalizeEmail(user.email),
    roles: assignedRoles,
    activeRole,
  };
}

export function requireRole(user: AppUser, allowedRoles: AppRole[]) {
  const hasAccess =
    allowedRoles.includes(user.activeRole) ||
    user.roles.some((r) => allowedRoles.includes(r));

  if (!hasAccess) {
    fail("Your role cannot perform this action", { statusCode: 403 });
  }
}

export async function loadStudent(studentId: string): Promise<Student> {
  const [student] = await getDb()
    .select()
    .from(schema.students)
    .where(eq(schema.students.id, studentId));
  if (!student) fail("Student not found", { statusCode: 404 });
  return student;
}

export async function isParentLinkedToStudent(
  parentUserId: string,
  parentEmail: string,
  studentId: string,
): Promise<boolean> {
  const normalized = normalizeEmail(parentEmail);
  const [rel] = await getDb()
    .select({ id: schema.parentStudentRelationships.id })
    .from(schema.parentStudentRelationships)
    .where(
      and(
        eq(schema.parentStudentRelationships.studentId, studentId),
        eq(schema.parentStudentRelationships.verified, true),
        or(
          eq(schema.parentStudentRelationships.parentUserId, parentUserId),
          eq(schema.parentStudentRelationships.parentEmail, normalized),
        ),
      ),
    );
  return Boolean(rel);
}

export async function assertCanViewStudent(user: AppUser, student: Student) {
  const email = normalizeEmail(user.email);
  if (user.activeRole === "admin") return;

  if (user.activeRole === "parent") {
    if (normalizeEmail(student.parentEmail) === email) return;
    const linked = await isParentLinkedToStudent(user.id, email, student.id);
    if (linked) return;
  }

  if (user.activeRole === "tutor" && normalizeEmail(student.tutorEmail) === email) {
    return;
  }

  if (
    user.activeRole === "student" &&
    normalizeEmail(student.studentEmail) === email
  ) {
    return;
  }

  fail("You do not have access to this student", { statusCode: 403 });
}

export function assertCanTutorStudent(user: AppUser, student: Student) {
  const email = normalizeEmail(user.email);
  const allowed =
    user.activeRole === "admin" ||
    (user.activeRole === "tutor" && normalizeEmail(student.tutorEmail) === email);

  if (!allowed) fail("This student is not assigned to you", { statusCode: 403 });
}

export async function assertIsParentOfStudent(user: AppUser, student: Student) {
  const email = normalizeEmail(user.email);
  if (user.activeRole === "admin") return;

  if (user.activeRole === "parent") {
    if (normalizeEmail(student.parentEmail) === email) return;
    const linked = await isParentLinkedToStudent(user.id, email, student.id);
    if (linked) return;
  }

  fail("This student is not linked to your account", { statusCode: 403 });
}

export function studentScope(user: AppUser) {
  const email = normalizeEmail(user.email);
  if (user.activeRole === "admin") return undefined;

  if (user.activeRole === "parent") {
    const linkedStudentIds = getDb()
      .select({ studentId: schema.parentStudentRelationships.studentId })
      .from(schema.parentStudentRelationships)
      .where(
        and(
          eq(schema.parentStudentRelationships.verified, true),
          or(
            eq(schema.parentStudentRelationships.parentUserId, user.id),
            eq(schema.parentStudentRelationships.parentEmail, email),
          ),
        ),
      );

    return or(
      eq(schema.students.parentEmail, email),
      inArray(schema.students.id, linkedStudentIds),
    );
  }

  if (user.activeRole === "tutor") {
    return eq(schema.students.tutorEmail, email);
  }

  if (user.activeRole === "student") {
    return eq(schema.students.studentEmail, email);
  }

  return and(
    eq(schema.students.parentEmail, email),
    eq(schema.students.tutorEmail, email),
    eq(schema.students.studentEmail, email),
    or(),
  );
}

export function scopeByStudent(user: AppUser, studentIdColumn: AnyColumn) {
  if (user.activeRole === "admin") return undefined;
  return inArray(
    studentIdColumn,
    getDb()
      .select({ id: schema.students.id })
      .from(schema.students)
      .where(studentScope(user)),
  );
}