import { fail } from "@agent-native/core/action";
import { getRequestUserEmail } from "@agent-native/core/server/request-context";
import { eq, inArray, or } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

import { getDb, schema } from "../db.js";

export type AppRole = "student" | "parent" | "tutor" | "admin";

export type AppUser = typeof schema.appUsers.$inferSelect;
export type Student = typeof schema.students.$inferSelect;

export async function getCurrentUser(): Promise<AppUser> {
  const email = getRequestUserEmail();
  if (!email) fail("Not authenticated", { statusCode: 401 });
  const [user] = await getDb()
    .select()
    .from(schema.appUsers)
    .where(eq(schema.appUsers.email, email));
  if (!user) fail("No profile for this account yet", { statusCode: 403 });
  if (user.status !== "active") {
    fail("This account is waiting for approval", { statusCode: 403 });
  }
  return user;
}

export function requireRole(user: AppUser, roles: AppRole[]) {
  if (!roles.includes(user.role as AppRole)) {
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

export function assertCanViewStudent(user: AppUser, student: Student) {
  const allowed =
    user.role === "admin" ||
    student.parentEmail === user.email ||
    student.tutorEmail === user.email ||
    student.studentEmail === user.email;
  if (!allowed) fail("You do not have access to this student", { statusCode: 403 });
}

export function assertCanTutorStudent(user: AppUser, student: Student) {
  const allowed =
    user.role === "admin" ||
    (user.role === "tutor" && student.tutorEmail === user.email);
  if (!allowed) fail("This student is not assigned to you", { statusCode: 403 });
}

export function assertIsParentOfStudent(user: AppUser, student: Student) {
  const allowed = user.role === "admin" || student.parentEmail === user.email;
  if (!allowed) fail("This student is not linked to your account", { statusCode: 403 });
}

export function studentScope(user: AppUser) {
  if (user.role === "admin") return undefined;
  return or(
    eq(schema.students.parentEmail, user.email),
    eq(schema.students.tutorEmail, user.email),
    eq(schema.students.studentEmail, user.email),
  );
}

export function scopeByStudent(user: AppUser, studentIdColumn: AnyColumn) {
  if (user.role === "admin") return undefined;
  return inArray(
    studentIdColumn,
    getDb()
      .select({ id: schema.students.id })
      .from(schema.students)
      .where(studentScope(user)),
  );
}
