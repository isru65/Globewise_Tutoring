import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  DEEP_BLUE_THEME,
  isPortalRole,
  PORTAL_CONFIG_BY_ROLE,
  PORTAL_ROLES,
  type PortalRole,
} from "../design-system.js";

export default function RoleLoginRoute() {
  const params = useParams();
  const navigate = useNavigate();

  const role: PortalRole = isPortalRole(params.role) ? params.role : "student";
  const cfg = PORTAL_CONFIG_BY_ROLE[role];

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          portalRole: role,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        setErrorMessage(
          payload?.error?.message ||
            `Unable to sign in to the ${cfg.label} portal.`,
        );
        return;
      }

      const targetPath =
        typeof payload?.data?.redirectTo === "string"
          ? payload.data.redirectTo
          : cfg.homePath;
      navigate(targetPath, { replace: true });
    } catch {
      setErrorMessage("Network error while signing in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center px-4 py-10"
      style={{ backgroundColor: DEEP_BLUE_THEME.colors.ice50 }}
    >
      <div
        className="w-full max-w-md rounded-2xl border bg-white overflow-hidden"
        style={{
          borderColor: DEEP_BLUE_THEME.colors.border,
          boxShadow: DEEP_BLUE_THEME.shadows.modal,
        }}
      >
        {/* Navy Banner */}
        <div
          className="px-6 py-5 text-white space-y-1"
          style={{ backgroundColor: DEEP_BLUE_THEME.colors.navy950 }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-300">
              {DEEP_BLUE_THEME.brand.name}
            </span>
            <Link
              to="/login"
              className="text-xs text-blue-200 hover:text-white underline"
            >
              All Roles
            </Link>
          </div>
          <h1 className="text-xl font-bold">{cfg.portalTitle}</h1>
          <p className="text-xs text-blue-100/80">{cfg.description}</p>
        </div>

        {/* Role Switcher Tabs */}
        <div
          className="grid grid-cols-4 border-b text-xs font-semibold"
          style={{
            borderColor: DEEP_BLUE_THEME.colors.border,
            backgroundColor: DEEP_BLUE_THEME.colors.ice100,
          }}
        >
          {PORTAL_ROLES.map((tabRole) => {
            const tabCfg = PORTAL_CONFIG_BY_ROLE[tabRole];
            const active = tabRole === role;
            return (
              <Link
                key={tabRole}
                to={tabCfg.loginPath}
                className="py-2.5 text-center transition-colors"
                style={{
                  backgroundColor: active
                    ? DEEP_BLUE_THEME.colors.royal700
                    : "transparent",
                  color: active
                    ? "#FFFFFF"
                    : DEEP_BLUE_THEME.colors.textSecondary,
                }}
              >
                {tabCfg.label}
              </Link>
            );
          })}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border px-3.5 py-2.5 text-xs font-medium"
              style={{
                backgroundColor: DEEP_BLUE_THEME.colors.dangerBg,
                borderColor: "#FECACA",
                color: DEEP_BLUE_THEME.colors.dangerText,
              }}
            >
              {errorMessage}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="portal-login-email"
              className="block text-xs font-semibold"
              style={{ color: DEEP_BLUE_THEME.colors.textPrimary }}
            >
              {cfg.label} Account Email
            </label>
            <input
              id="portal-login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`name@globewise-example.com`}
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:ring-2"
              style={{
                borderColor: DEEP_BLUE_THEME.colors.borderStrong,
                color: DEEP_BLUE_THEME.colors.textPrimary,
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
          >
            {submitting ? `Signing in to ${cfg.label}...` : `Continue to ${cfg.label} Portal`}
          </button>

          {role === "parent" && (
            <div
              className="pt-2 border-t text-center text-xs"
              style={{
                borderColor: DEEP_BLUE_THEME.colors.border,
                color: DEEP_BLUE_THEME.colors.textSecondary,
              }}
            >
              New parent?{" "}
              <Link
                to="/register/parent"
                className="font-semibold underline"
                style={{ color: DEEP_BLUE_THEME.colors.royal700 }}
              >
                Create a Parent Account
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}