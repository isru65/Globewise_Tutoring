import { useActionQuery } from "@agent-native/core/client/hooks";

import { EmptyState, PageHeader, Section } from "@/components/app/primitives";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatDateTime, label } from "@/lib/globewise";

export function meta() {
  return [{ title: "Audit logs · Globewise Tutoring" }];
}

export default function AuditRoute() {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const logs = useActionQuery("list-audit-logs", { limit: 200 }, { enabled: isAdmin });

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="Reports & audit logs" />
        <EmptyState title="Administrators only" />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Reports & audit logs" description="The most recent 200 administrative and account actions." />
      <Section title="Activity">
        {(logs.data ?? []).length === 0 ? (
          <EmptyState title="No audit events yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Actor</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(logs.data ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-muted-foreground">{formatDateTime(row.createdAt)}</td>
                    <td className="py-2.5 pr-4 text-foreground">{row.actorEmail}</td>
                    <td className="py-2.5 pr-4 text-foreground">{label(row.action.replace(/\./g, " "))}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">
                      {label(row.targetType)} <span className="font-mono text-xs">{row.targetId.slice(0, 8)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
