export type PortalRole = "student" | "tutor" | "parent" | "admin";

export const DEEP_BLUE_THEME = {
  brand: {
    name: "Globewise Tutoring",
    tagline: "Structured K–8 Learning, Coding & Guided Tutoring",
  },
  colors: {
    // Deep Blue / Navy primary palette
    navy950: "#071126",
    navy900: "#0F172A",
    navy800: "#1E3A8A",
    royal700: "#1D4ED8",
    cobalt600: "#2563EB",
    sky500: "#0EA5E9",
    ice100: "#EFF6FF",
    ice50: "#F8FAFC",

    // Neutrals & borders
    surface: "#FFFFFF",
    surfaceMuted: "#F1F5F9",
    border: "#E2E8F0",
    borderStrong: "#CBD5E1",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    textMuted: "#64748B",

    // Semantic status tokens
    successBg: "#DCFCE7",
    successText: "#166534",
    warningBg: "#FEF3C7",
    warningText: "#92400E",
    dangerBg: "#FEE2E2",
    dangerText: "#991B1B",
    infoBg: "#E0F2FE",
    infoText: "#075985",
  },
  radii: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    pill: "9999px",
  },
  shadows: {
    card: "0 1px 2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.08)",
    modal: "0 20px 25px -5px rgba(15, 23, 42, 0.14), 0 8px 10px -6px rgba(15, 23, 42, 0.1)",
  },
} as const;

export interface NavItemConfig {
  label: string;
  to: string;
  badgeKey?: "notifications" | "assessments";
}

export interface PortalAuthConfig {
  role: PortalRole;
  label: string;
  portalTitle: string;
  description: string;
  loginPath: string;
  homePath: string;
  badgeAccent: string;
}

export const PORTAL_CONFIG_BY_ROLE: Record<PortalRole, PortalAuthConfig> = {
  student: {
    role: "student",
    label: "Student",
    portalTitle: "Student Learning Portal",
    description: "Access weekly lessons, roadmaps, practice, assessments, and achievements.",
    loginPath: "/login/student",
    homePath: "/",
    badgeAccent: "#0EA5E9",
  },
  tutor: {
    role: "tutor",
    label: "Tutor",
    portalTitle: "Tutor Workspace",
    description: "Review syllabi, map curriculum topics, build weekly plans, and host sessions.",
    loginPath: "/login/tutor",
    homePath: "/students",
    badgeAccent: "#2563EB",
  },
  parent: {
    role: "parent",
    label: "Parent",
    portalTitle: "Parent Family Portal",
    description: "Manage children, upload school syllabi, track progress, and manage billing.",
    loginPath: "/login/parent",
    homePath: "/students",
    badgeAccent: "#1D4ED8",
  },
  admin: {
    role: "admin",
    label: "Administrator",
    portalTitle: "Administrator Console",
    description: "Approve tutors, oversee curriculum and AI settings, billing, and audit logs.",
    loginPath: "/login/admin",
    homePath: "/admin",
    badgeAccent: "#1E3A8A",
  },
};

export const PORTAL_ROLES: PortalRole[] = ["student", "tutor", "parent", "admin"];

export function isPortalRole(value: unknown): value is PortalRole {
  return (
    value === "student" ||
    value === "tutor" ||
    value === "parent" ||
    value === "admin"
  );
}

// Aligned with SRS v3.0 Section 6.3 role navigation & existing app/routes/*.tsx
export const PORTAL_NAV_BY_ROLE: Record<PortalRole, NavItemConfig[]> = {
  student: [
    { label: "Dashboard", to: "/" },
    { label: "My Learning", to: "/curriculum" },
    { label: "Academic Roadmap", to: "/progress" },
    { label: "My Schedule", to: "/sessions" },
    { label: "Learning Resources", to: "/resources" },
    { label: "Assessments", to: "/assessments", badgeKey: "assessments" },
    { label: "Achievements", to: "/achievements" },
  ],
  tutor: [
    { label: "Dashboard / Students", to: "/students" },
    { label: "Academic Curriculum", to: "/curriculum" },
    { label: "Custom Syllabus", to: "/syllabus" },
    { label: "Weekly Plans", to: "/plans" },
    { label: "Sessions & Schedule", to: "/sessions" },
    { label: "AI Generator", to: "/ai" },
    { label: "Assessments & Hours", to: "/assessments" },
  ],
  parent: [
    { label: "Dashboard / Children", to: "/students" },
    { label: "School Syllabus Upload", to: "/syllabus" },
    { label: "Weekly Plans", to: "/planner" },
    { label: "Progress Reports", to: "/progress" },
    { label: "Tutoring Schedule", to: "/sessions" },
    { label: "Billing & Subscription", to: "/billing" },
    { label: "Notifications", to: "/notifications", badgeKey: "notifications" },
  ],
  admin: [
    { label: "User & Tutor Approvals", to: "/admin" },
    { label: "Curriculum Administration", to: "/curriculum" },
    { label: "Syllabus & Session Oversight", to: "/sessions" },
    { label: "AI Settings & Usage", to: "/ai" },
    { label: "Subscriptions & Payments", to: "/billing" },
    { label: "Reports & Audit Logs", to: "/audit" },
  ],
};

// Shared routes accessible to all authenticated roles once logged in
const SHARED_AUTHENTICATED_PATHS = ["/notifications"];

export function isRouteAllowedForRole(role: PortalRole, pathname: string): boolean {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
  if (SHARED_AUTHENTICATED_PATHS.includes(normalized)) {
    return true;
  }
  return PORTAL_NAV_BY_ROLE[role].some(
    (item) =>
      normalized === item.to ||
      (item.to !== "/" && normalized.startsWith(`${item.to}/`)),
  );
}

export const designSystem = {
  brand: DEEP_BLUE_THEME.brand,
  colors: {
    ...DEEP_BLUE_THEME.colors,
    primary: DEEP_BLUE_THEME.colors.royal700,
    secondary: DEEP_BLUE_THEME.colors.navy800,
    background: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceDark: DEEP_BLUE_THEME.colors.navy900,
    text: "#0F172A",
    textMuted: "#475569",
    border: "#E2E8F0",
  },
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    full: "9999px",
  },
};