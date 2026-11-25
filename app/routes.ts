import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Public & 4-Portal Auth Routes
  route("login", "routes/login.tsx"),
  route("login/:role", "routes/login.$role.tsx"),
  route("register/parent", "routes/register.parent.tsx"),

  // Authenticated Portal Routes (Student, Tutor, Parent, Administrator)
  index("routes/_index.tsx"),
  route("students", "routes/students.tsx"),
  route("curriculum", "routes/curriculum.tsx"),
  route("syllabus", "routes/syllabus.tsx"),
  route("planner", "routes/planner.tsx"),
  route("plans", "routes/plans.tsx"),
  route("sessions", "routes/sessions.tsx"),
  route("resources", "routes/resources.tsx"),
  route("ai", "routes/ai.tsx"),
  route("assessments", "routes/assessments.tsx"),
  route("progress", "routes/progress.tsx"),
  route("achievements", "routes/achievements.tsx"),
  route("billing", "routes/billing.tsx"),
  route("notifications", "routes/notifications.tsx"),
  route("admin", "routes/admin.tsx"),
  route("audit", "routes/audit.tsx"),
  route("*", "routes/coming-soon.tsx"),
] satisfies RouteConfig;