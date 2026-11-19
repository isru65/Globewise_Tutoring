import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useMemo, useState, type FormEvent } from "react";

import { EmptyState, ErrorNote, FieldLabel, PageHeader, Section, StatusBadge, fieldClass } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { GRADE_OPTIONS, errorText, gradeLabel } from "@/lib/globewise";

export function meta() {
  return [{ title: "Curriculum · Globewise Tutoring" }];
}

type Topic = {
  id: string;
  program: string;
  gradeLevel: number;
  subject: string;
  unit: string;
  title: string;
  description: string;
  objectives: string;
  standards: string;
  prerequisiteIds: string[];
  durationMinutes: number;
  difficulty: string;
  sortOrder: number;
};

type RoadmapState = "completed" | "active" | "ready" | "locked";

const STATE_LABEL: Record<RoadmapState, string> = {
  completed: "completed",
  active: "active",
  ready: "ready",
  locked: "locked",
};

function AddTopic({ topics }: { topics: Topic[] }) {
  const create = useActionMutation("create-topic");
  const [form, setForm] = useState({
    program: "academic",
    gradeLevel: 3,
    subject: "Mathematics",
    unit: "",
    title: "",
    description: "",
    objectives: "",
    standards: "",
    durationMinutes: 45,
    difficulty: "Core",
  });
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>([]);
  const sameGrade = topics.filter((t) => t.gradeLevel === form.gradeLevel);

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      { ...form, prerequisiteIds, program: form.program as "academic" | "coding", difficulty: form.difficulty as "Intro" | "Core" | "Advanced" },
      {
        onSuccess: () => {
          setForm((f) => ({ ...f, unit: "", title: "", description: "", objectives: "", standards: "" }));
          setPrerequisiteIds([]);
        },
      },
    );
  }

  return (
    <Section title="Add a curriculum topic" description="Topics feed syllabus mapping and learning plans.">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <FieldLabel>Program</FieldLabel>
          <select className={fieldClass} value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
            <option value="academic">Academic</option>
            <option value="coding">Coding</option>
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
          <FieldLabel>Unit</FieldLabel>
          <Input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </label>
        <label className="block md:col-span-2">
          <FieldLabel>Title</FieldLabel>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="block md:col-span-3">
          <FieldLabel>Objectives</FieldLabel>
          <Input value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} />
        </label>
        <label className="block">
          <FieldLabel>Standards</FieldLabel>
          <Input value={form.standards} onChange={(e) => setForm({ ...form, standards: e.target.value })} placeholder="e.g. 3.NF.A.1" />
        </label>
        <label className="block">
          <FieldLabel>Duration (minutes)</FieldLabel>
          <Input type="number" min={5} max={240} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
        </label>
        <label className="block">
          <FieldLabel>Difficulty</FieldLabel>
          <select className={fieldClass} value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
            <option>Intro</option>
            <option>Core</option>
            <option>Advanced</option>
          </select>
        </label>
        <fieldset className="md:col-span-3">
          <legend className="mb-1.5 text-xs font-medium text-muted-foreground">Prerequisites (same grade)</legend>
          <div className="flex flex-wrap gap-2">
            {sameGrade.length === 0 ? <span className="text-xs text-muted-foreground">No topics yet for this grade.</span> : null}
            {sameGrade.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={prerequisiteIds.includes(t.id)}
                  onChange={(e) =>
                    setPrerequisiteIds((ids) => (e.target.checked ? [...ids, t.id] : ids.filter((id) => id !== t.id)))
                  }
                />
                {t.title}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="md:col-span-3 flex items-center justify-between gap-3">
          <ErrorNote error={create.error ? new Error(errorText(create.error)) : null} />
          <Button type="submit" disabled={create.isPending}>Add topic</Button>
        </div>
      </form>
    </Section>
  );
}

