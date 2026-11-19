import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useState, type FormEvent } from "react";

import { EmptyState, ErrorNote, FieldLabel, PageHeader, Section, StatusBadge, fieldClass } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { errorText, formatDate } from "@/lib/globewise";

export function meta() {
  return [{ title: "Weekly plans · Globewise Tutoring" }];
}

const ACTIVITY_TYPES = ["Lesson", "Reading", "Video", "Practice", "Coding Activity", "Assessment"] as const;

type Item = { title: string; activityType: (typeof ACTIVITY_TYPES)[number]; estimatedMinutes: number; topicId?: string | undefined };

function PlanBuilder({ students }: { students: { id: string; firstName: string; lastName: string }[] }) {
  const create = useActionMutation("create-learning-plan");
  const topics = useActionQuery("list-topics", {});
  const [studentId, setStudentId] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [tutorNotes, setTutorNotes] = useState("");
  const [items, setItems] = useState<Item[]>([{ title: "", activityType: "Lesson", estimatedMinutes: 30 }]);
  const chosenStudent = studentId || students[0]?.id || "";

  function update(index: number, patch: Partial<Item>) {
    setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const cleaned = items.filter((item) => item.title.trim());
    create.mutate(
      { studentId: chosenStudent, weekStart, tutorNotes, items: cleaned },
      {
        onSuccess: () => {
          setItems([{ title: "", activityType: "Lesson", estimatedMinutes: 30 }]);
          setTutorNotes("");
        },
      },
    );
  }

  return (
    <Section title="New weekly plan" description="Plans start as drafts. Send them for review, approve, then publish to the student.">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <FieldLabel>Student</FieldLabel>
            <select className={fieldClass} value={chosenStudent} onChange={(e) => setStudentId(e.target.value)}>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Week starting</FieldLabel>
            <Input type="date" required value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          </label>
          <label className="block">
            <FieldLabel>Tutor notes</FieldLabel>
            <Input value={tutorNotes} onChange={(e) => setTutorNotes(e.target.value)} />
          </label>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_1.2fr_auto] md:items-end">
              <label className="block">
                <FieldLabel>Activity</FieldLabel>
                <Input value={item.title} onChange={(e) => update(index, { title: e.target.value })} placeholder="e.g. Equivalent fractions practice" />
              </label>
              <label className="block">
                <FieldLabel>Type</FieldLabel>
                <select className={fieldClass} value={item.activityType} onChange={(e) => update(index, { activityType: e.target.value as Item["activityType"] })}>
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Minutes</FieldLabel>
                <Input type="number" min={5} max={240} value={item.estimatedMinutes} onChange={(e) => update(index, { estimatedMinutes: Number(e.target.value) })} />
              </label>
              <label className="block">
                <FieldLabel>Curriculum topic</FieldLabel>
                <select className={fieldClass} value={item.topicId ?? ""} onChange={(e) => update(index, { topicId: e.target.value || undefined })}>
                  <option value="">None</option>
                  {(topics.data ?? []).map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </label>
              <Button type="button" variant="ghost" size="sm" disabled={items.length === 1} onClick={() => setItems((list) => list.filter((_, i) => i !== index))}>
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setItems((list) => [...list, { title: "", activityType: "Lesson", estimatedMinutes: 30 }])}>
            Add activity
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <ErrorNote error={create.error ? new Error(errorText(create.error)) : null} />
          <Button type="submit" disabled={create.isPending || !chosenStudent || !weekStart}>Create draft plan</Button>
        </div>
      </form>
    </Section>
  );
}

const NEXT_ACTIONS: Record<string, { to: string; label: string; variant?: "outline" | "default" }[]> = {
  draft: [{ to: "pending_review", label: "Send for review", variant: "outline" }],
  pending_review: [
    { to: "approved", label: "Approve" },
    { to: "draft", label: "Return to draft", variant: "outline" },
  ],
  approved: [{ to: "published", label: "Publish to student" }],
  published: [{ to: "archived", label: "Archive", variant: "outline" }],
  in_progress: [{ to: "archived", label: "Archive", variant: "outline" }],
  completed: [{ to: "archived", label: "Archive", variant: "outline" }],
};

