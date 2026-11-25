import React, { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  DEEP_BLUE_THEME,
  isPortalRole,
  isRouteAllowedForRole,
  PORTAL_CONFIG_BY_ROLE,
  type PortalRole,
} from "../../design-system.js";

export interface GuardUser {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  roles?: string[];
  status?: string;
}

interface PortalGuardProps {
  children: React.ReactNode;
  user?: GuardUser | null;
  loading?: boolean;
  allowedRoles?: PortalRole[];
  loginRedirectPath?: string;
}

export function PortalGuard({
  children,
  user,
  loading = false,
  allowedRoles,
  loginRedirectPath = "/login",
}: PortalGuardProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const activeRole: PortalRole | null = isPortalRole(user?.role)
    ? user.role
    : null;

  const isAuthenticated = Boolean(user?.email && activeRole);
  const routeAllowed = activeRole
    ? allowedRoles
      ? allowedRoles.includes(activeRole)
      : isRouteAllowedForRole(activeRole, location.pathname)
    : false;

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate(loginRedirectPath, {
        replace: true,
        state: { from: location.pathname },
      });
    }
  }, [loading, isAuthenticated, loginRedirectPath, location.pathname, navigate]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: DEEP_BLUE_THEME.colors.ice50 }}
      >
        <div
          className="rounded-xl border bg-white px-6 py-5 text-sm font-medium shadow-sm"
          style={{
            borderColor: DEEP_BLUE_THEME.colors.border,
            color: DEEP_BLUE_THEME.colors.textPrimary,
          }}
        >
          Verifying portal session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !activeRole) {
    return null;
  }

  if (!routeAllowed) {
    const portalCfg = PORTAL_CONFIG_BY_ROLE[activeRole];
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: DEEP_BLUE_THEME.colors.ice50 }}
      >
        <div
          className="max-w-md w-full rounded-2xl border bg-white p-6 space-y-4"
          style={{
            borderColor: DEEP_BLUE_THEME.colors.border,
            boxShadow: DEEP_BLUE_THEME.shadows.card,
          }}
        >
          <span
            className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: DEEP_BLUE_THEME.colors.dangerBg,
              color: DEEP_BLUE_THEME.colors.dangerText,
            }}
          >
            Role Access Restricted
          </span>
          <h2
            className="text-lg font-semibold"
            style={{ color: DEEP_BLUE_THEME.colors.textPrimary }}
          >
            This route is outside the {portalCfg.label} portal
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: DEEP_BLUE_THEME.colors.textSecondary }}
          >
            Your current session is scoped to <strong>{portalCfg.portalTitle}</strong>.
            Return to your assigned workspace or sign in with a different role account.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={portalCfg.homePath}
              className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: DEEP_BLUE_THEME.colors.royal700 }}
            >
              Go to {portalCfg.label} Portal
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                borderColor: DEEP_BLUE_THEME.colors.borderStrong,
                color: DEEP_BLUE_THEME.colors.textPrimary,
              }}
            >
              Switch Role Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default PortalGuard;