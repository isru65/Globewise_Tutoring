import { useActionQuery } from "@agent-native/core/client/hooks";

import { EmptyState, PageHeader } from "@/components/app/primitives";
import { gradeLabel, label } from "@/lib/globewise";

export function meta() {
  return [{ title: "Learning resources · Globewise Tutoring" }];
}

export default function ResourcesRoute() {
  const outputs = useActionQuery("list-ai-outputs", { reviewStatus: "approved" });
  const items = outputs.data ?? [];

  return (
    <>
      <PageHeader title="Learning resources" description="Lessons, practice sets, and activities your tutor has approved." />
      {items.length === 0 ? (
        <EmptyState title="No resources yet" description="Approved materials appear here as your tutor publishes them." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">{label(item.jobType.replace(/_/g, " "))}</p>
              <h2 className="mt-1 text-base font-semibold text-foreground">{item.title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.subject} · {gradeLabel(item.gradeLevel)}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{item.body}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
