import { count, eq } from "drizzle-orm";
import { defineEventHandler, getQuery, setResponseStatus } from "h3";

import { getDb, schema } from "../../db.js";
import { getCurrentUser, studentScope } from "../../lib/access.js";
import { apiError, apiPaginated, apiSuccess, parsePagination } from "../../lib/api-response.js";

function extractStatusCode(err: unknown): number {
  if (typeof err === "object" && err !== null) {
    const candidate = err as { statusCode?: unknown; status?: unknown };
    if (typeof candidate.statusCode === "number") return candidate.statusCode;
    if (typeof candidate.status === "number") return candidate.status;
  }
  return 500;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return "Internal server error";
}

export default defineEventHandler(async (event) => {
  try {
    const user = await getCurrentUser();
    const query = getQuery(event) as Record<string, unknown>;
    const { page, pageSize, offset } = parsePagination(query);

    const scope = studentScope(user);

    const [totalRow] = await getDb()
      .select({ total: count() })
      .from(schema.students)
      .where(scope);

    const studentsList = await getDb()
      .select()
      .from(schema.students)
      .where(scope)
      .limit(pageSize)
      .offset(offset);

    // Optional single-student check (?studentId=...) to test record-level access
    const requestedStudentId =
      typeof query.studentId === "string" && query.studentId.trim().length > 0
        ? query.studentId.trim()
        : undefined;

    let selectedStudent = null;
    if (requestedStudentId) {
      const [found] = await getDb()
        .select()
        .from(schema.students)
        .where(eq(schema.students.id, requestedStudentId));

      if (!found) {
        setResponseStatus(event, 404);
        return apiError("NOT_FOUND", "Student not found");
      }

      const allowed =
        user.role === "admin" ||
        (user.role === "parent" && found.parentEmail === user.email) ||
        (user.role === "tutor" && found.tutorEmail === user.email) ||
        (user.role === "student" && found.studentEmail === user.email);

      if (!allowed) {
        setResponseStatus(event, 403);
        return apiError("FORBIDDEN", "You do not have access to this student");
      }

      selectedStudent = found;
    }

    setResponseStatus(event, 200);
    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      accessibleStudents: apiPaginated(studentsList, {
        page,
        pageSize,
        totalItems: Number(totalRow?.total ?? 0),
      }),
      ...(requestedStudentId ? { selectedStudent } : {}),
    });
  } catch (err) {
    const statusCode = extractStatusCode(err);
    const code =
      statusCode === 401
        ? "UNAUTHORIZED"
        : statusCode === 403
          ? "FORBIDDEN"
          : statusCode === 404
            ? "NOT_FOUND"
            : statusCode >= 400 && statusCode < 500
              ? "BAD_REQUEST"
              : "INTERNAL_ERROR";

    setResponseStatus(event, statusCode);
    return apiError(code, extractMessage(err));
  }
});