function PlanDetail({ planId, isStaff, canComplete, studentName }: { planId: string; isStaff: boolean; canComplete: boolean; studentName: string }) {
  const plans = useActionQuery("list-learning-plans", {});
  const items = useActionQuery("list-plan-items", { planId });
  const transition = useActionMutation("update-learning-plan-status");
  const complete = useActionMutation("complete-plan-item");
  const plan = (plans.data ?? []).find((p) => p.id === planId);
  if (!plan) return null;
  const done = (items.data ?? []).filter((i) => i.completed).length;
  const total = items.data?.length ?? 0;
  const actions = isStaff ? NEXT_ACTIONS[plan.status] ?? [] : [];

  return (
    <Section
      title={`${studentName} · week of ${formatDate(plan.weekStart)}`}
      description={plan.tutorNotes || "No tutor notes"}
      action={<StatusBadge status={plan.status} />}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{done} of {total} activities complete</p>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a.to} size="sm" variant={a.variant ?? "default"} disabled={transition.isPending} onClick={() => transition.mutate({ id: planId, status: a.to as never })}>
              {a.label}
            </Button>
          ))}
        </div>
      </div>
      {(items.data ?? []).length === 0 ? (
        <EmptyState title="No activities in this plan" />
      ) : (
        <ul className="divide-y divide-border">
          {(items.data ?? []).map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              {canComplete ? (
                <input
                  type="checkbox"
                  aria-label={`Mark ${item.title} complete`}
                  className="size-4 accent-primary"
                  checked={item.completed}
                  disabled={complete.isPending}
                  onChange={(e) => complete.mutate({ itemId: item.id, completed: e.target.checked })}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.activityType} · {item.estimatedMinutes} min</p>
              </div>
              {item.completed ? <StatusBadge status="completed" /> : null}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 space-y-2">
        <ErrorNote error={transition.error ? new Error(errorText(transition.error)) : null} />
        <ErrorNote error={complete.error ? new Error(errorText(complete.error)) : null} />
      </div>
    </Section>
  );
}

export default function PlansRoute() {
  const { user } = useCurrentUser();
  const plans = useActionQuery("list-learning-plans", {});
  const students = useActionQuery("list-students", {});
  const [selected, setSelected] = useState<string | null>(null);
  const isStaff = user?.role === "tutor" || user?.role === "admin";
  const canComplete = user?.role === "student" || user?.role === "admin";
  const names = new Map((students.data ?? []).map((s) => [s.id, `${s.firstName} ${s.lastName}`]));
  const selectedPlan = (plans.data ?? []).find((p) => p.id === selected);

  return (
    <>
      <PageHeader
        title={user?.role === "student" ? "My learning" : "Weekly plans"}
        description="Plans follow the Draft → Pending Review → Approved → Published → In Progress → Completed → Archived workflow."
      />
      {user?.role === "tutor" || user?.role === "admin" ? <PlanBuilder students={students.data ?? []} /> : null}

      <Section title="Plans" className="mt-6">
        {(plans.data ?? []).length === 0 ? (
          <EmptyState title="No plans yet" description="Published plans appear here for students and families." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {(plans.data ?? []).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={selected === p.id}
                  onClick={() => setSelected(p.id)}
                  className={`w-full rounded-md border p-4 text-left transition-colors hover:bg-accent/40 ${selected === p.id ? "border-primary" : "border-border"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{names.get(p.studentId) ?? "Student"}</p>
                      <p className="text-xs text-muted-foreground">Week of {formatDate(p.weekStart)}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {selectedPlan ? (
        <div className="mt-6">
          <PlanDetail
            key={selectedPlan.id}
            planId={selectedPlan.id}
            isStaff={isStaff}
            canComplete={canComplete}
            studentName={names.get(selectedPlan.studentId) ?? "Student"}
          />
        </div>
      ) : null}
    </>
  );
}
