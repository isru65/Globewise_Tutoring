import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";

import { EmptyState, ErrorNote, PageHeader, Section, StatusBadge, fieldClass } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { errorText, label } from "@/lib/globewise";

export function meta() {
  return [{ title: "User & tutor approvals · Globewise Tutoring" }];
}

const ROLES = ["student", "parent", "tutor", "admin"] as const;
const STATUSES = ["active", "pending", "suspended"] as const;

export default function AdminRoute() {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const users = useActionQuery("list-users", {}, { enabled: isAdmin });
  const update = useActionMutation("update-user");

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="User & tutor approvals" />
        <EmptyState title="Administrators only" description="Ask an administrator if you need access to this page." />
      </>
    );
  }

  const pending = (users.data ?? []).filter((u) => u.status === "pending");

  return (
    <>
      <PageHeader title="User & tutor approvals" description="Manage roles and approve tutor accounts. Every change is written to the audit log." />

      {pending.length > 0 ? (
        <Section title={`Pending approvals (${pending.length})`} className="mb-6">
          <ul className="divide-y divide-border">
            {pending.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="block font-medium text-foreground">{u.name || u.email}</span>
                  <span className="text-xs text-muted-foreground">{u.email} · requested {label(u.role)}</span>
                </span>
                <Button size="sm" disabled={update.isPending} onClick={() => update.mutate({ id: u.id, status: "active" })}>
                  Approve
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="All accounts">
        {(users.data ?? []).length === 0 ? (
          <EmptyState title="No accounts yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Email</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(users.data ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4 text-foreground">{u.name || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 pr-4">
                      <select
                        aria-label={`Role for ${u.email}`}
                        className={`${fieldClass} w-auto`}
                        value={u.role}
                        disabled={update.isPending}
                        onChange={(e) => update.mutate({ id: u.id, role: e.target.value as (typeof ROLES)[number] })}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{label(r)}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Status for ${u.email}`}
                          className={`${fieldClass} w-auto`}
                          value={u.status}
                          disabled={update.isPending}
                          onChange={(e) => update.mutate({ id: u.id, status: e.target.value as (typeof STATUSES)[number] })}
                        >
                          {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                        </select>
                        <StatusBadge status={u.status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3">
          <ErrorNote error={update.error ? new Error(errorText(update.error)) : null} />
        </div>
      </Section>
    </>
  );
}
