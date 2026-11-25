import React, { useState } from "react";
import { Link, useLocation } from "react-router";
import {
  DEEP_BLUE_THEME,
  PORTAL_NAV_BY_ROLE,
  type PortalRole,
} from "../../design-system.js";

export interface LayoutUser {
  name?: string;
  email?: string;
  role?: string;
  timezone?: string;
}

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  currentUser?: LayoutUser | null;
  unreadNotificationsCount?: number;
  pendingAssessmentsCount?: number;
  onSignOut?: () => void;
  headerActions?: React.ReactNode;
}

function normalizeRole(role?: string): PortalRole {
  if (role === "tutor" || role === "parent" || role === "admin" || role === "student") {
    return role;
  }
  return "student";
}

function getInitials(name?: string, email?: string): string {
  const source = (name || email || "GW").trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function Layout({
  children,
  title = "Workspace",
  breadcrumbs = [],
  currentUser,
  unreadNotificationsCount = 0,
  pendingAssessmentsCount = 0,
  onSignOut,
  headerActions,
}: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = normalizeRole(currentUser?.role);
  const navItems = PORTAL_NAV_BY_ROLE[role];
  const displayName = currentUser?.name?.trim() || currentUser?.email || "Globewise User";
  const displayRoleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div
      className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]"
      style={{ fontFamily: "inherit" }}
    >
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-[#071126]/50 lg:hidden"
        />
      )}

      {/* Deep Blue / Navy Left Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 shrink-0 flex flex-col justify-between transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          backgroundColor: DEEP_BLUE_THEME.colors.navy900,
          color: "#FFFFFF",
        }}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
            <Link to="/" className="flex items-center gap-2.5">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
              >
                GW
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight text-white">
                  {DEEP_BLUE_THEME.brand.name}
                </div>
                <div className="text-[11px] text-blue-200/80">
                  {displayRoleLabel} Portal
                </div>
              </div>
            </Link>
          </div>

          {/* Role Navigation */}
          <nav aria-label="Primary portal navigation" className="px-3 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname === item.to ||
                    location.pathname.startsWith(`${item.to}/`);

              const badgeCount =
                item.badgeKey === "notifications"
                  ? unreadNotificationsCount
                  : item.badgeKey === "assessments"
                    ? pendingAssessmentsCount
                    : 0;

              return (
                <Link
                  key={`${role}-${item.to}-${item.label}`}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#1D4ED8] text-white shadow-sm"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{item.label}</span>
                  {badgeCount > 0 && (
                    <span className="ml-2 rounded-full bg-sky-400/20 px-2 py-0.5 text-xs font-semibold text-sky-200">
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Card */}
        <div className="p-3 border-t border-white/10 bg-[#071126]/60">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: DEEP_BLUE_THEME.colors.cobalt600 }}
            >
              {getInitials(currentUser?.name, currentUser?.email)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-white">
                {displayName}
              </div>
              <div className="truncate text-xs text-blue-200/75">
                {displayRoleLabel}
                {currentUser?.timezone ? ` • ${currentUser.timezone}` : ""}
              </div>
            </div>
          </div>

          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="mt-2 w-full rounded-lg border border-white/15 px-3 py-1.5 text-left text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
            >
              Sign out
            </button>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden inline-flex items-center justify-center rounded-lg border border-[#CBD5E1] p-2 text-[#0F172A] hover:bg-[#EFF6FF]"
            >
              ☰
            </button>

            <div className="min-w-0">
              {breadcrumbs.length > 0 && (
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#64748B]">
                  {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={`${crumb.label}-${index}`}>
                      {index > 0 && <span>/</span>}
                      {crumb.to ? (
                        <Link to={crumb.to} className="hover:text-[#1D4ED8]">
                          {crumb.label}
                        </Link>
                      ) : (
                        <span className="text-[#0F172A] font-medium">{crumb.label}</span>
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              )}
              <h1 className="truncate text-base sm:text-lg font-semibold text-[#0F172A]">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {headerActions}
            <Link
              to="/notifications"
              aria-label="Notifications"
              className="relative inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs font-medium text-[#0F172A] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] transition-colors"
            >
              <span>Notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="rounded-full bg-[#1D4ED8] px-1.5 py-0.5 text-[11px] font-semibold text-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;

