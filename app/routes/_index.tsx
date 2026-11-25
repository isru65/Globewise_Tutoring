import React from "react";
import { Link } from "react-router";
import Layout from "../components/layout/Layout.js";
import { DEEP_BLUE_THEME, type PortalRole } from "../design-system.js";
import useCurrentUser from "../hooks/use-current-user.js";

interface QuickAction {
  title: string;
  description: string;
  to: string;
}

const ROLE_ACTIONS: Record<PortalRole, { heading: string; summary: string; actions: QuickAction[] }> = {
  student: {
    heading: "Student Learning Hub",
    summary: "Continue your weekly learning plan, lessons, coding practice, assessments, and streaks.",
    actions: [
      { title: "My Learning & Curriculum", description: "Browse subjects, lessons, and coding tracks.", to: "/curriculum" },
      { title: "Academic Roadmap & Progress", description: "Track completed, active, and prerequisite-locked topics.", to: "/progress" },
      { title: "Assessments & Achievements", description: "Take quizzes, earn points, and unlock badges.", to: "/assessments" },
    ],
  },
  tutor: {
    heading: "Tutor Teaching & Review Workspace",
    summary: "Review parent syllabi, map school topics, generate/approve AI materials, and run sessions.",
    actions: [
      { title: "Assigned Students", description: "Inspect student learning plans and readiness.", to: "/students" },
      { title: "Syllabus & Weekly Plans", description: "Review extracted syllabus items and publish weekly plans.", to: "/syllabus" },
      { title: "AI Generator & Sessions", description: "Draft lessons with tutor approval and manage 1-on-1 sessions.", to: "/ai" },
    ],
  },
  parent: {
    heading: "Parent & Guardian Command Center",
    summary: "Manage linked children, upload weekly school syllabi, track progress, and manage billing.",
    actions: [
      { title: "Children & Profiles", description: "View linked K–8 learners and profile details.", to: "/students" },
      { title: "School Syllabus Upload", description: "Upload weekly PDF, DOCX, or image syllabi for extraction.", to: "/syllabus" },
      { title: "Progress Reports & Billing", description: "Monitor completion, attendance, reports, and subscriptions.", to: "/progress" },
    ],
  },
  admin: {
    heading: "Platform Operations & Governance",
    summary: "Manage user/tutor approvals, curriculum administration, subscriptions, and audit logs.",
    actions: [
      { title: "User & Tutor Approvals", description: "Review accounts, roles, and tutor onboarding status.", to: "/admin" },
      { title: "Curriculum Administration", description: "Maintain grades, subjects, units, and topics.", to: "/curriculum" },
      { title: "Subscriptions & Audit Logs", description: "Oversee plans, payments, and security audit trail.", to: "/audit" },
    ],
  },
};

function resolveRole(role?: string): PortalRole {
  if (role === "tutor" || role === "parent" || role === "admin" || role === "student") {
    return role;
  }
  return "student";
}

