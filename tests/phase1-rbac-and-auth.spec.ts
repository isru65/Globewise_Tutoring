import { describe, expect, it } from "vitest";
import {
  isRouteAllowedForRole,
  PORTAL_CONFIG_BY_ROLE,
} from "../app/design-system.js";
import {
  assertCanTutorStudent,
  isValidRole,
  normalizeEmail,
  requireRole,
  type AppUser,
  type Student,
} from "../server/lib/access.js";
import {
  apiError,
  apiPaginated,
  apiSuccess,
  parsePagination,
} from "../server/lib/api-response.js";

describe("Phase 1 RBAC, Portal Routes & API Contracts", () => {
  it("normalizes emails and validates all four portal roles", () => {
    expect(normalizeEmail("  Tutor@Example.COM ")).toBe("tutor@example.com");
    expect(isValidRole("student")).toBe(true);
    expect(isValidRole("tutor")).toBe(true);
    expect(isValidRole("parent")).toBe(true);
    expect(isValidRole("admin")).toBe(true);
    expect(isValidRole("superuser")).toBe(false);
  });

  it("enforces role permissions and blocks unassigned tutor access", () => {
    const parentUser: AppUser = {
      id: "u-parent",
      email: "parent@example.com",
      name: "Parent User",
      role: "parent",
      roles: ["parent"],
      activeRole: "parent",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const unassignedTutor: AppUser = {
      id: "u-tutor-2",
      email: "tutor2@example.com",
      name: "Other Tutor",
      role: "tutor",
      roles: ["tutor"],
      activeRole: "tutor",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    const student: Student = {
      id: "s-1",
      firstName: "Maya",
      lastName: "Lin",
      gradeLevel: 6,
      timezone: "America/New_York",
      parentEmail: "parent@example.com",
      tutorEmail: "tutor1@example.com",
      studentEmail: "maya@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
    };

    expect(() => requireRole(parentUser, ["admin"])).toThrow();
    expect(() => assertCanTutorStudent(unassignedTutor, student)).toThrow();
  });

  it("enforces portal route boundaries across all four roles", () => {
    expect(isRouteAllowedForRole("student", "/")).toBe(true);
    expect(isRouteAllowedForRole("student", "/admin")).toBe(false);
    expect(isRouteAllowedForRole("parent", "/billing")).toBe(true);
    expect(isRouteAllowedForRole("parent", "/ai")).toBe(false);
    expect(isRouteAllowedForRole("tutor", "/plans")).toBe(true);
    expect(isRouteAllowedForRole("tutor", "/billing")).toBe(false);
    expect(isRouteAllowedForRole("admin", "/audit")).toBe(true);
    expect(PORTAL_CONFIG_BY_ROLE.admin.homePath).toBe("/admin");
  });

  it("standardizes pagination and success/error envelopes", () => {
    const pager = parsePagination({ page: "2", page_size: "500" });
    expect(pager).toEqual({ page: 2, pageSize: 100, offset: 100 });

    const okRes = apiSuccess({ status: "ok" });
    expect(okRes.ok).toBe(true);

    const listRes = apiPaginated(["a", "b"], {
      page: 1,
      pageSize: 20,
      totalItems: 2,
    });
    expect(listRes.pagination.total_items).toBe(2);

    const errRes = apiError("FORBIDDEN", "Access denied");
    expect(errRes.ok).toBe(false);
    expect(errRes.error.code).toBe("FORBIDDEN");
  });
});