export default function CurriculumRoute() {
  const { user } = useCurrentUser();
  const [program, setProgram] = useState<"" | "academic" | "coding">("");
  const [grade, setGrade] = useState<number | "">("");
  const [studentId, setStudentId] = useState("");
  const topics = useActionQuery("list-topics", {
    program: program || undefined,
    gradeLevel: grade === "" ? undefined : grade,
  });
  const students = useActionQuery("list-students", {});
  const selectedStudentId = studentId || students.data?.[0]?.id || "";
  const progress = useActionQuery("list-topic-progress", { studentId: selectedStudentId }, { enabled: !!selectedStudentId });
  const setProgressMutation = useActionMutation("set-topic-progress");
  const allTopics = useActionQuery("list-topics", {});
  const canEdit = user?.role === "tutor" || user?.role === "admin";

  const states = useMemo(() => {
    const done = new Set((progress.data ?? []).filter((p) => p.status === "completed").map((p) => p.topicId));
    const active = new Set((progress.data ?? []).filter((p) => p.status === "active").map((p) => p.topicId));
    const map = new Map<string, RoadmapState>();
    for (const topic of (allTopics.data ?? []) as Topic[]) {
      const prereqsDone = topic.prerequisiteIds.every((id) => done.has(id));
      map.set(
        topic.id,
        done.has(topic.id) ? "completed" : active.has(topic.id) ? "active" : prereqsDone ? "ready" : "locked",
      );
    }
    return map;
  }, [progress.data, allTopics.data]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Topic[]>();
    for (const topic of (topics.data ?? []) as Topic[]) {
      const key = `${topic.subject} · ${gradeLabel(topic.gradeLevel)}`;
      groups.set(key, [...(groups.get(key) ?? []), topic]);
    }
    return [...groups.entries()];
  }, [topics.data]);

  const titleOf = new Map(((allTopics.data ?? []) as Topic[]).map((t) => [t.id, t.title]));
  const studentName = students.data?.find((s) => s.id === selectedStudentId);

  return (
    <>
      <PageHeader
        title="Academic curriculum"
        description="Topics by program, grade, and subject, with each learner's roadmap status."
      />

      {canEdit ? <AddTopic topics={(allTopics.data ?? []) as Topic[]} /> : null}

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <label className="block">
          <FieldLabel>Program</FieldLabel>
          <select className={fieldClass} value={program} onChange={(e) => setProgram(e.target.value as typeof program)}>
            <option value="">All programs</option>
            <option value="academic">Academic</option>
            <option value="coding">Coding</option>
          </select>
        </label>
        <label className="block">
          <FieldLabel>Grade</FieldLabel>
          <select className={fieldClass} value={grade} onChange={(e) => setGrade(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">All grades</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>{gradeLabel(g)}</option>
            ))}
          </select>
        </label>
        {(students.data ?? []).length > 0 ? (
          <label className="block">
            <FieldLabel>Roadmap for</FieldLabel>
            <select className={fieldClass} value={selectedStudentId} onChange={(e) => setStudentId(e.target.value)}>
              {(students.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="mt-6 space-y-6">
        {grouped.length === 0 ? (
          <EmptyState title="No topics match these filters" />
        ) : (
          grouped.map(([group, items]) => (
            <Section key={group} title={group} description={`${items.length} topics`}>
              <ul className="grid gap-3 md:grid-cols-2">
                {items.map((topic) => {
                  const state = states.get(topic.id) ?? "ready";
                  const missing = topic.prerequisiteIds.filter((id) => states.get(id) !== "completed");
                  return (
                    <li key={topic.id} className="rounded-md border border-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{topic.unit} · {topic.durationMinutes} min · {topic.difficulty}</p>
                          <p className="mt-0.5 text-sm font-medium text-foreground">{topic.title}</p>
                        </div>
                        <StatusBadge status={STATE_LABEL[state] === "ready" ? "scheduled" : STATE_LABEL[state] === "locked" ? "cancelled" : STATE_LABEL[state] === "completed" ? "completed" : "active"} />
                      </div>
                      {topic.description ? <p className="mt-2 text-xs text-muted-foreground">{topic.description}</p> : null}
                      {topic.standards ? <p className="mt-2 text-xs text-muted-foreground">Standards: {topic.standards}</p> : null}
                      {state === "locked" && missing.length ? (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Finish first: {missing.map((id) => titleOf.get(id)).join(", ")}</p>
                      ) : null}
                      {canEdit && selectedStudentId ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" disabled={setProgressMutation.isPending || state === "locked"} onClick={() => setProgressMutation.mutate({ studentId: selectedStudentId, topicId: topic.id, status: "active" })}>
                            Mark active
                          </Button>
                          <Button size="sm" variant="outline" disabled={setProgressMutation.isPending || state === "locked"} onClick={() => setProgressMutation.mutate({ studentId: selectedStudentId, topicId: topic.id, status: "completed" })}>
                            Mark complete
                          </Button>
                          {state !== "ready" && state !== "locked" ? (
                            <Button size="sm" variant="ghost" onClick={() => setProgressMutation.mutate({ studentId: selectedStudentId, topicId: topic.id, status: "reset" })}>
                              Reset
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Section>
          ))
        )}
      </div>
      {studentName ? <p className="mt-4 text-xs text-muted-foreground">Roadmap shown for {studentName.firstName} {studentName.lastName}.</p> : null}
      <div className="mt-2"><ErrorNote error={setProgressMutation.error ? new Error(errorText(setProgressMutation.error)) : null} /></div>
    </>
  );
}
