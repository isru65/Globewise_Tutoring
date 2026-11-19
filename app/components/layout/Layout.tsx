import { appPath } from "@agent-native/core/client/api-path";
import { HeaderActionsProvider } from "@agent-native/toolkit/app-shell";
import { IconLogout } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { NAV, ROLE_LABELS, type NavItem } from "@/lib/globewise";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

function isActive(pathname: string, search: string, item: NavItem) {
  const [path, query] = item.to.split("?");
  if (path === "/") return pathname === "/";
  if (query) return pathname === path && search.includes(query);
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function Layout({ children }: LayoutProps) {
  const { user, error, isLoading } = useCurrentUser();
  const location = useLocation();
  const onLogin = location.pathname.startsWith("/_agent-native");

  if (onLogin) {
    return <HeaderActionsProvider>{children}</HeaderActionsProvider>;
  }

  const items = user ? NAV[user.role] : [];

  async function signOut() {
    await fetch(appPath("/_agent-native/auth/logout"), { method: "POST" });
    window.location.href = appPath("/");
  }

  return (
    <HeaderActionsProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background text-sidebar-foreground md:flex">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
              G
            </div>
            <div>
              <p className="text-sm font-semibold text-sidebar-accent-foreground">Globewise</p>
              <p className="text-xs text-sidebar-foreground">Tutoring</p>
            </div>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Main">
            {items.map((item) => {
              const active = isActive(location.pathname, location.search, item);
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <item.icon className="size-4 shrink-0" stroke={1.75} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          {user ? (
            <div className="border-t border-sidebar-border p-4">
              <p className="truncate text-sm font-medium text-sidebar-accent-foreground">{user.name || user.email}</p>
              <p className="mb-3 text-xs text-sidebar-foreground">{ROLE_LABELS[user.role]}</p>
              <Button variant="outline" size="sm" className="w-full justify-center border-sidebar-border bg-transparent text-sidebar-accent-foreground hover:bg-sidebar-accent" onClick={signOut}>
                <IconLogout className="size-4" />
                Sign out
              </Button>
            </div>
          ) : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden" aria-label="Main mobile">
            {items.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <main className="agent-native-app-main min-w-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-6xl px-5 py-8 md:px-10">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading your workspace…</p>
              ) : error ? (
                <div className="rounded-lg border border-border bg-card p-6">
                  <p className="text-sm font-medium text-foreground">We could not open your workspace</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {error instanceof Error ? error.message : "Try again in a moment."}
                  </p>
                </div>
              ) : (
                children
              )}
            </div>
          </main>
        </div>
      </div>
    </HeaderActionsProvider>
  );
}
