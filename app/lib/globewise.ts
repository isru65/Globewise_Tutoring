import {
  IconAward,
  IconBell,
  IconBooks,
  IconCalendarEvent,
  IconCalendarWeek,
  IconClipboardCheck,
  IconCreditCard,
  IconFileText,
  IconFolderOpen,
  IconHistory,
  IconLayoutDashboard,
  IconListCheck,
  IconRoute,
  IconSettings,
  IconShieldLock,
  IconSparkles,
  IconUpload,
  IconUser,
  IconUserCheck,
  IconUsers,
  IconChartBar,
} from "@tabler/icons-react";

export type AppRole = "student" | "parent" | "tutor" | "admin";

export type NavItem = {
  label: string;
  to: string;
  icon: typeof IconLayoutDashboard;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  student: "Student",
  parent: "Parent",
  tutor: "Tutor",
  admin: "Administrator",
};

const DASHBOARD: NavItem = { label: "Dashboard", to: "/", icon: IconLayoutDashboard };

export const NAV: Record<AppRole, NavItem[]> = {
  student: [
    DASHBOARD,
    { label: "My Learning", to: "/plans", icon: IconListCheck },
    { label: "Academic Roadmap", to: "/curriculum", icon: IconRoute },
    { label: "My Schedule", to: "/sessions", icon: IconCalendarEvent },
    { label: "Learning Resources", to: "/resources", icon: IconBooks },
    { label: "Assessments", to: "/assessments", icon: IconClipboardCheck },
    { label: "Achievements", to: "/achievements", icon: IconAward },
    { label: "Profile", to: "/coming-soon?item=Profile", icon: IconUser },
  ],
  parent: [
    { label: "Dashboard / Children", to: "/students", icon: IconLayoutDashboard },
    { label: "School Syllabus Upload", to: "/syllabus", icon: IconUpload },
    { label: "Weekly Plans", to: "/plans", icon: IconListCheck },
    { label: "Progress Reports", to: "/progress", icon: IconChartBar },
    { label: "Tutoring Schedule", to: "/sessions", icon: IconCalendarEvent },
    { label: "Billing & Subscription", to: "/billing", icon: IconCreditCard },
    { label: "Notifications", to: "/notifications", icon: IconBell },
  ],
  tutor: [
    { label: "Dashboard / Students", to: "/students", icon: IconLayoutDashboard },
    { label: "Academic Curriculum", to: "/curriculum", icon: IconRoute },
    { label: "Custom Syllabus", to: "/syllabus", icon: IconFileText },
    { label: "Weekly Plans", to: "/plans", icon: IconListCheck },
    { label: "Sessions & Schedule", to: "/sessions", icon: IconCalendarEvent },
    { label: "Weekly Planner", to: "/planner", icon: IconCalendarWeek },
    { label: "AI Generator", to: "/ai", icon: IconSparkles },
    { label: "Assessments & Hours", to: "/assessments", icon: IconClipboardCheck },
  ],
  admin: [
    DASHBOARD,
    { label: "User & Tutor Approvals", to: "/admin", icon: IconUserCheck },
    { label: "Curriculum Administration", to: "/curriculum", icon: IconRoute },
    { label: "Syllabus & Session Oversight", to: "/syllabus", icon: IconFolderOpen },
    { label: "Weekly Planner", to: "/planner", icon: IconCalendarWeek },
    { label: "AI Settings & Usage", to: "/coming-soon?item=AI%20Settings%20%26%20Usage", icon: IconSettings },
    { label: "Subscriptions & Payments", to: "/billing", icon: IconCreditCard },
    { label: "Reports & Audit Logs", to: "/audit", icon: IconHistory },
    { label: "Students", to: "/students", icon: IconUsers },
    { label: "Security & Privacy", to: "/coming-soon?item=Security%20%26%20Privacy", icon: IconShieldLock },
  ],
};

export function gradeLabel(grade: number) {
  return grade === 0 ? "Kindergarten" : `Grade ${grade}`;
}

export function label(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: dateOnly ? "UTC" : undefined,
  });
}

export function formatDateTime(value: string | null | undefined, timeZone?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    });
  } catch {
    return new Date(value).toLocaleString();
  }
}

export function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Try again.";
}

const TONES: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300",
  pending: "bg-amber-500/10 text-amber-800 ring-amber-600/20 dark:text-amber-300",
  danger: "bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-300",
  info: "bg-primary/10 text-primary ring-primary/20",
  neutral: "bg-muted text-muted-foreground ring-border",
};

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  approved: "success",
  published: "success",
  completed: "success",
  graded: "success",
  present: "success",
  active: "success",
  confirmed: "info",
  in_progress: "info",
  scheduled: "info",
  trialing: "info",
  pending_review: "pending",
  pending_grading: "pending",
  pending: "pending",
  extracting: "pending",
  uploaded: "pending",
  draft: "neutral",
  archived: "neutral",
  reset: "neutral",
  rescheduled: "pending",
  late: "pending",
  rejected: "danger",
  cancelled: "danger",
  no_show: "danger",
  absent: "danger",
  suspended: "danger",
};

export function statusClass(status: string) {
  return TONES[STATUS_TONE[status] ?? "neutral"];
}

export const GRADE_OPTIONS = Array.from({ length: 9 }, (_, grade) => grade);
export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
];
