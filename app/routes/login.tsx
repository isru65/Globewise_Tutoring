import React from "react";
import { Link } from "react-router";
import {
  DEEP_BLUE_THEME,
  PORTAL_CONFIG_BY_ROLE,
  PORTAL_ROLES,
} from "../design-system.js";

export default function LoginHubRoute() {
  return (
    <div
      className="min-h-screen flex flex-col justify-between"
      style={{
        backgroundColor: DEEP_BLUE_THEME.colors.ice50,
        color: DEEP_BLUE_THEME.colors.textPrimary,
      }}
    >
      {/* Top Deep Blue / Navy Bar */}
      <header
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{
          backgroundColor: DEEP_BLUE_THEME.colors.navy950,
          borderColor: "rgba(255,255,255,0.12)",
          color: "#FFFFFF",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            GW
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">
              {DEEP_BLUE_THEME.brand.name}
            </div>
            <div className="text-xs text-blue-200/80">
              {DEEP_BLUE_THEME.brand.tagline}
            </div>
          </div>
        </div>

        <Link
          to="/register/parent"
          className="rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors"
          style={{ backgroundColor: DEEP_BLUE_THEME.colors.cobalt600 }}
        >
          Parent Registration
        </Link>
      </header>

      {/* Main Role Selection Grid */}
      <main className="max-w-5xl w-full mx-auto px-6 py-12 space-y-8">
        <div className="space-y-2 max-w-2xl">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: DEEP_BLUE_THEME.colors.ice100,
              color: DEEP_BLUE_THEME.colors.royal700,
            }}
          >
            Role-Guarded Portal Access
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Choose your portal sign-in
          </h1>
          <p
            className="text-sm sm:text-base"
            style={{ color: DEEP_BLUE_THEME.colors.textSecondary }}
          >
            Each role—Student, Tutor, Parent, and Administrator—has a dedicated login
            entry and role-scoped workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {PORTAL_ROLES.map((role) => {
            const cfg = PORTAL_CONFIG_BY_ROLE[role];
            return (
              <div
                key={role}
                className="rounded-2xl border bg-white p-6 flex flex-col justify-between gap-5"
                style={{
                  borderColor: DEEP_BLUE_THEME.colors.border,
                  boxShadow: DEEP_BLUE_THEME.shadows.card,
                }}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold text-white"
                      style={{ backgroundColor: cfg.badgeAccent }}
                    >
                      {cfg.label}
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: DEEP_BLUE_THEME.colors.textMuted }}
                    >
                      {cfg.loginPath}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold">{cfg.portalTitle}</h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: DEEP_BLUE_THEME.colors.textSecondary }}
                  >
                    {cfg.description}
                  </p>
                </div>

                <div>
                  <Link
                    to={cfg.loginPath}
                    className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                    style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
                  >
                    Sign in as {cfg.label}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer
        className="border-t px-6 py-4 text-center text-xs"
        style={{
          borderColor: DEEP_BLUE_THEME.colors.border,
          color: DEEP_BLUE_THEME.colors.textMuted,
        }}
      >
        {DEEP_BLUE_THEME.brand.name} • Deep Blue Portal Architecture
      </footer>
    </div>
  );
}