export default function IndexRoute() {
  const { user, loading, refresh } = useCurrentUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] text-white">
        <div className="text-sm font-medium tracking-wide text-blue-200">
          Loading Globewise Tutoring workspace...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col">
        {/* Deep Blue / Navy Public Header */}
        <header
          className="border-b border-white/10 text-white"
          style={{ backgroundColor: DEEP_BLUE_THEME.colors.navy900 }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
              >
                GW
              </span>
              <span className="font-semibold tracking-tight">
                {DEEP_BLUE_THEME.brand.name}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <a
                href="#programs"
                className="hidden sm:inline-block px-3 py-1.5 text-sm text-slate-300 hover:text-white"
              >
                Programs
              </a>
              <a
                href="#pricing"
                className="hidden sm:inline-block px-3 py-1.5 text-sm text-slate-300 hover:text-white"
              >
                Pricing
              </a>
              <Link
                to="/students"
                className="rounded-lg border border-white/20 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/billing"
                className="rounded-lg px-3.5 py-1.5 text-sm font-semibold text-white transition-colors"
                style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
              >
                Parent Registration
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section
          className="text-white py-14 sm:py-20 px-4 sm:px-6"
          style={{
            background: `linear-gradient(135deg, ${DEEP_BLUE_THEME.colors.navy950} 0%, ${DEEP_BLUE_THEME.colors.navy800} 100%)`,
          }}
        >
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-300 mb-3">
              Grades K–8 • Academic & Coding Pathways
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-3xl">
              Structured tutoring aligned with your child&apos;s weekly school syllabus.
            </h1>
            <p className="mt-4 text-base sm:text-lg text-blue-100/90 max-w-2xl">
              {DEEP_BLUE_THEME.brand.tagline}—combining tutor-reviewed AI learning materials,
              interactive assessments, 1-on-1 sessions, and transparent parent progress tracking.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/students"
                className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#0F172A] hover:bg-blue-50 transition-colors"
              >
                Sign In to Portal
              </Link>
              <Link
                to="/billing"
                className="rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
              >
                Start Parent Registration
              </Link>
            </div>
          </div>
        </section>

        {/* Programs & Four Portals */}
        <section id="programs" className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12">
          <h2 className="text-xl font-semibold text-[#0F172A]">
            Four Connected Role Portals
          </h2>
          <p className="mt-1 text-sm text-[#475569]">
            Role-protected workspaces for Students, Tutors, Parents, and Administrators.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                role: "Student",
                desc: "Follow weekly plans, complete lessons & coding activities, take quizzes, and earn badges.",
              },
              {
                role: "Tutor",
                desc: "Review syllabi, map curriculum topics, approve AI-drafted content, and schedule 1-on-1 sessions.",
              },
              {
                role: "Parent",
                desc: "Link students, upload weekly school syllabi, view progress reports, and manage subscriptions.",
              },
              {
                role: "Administrator",
                desc: "Approve tutors, manage curriculum & AI settings, inspect billing, and audit system activity.",
              },
            ].map((card) => (
              <div
                key={card.role}
                className="rounded-xl bg-white border border-[#E2E8F0] p-5 shadow-xs"
              >
                <div className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">
                  {card.role} Portal
                </div>
                <p className="mt-2 text-sm text-[#475569] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>

          <div
            id="pricing"
            className="mt-10 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div>
              <h3 className="text-base font-semibold text-[#0F172A]">
                Flexible Family Subscription Plans
              </h3>
              <p className="mt-1 text-sm text-[#475569]">
                Configure student limits, monthly 1-on-1 tutoring allowances, and trial periods in billing.
              </p>
            </div>
            <Link
              to="/billing"
              className="shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
            >
              View Plans & Billing
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const activeRole = resolveRole(user.role);
  const roleConfig = ROLE_ACTIONS[activeRole];

  return (
    <Layout
      title={roleConfig.heading}
      breadcrumbs={[{ label: "Home", to: "/" }, { label: roleConfig.heading }]}
      currentUser={user}
      onSignOut={() => {
        void refresh();
      }}
    >
      <div className="space-y-6">
        <div
          className="rounded-xl p-6 text-white"
          style={{
            background: `linear-gradient(120deg, ${DEEP_BLUE_THEME.colors.navy900} 0%, ${DEEP_BLUE_THEME.colors.navy800} 100%)`,
          }}
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">
            Active Role: {activeRole}
          </div>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold">{roleConfig.heading}</h2>
          <p className="mt-2 text-sm text-blue-100/90 max-w-2xl">{roleConfig.summary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {roleConfig.actions.map((action) => (
            <Link
              key={action.to + action.title}
              to={action.to}
              className="group rounded-xl bg-white border border-[#E2E8F0] p-5 hover:border-[#1D4ED8] transition-colors"
            >
              <div className="text-base font-semibold text-[#0F172A] group-hover:text-[#1D4ED8]">
                {action.title}
              </div>
              <p className="mt-1.5 text-sm text-[#475569]">{action.description}</p>
              <div className="mt-4 text-xs font-semibold text-[#1D4ED8]">
                Open section →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
