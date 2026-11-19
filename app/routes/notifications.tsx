import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";

import { EmptyState, ErrorNote, PageHeader, Section } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { errorText, formatDateTime } from "@/lib/globewise";

export function meta() {
  return [{ title: "Notifications · Globewise Tutoring" }];
}

export default function NotificationsRoute() {
  const notifications = useActionQuery("list-notifications", {});
  const markRead = useActionMutation("mark-notification-read");

  return (
    <>
      <PageHeader title="Notifications" description="Account activity, plan updates, session changes, and achievements." />
      <Section title="Inbox">
        {(notifications.data ?? []).length === 0 ? (
          <EmptyState title="You're all caught up" />
        ) : (
          <ul className="divide-y divide-border">
            {(notifications.data ?? []).map((note) => (
              <li key={note.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className={note.read ? "text-sm text-muted-foreground" : "text-sm font-semibold text-foreground"}>
                    {note.title}
                  </p>
                  {note.body ? <p className="mt-0.5 text-sm text-muted-foreground">{note.body}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</p>
                </div>
                {note.read ? null : (
                  <Button size="sm" variant="outline" disabled={markRead.isPending} onClick={() => markRead.mutate({ id: note.id })}>
                    Mark as read
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <ErrorNote error={markRead.error ? new Error(errorText(markRead.error)) : null} />
        </div>
      </Section>
    </>
  );
}
