import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useEffect, useState, type FormEvent } from "react";

import { EmptyState, ErrorNote, FieldLabel, PageHeader, Section, StatusBadge, fieldClass } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { GRADE_OPTIONS, errorText, gradeLabel, label } from "@/lib/globewise";

export function meta() {
  return [{ title: "AI generator · Globewise Tutoring" }];
}

const JOB_TYPES = ["lesson", "practice", "coding", "assessment_items", "summary"] as const;

type Output = {
  id: string;
  title: string;
  body: string;
  subject: string;
  gradeLevel: number;
  reviewStatus: string;
  jobType: string;
};

function OutputCard({ output }: { output: Output }) {
  const review = useActionMutation("review-ai-output");
  const [body, setBody] = useState(output.body);
  const [title, setTitle] = useState(output.title);
  useEffect(() => {
    setBody(output.body);
    setTitle(output.title);
  }, [output.body, output.title]);
  const dirty = body !== output.body || title !== output.title;
  const reviewed = output.reviewStatus !== "draft";

  return (
    <li className="space-y-3 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Input aria-label="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="font-medium" />
          <p className="mt-1 text-xs text-muted-foreground">
            {label(output.jobType)} · {output.subject} · {gradeLabel(output.gradeLevel)}
          </p>
        </div>
        <StatusBadge status={output.reviewStatus} />
      </div>
      <textarea
        aria-label="Draft body"
        className={`${fieldClass} h-auto min-h-28 py-2`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex flex-wrap justify-end gap-2">
        {dirty ? (
          <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ id: output.id, decision: "edit", body, title })}>
            Save edits
          </Button>
        ) : null}
        {!reviewed || output.reviewStatus === "rejected" ? (
          <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: output.id, decision: "approve" })}>
            Approve
          </Button>
        ) : null}
        {output.reviewStatus !== "rejected" ? (
          <Button size="sm" variant="ghost" disabled={review.isPending} onClick={() => review.mutate({ id: output.id, decision: "reject" })}>
            Reject
          </Button>
        ) : null}
      </div>
      <ErrorNote error={review.error ? new Error(errorText(review.error)) : null} />
    </li>
  );
}

export default function AiRoute() {
  const { user } = useCurrentUser();
  const isStaff = user?.role === "tutor" || user?.role === "admin";
  const outputs = useActionQuery("list-ai-outputs", {}, { enabled: isStaff });
  const generate = useActionMutation("generate-ai-content");
  const [form, setForm] = useState({ jobType: "lesson" as (typeof JOB_TYPES)[number], gradeLevel: 3, subject: "Mathematics", topic: "", criteria: "" });

  if (!isStaff) {
    return <EmptyState title="Tutors and admins generate content" description="Approved materials are in Learning Resources." />;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    generate.mutate(form, { onSuccess: () => setForm((f) => ({ ...f, topic: "", criteria: "" })) });
  }

  const list = (outputs.data ?? []) as Output[];
  const drafts = list.filter((o) => o.reviewStatus === "draft");
  const others = list.filter((o) => o.reviewStatus !== "draft");

  return (
    <>
      <PageHeader title="AI generator" description="Describe what you need. Drafts stay private until you approve them." />
      <Section title="Generate a draft" description="Nothing reaches a student without tutor approval.">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
          <label className="block">
            <FieldLabel>Type</FieldLabel>
            <select className={fieldClass} value={form.jobType} onChange={(e) => setForm({ ...form, jobType: e.target.value as (typeof JOB_TYPES)[number] })}>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>{label(t.replace(/_/g, " "))}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Grade</FieldLabel>
            <select className={fieldClass} value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: Number(e.target.value) })}>
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{gradeLabel(g)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Subject</FieldLabel>
            <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>
          <label className="block">
            <FieldLabel>Topic</FieldLabel>
            <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </label>
          <label className="block md:col-span-3">
            <FieldLabel>Criteria</FieldLabel>
            <Input required value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} placeholder="Length, difficulty, examples to include" />
          </label>
          <div className="flex items-end justify-end">
            <Button type="submit" disabled={generate.isPending || !form.criteria.trim()}>
              {generate.isPending ? "Generating…" : "Generate draft"}
            </Button>
          </div>
        </form>
        <div className="mt-3"><ErrorNote error={generate.error ? new Error(errorText(generate.error)) : null} /></div>
      </Section>

      <Section title={`Review queue (${drafts.length})`} className="mt-6">
        {drafts.length === 0 ? (
          <EmptyState title="No drafts waiting" description="Generated drafts appear here for review." />
        ) : (
          <ul className="space-y-4">
            {drafts.map((o) => <OutputCard key={o.id} output={o} />)}
          </ul>
        )}
      </Section>

      {others.length > 0 ? (
        <Section title="Reviewed" className="mt-6">
          <ul className="space-y-4">
            {others.map((o) => <OutputCard key={o.id} output={o} />)}
          </ul>
        </Section>
      ) : null}
    </>
  );
}
