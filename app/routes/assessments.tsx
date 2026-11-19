import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useState, type FormEvent } from "react";

import { EmptyState, ErrorNote, FieldLabel, PageHeader, Section, StatusBadge, fieldClass } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { GRADE_OPTIONS, errorText, gradeLabel, label } from "@/lib/globewise";

export function meta() {
  return [{ title: "Assessments · Globewise Tutoring" }];
}

const QUESTION_TYPES = ["multiple_choice", "multiple_select", "true_false", "short_answer", "numeric"] as const;
type QuestionType = (typeof QUESTION_TYPES)[number];

type Draft = { questionType: QuestionType; prompt: string; options: string; answer: string; points: number };
const EMPTY_QUESTION: Draft = { questionType: "multiple_choice", prompt: "", options: "", answer: "", points: 1 };

function toQuestion(draft: Draft) {
  const options = ["multiple_choice", "multiple_select"].includes(draft.questionType)
    ? draft.options.split("|").map((o) => o.trim()).filter(Boolean)
    : undefined;
  let correctAnswer: string | number | boolean | string[];
  if (draft.questionType === "true_false") correctAnswer = draft.answer.trim().toLowerCase() === "true";
  else if (draft.questionType === "numeric") correctAnswer = Number(draft.answer);
  else if (draft.questionType === "multiple_select") correctAnswer = draft.answer.split("|").map((a) => a.trim()).filter(Boolean);
  else correctAnswer = draft.answer.trim();
  return { questionType: draft.questionType, prompt: draft.prompt.trim(), options, correctAnswer, points: draft.points };
}

function AssessmentBuilder() {
  const create = useActionMutation("create-assessment");
  const [meta, setMeta] = useState({ title: "", subject: "Mathematics", gradeLevel: 3, timeLimitMinutes: 15, attemptLimit: 2, passingScore: 70, status: "published" as "draft" | "published" });
  const [questions, setQuestions] = useState<Draft[]>([{ ...EMPTY_QUESTION }]);

  function update(index: number, patch: Partial<Draft>) {
    setQuestions((list) => list.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(
      { ...meta, timeLimitMinutes: meta.timeLimitMinutes || null, questions: questions.filter((q) => q.prompt.trim()).map(toQuestion) },
      { onSuccess: () => { setMeta((m) => ({ ...m, title: "" })); setQuestions([{ ...EMPTY_QUESTION }]); } },
    );
  }

  return (
    <Section title="Build an assessment" description="Answer keys stay hidden from students. Use | to separate choices or multiple answers.">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="block md:col-span-2">
            <FieldLabel>Title</FieldLabel>
            <Input required value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
          </label>
          <label className="block">
            <FieldLabel>Subject</FieldLabel>
            <Input required value={meta.subject} onChange={(e) => setMeta({ ...meta, subject: e.target.value })} />
          </label>
          <label className="block">
            <FieldLabel>Grade</FieldLabel>
            <select className={fieldClass} value={meta.gradeLevel} onChange={(e) => setMeta({ ...meta, gradeLevel: Number(e.target.value) })}>
              {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{gradeLabel(g)}</option>)}
            </select>
          </label>
          <label className="block">
            <FieldLabel>Time limit (min)</FieldLabel>
            <Input type="number" min={1} max={240} value={meta.timeLimitMinutes} onChange={(e) => setMeta({ ...meta, timeLimitMinutes: Number(e.target.value) })} />
          </label>
          <label className="block">
            <FieldLabel>Attempts allowed</FieldLabel>
            <Input type="number" min={1} max={10} value={meta.attemptLimit} onChange={(e) => setMeta({ ...meta, attemptLimit: Number(e.target.value) })} />
          </label>
          <label className="block">
            <FieldLabel>Passing score (%)</FieldLabel>
            <Input type="number" min={0} max={100} value={meta.passingScore} onChange={(e) => setMeta({ ...meta, passingScore: Number(e.target.value) })} />
          </label>
          <label className="block">
            <FieldLabel>Status</FieldLabel>
            <select className={fieldClass} value={meta.status} onChange={(e) => setMeta({ ...meta, status: e.target.value as "draft" | "published" })}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </label>
        </div>

        {questions.map((q, index) => (
          <div key={index} className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-[1fr_2fr]">
            <label className="block">
              <FieldLabel>Question {index + 1} type</FieldLabel>
              <select className={fieldClass} value={q.questionType} onChange={(e) => update(index, { questionType: e.target.value as QuestionType })}>
                {QUESTION_TYPES.map((t) => <option key={t} value={t}>{label(t.replace(/_/g, " "))}</option>)}
              </select>
            </label>
            <label className="block">
              <FieldLabel>Prompt</FieldLabel>
              <Input value={q.prompt} onChange={(e) => update(index, { prompt: e.target.value })} />
            </label>
            {["multiple_choice", "multiple_select"].includes(q.questionType) ? (
              <label className="block">
                <FieldLabel>Choices</FieldLabel>
                <Input value={q.options} onChange={(e) => update(index, { options: e.target.value })} placeholder="A | B | C" />
              </label>
            ) : null}
            <label className="block">
              <FieldLabel>Correct answer{q.questionType === "true_false" ? " (true or false)" : ""}</FieldLabel>
              <Input value={q.answer} onChange={(e) => update(index, { answer: e.target.value })} />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <Button type="button" variant="ghost" size="sm" disabled={questions.length === 1} onClick={() => setQuestions((list) => list.filter((_, i) => i !== index))}>
                Remove question
              </Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" size="sm" onClick={() => setQuestions((list) => [...list, { ...EMPTY_QUESTION }])}>Add question</Button>
          <div className="flex items-center gap-3">
            <ErrorNote error={create.error ? new Error(errorText(create.error)) : null} />
            <Button type="submit" disabled={create.isPending || !meta.title.trim()}>Save assessment</Button>
          </div>
        </div>
      </form>
    </Section>
  );
}

function TakeAssessment({ assessmentId, studentId, onDone }: { assessmentId: string; studentId: string; onDone: () => void }) {
  const questions = useActionQuery("list-assessment-questions", { assessmentId });
  const start = useActionMutation("start-assessment-attempt");
  const submit = useActionMutation("submit-assessment-attempt");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ percent: number; passed: boolean; status: string } | null>(null);

  function begin() {
    start.mutate(
      { assessmentId, studentId },
      { onSuccess: (attempt) => attempt && setAttemptId(attempt.id) },
    );
  }

  function set(id: string, value: unknown) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  function finish(event: FormEvent) {
    event.preventDefault();
    if (!attemptId) return;
    submit.mutate({ attemptId, answers }, {
      onSuccess: (data) => data && setResult({ percent: data.percent, passed: data.passed, status: data.status }),
    });
  }

  if (result) {
    return (
      <Section title="Submitted" action={<Button variant="outline" size="sm" onClick={onDone}>Back</Button>}>
        <p className="text-sm text-foreground">
          {result.status === "pending_grading"
            ? "Your tutor will grade the written answers."
            : `You scored ${result.percent}%. ${result.passed ? "You passed." : "Keep practicing and try again."}`}
        </p>
      </Section>
    );
  }

  return (
    <Section title="Take assessment" action={<Button variant="outline" size="sm" onClick={onDone}>Close</Button>}>
      {!attemptId ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Starting an attempt counts toward your limit.</p>
          <Button onClick={begin} disabled={start.isPending}>Start attempt</Button>
          <ErrorNote error={start.error ? new Error(errorText(start.error)) : null} />
        </div>
      ) : (
        <form onSubmit={finish} className="space-y-6">
          {(questions.data ?? []).map((q, index) => (
            <fieldset key={q.id} className="space-y-2">
              <legend className="text-sm font-medium text-foreground">{index + 1}. {q.prompt}</legend>
              {q.questionType === "multiple_choice" || q.questionType === "true_false" ? (
                <div className="flex flex-wrap gap-3">
                  {(q.questionType === "true_false" ? ["true", "false"] : q.options ?? []).map((opt) => (
                    <label key={opt} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                      <input type="radio" name={q.id} value={opt} checked={answers[q.id] === (q.questionType === "true_false" ? opt === "true" : opt)} onChange={() => set(q.id, q.questionType === "true_false" ? opt === "true" : opt)} />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : q.questionType === "multiple_select" ? (
                <div className="flex flex-wrap gap-3">
                  {(q.options ?? []).map((opt) => {
                    const chosen = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
                    return (
                      <label key={opt} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                        <input type="checkbox" checked={chosen.includes(opt)} onChange={(e) => set(q.id, e.target.checked ? [...chosen, opt] : chosen.filter((c) => c !== opt))} />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <Input
                  aria-label={q.prompt}
                  type={q.questionType === "numeric" ? "number" : "text"}
                  step="any"
                  value={(answers[q.id] as string | number | undefined) ?? ""}
                  onChange={(e) => set(q.id, q.questionType === "numeric" ? Number(e.target.value) : e.target.value)}
                />
              )}
            </fieldset>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <ErrorNote error={submit.error ? new Error(errorText(submit.error)) : null} />
            <Button type="submit" disabled={submit.isPending}>Submit answers</Button>
          </div>
        </form>
      )}
    </Section>
  );
}

export default function AssessmentsRoute() {
  const { user } = useCurrentUser();
  const isStaff = user?.role === "tutor" || user?.role === "admin";
  const assessments = useActionQuery("list-assessments", {});
  const attempts = useActionQuery("list-assessment-attempts", {});
  const students = useActionQuery("list-students", {});
  const [taking, setTaking] = useState<string | null>(null);
  const studentId = students.data?.[0]?.id ?? "";
  const titleOf = new Map((assessments.data ?? []).map((a) => [a.id, a.title]));

  return (
    <>
      <PageHeader
        title="Assessments"
        description={isStaff ? "Build checks for understanding and review attempts." : "Check-ins from your tutor. Your best result counts toward progress."}
      />
      {isStaff ? <AssessmentBuilder /> : null}

      {taking ? (
        <div className="mt-6">
          <TakeAssessment key={taking} assessmentId={taking} studentId={studentId} onDone={() => setTaking(null)} />
        </div>
      ) : null}

      <Section title="Available assessments" className="mt-6">
        {(assessments.data ?? []).length === 0 ? (
          <EmptyState title="No assessments yet" />
        ) : (
          <ul className="divide-y divide-border">
            {(assessments.data ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.subject} · {gradeLabel(a.gradeLevel)} · {a.timeLimitMinutes ? `${a.timeLimitMinutes} min` : "No time limit"} · {a.attemptLimit} attempt(s) · pass at {a.passingScore}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  {!isStaff && studentId ? (
                    <Button size="sm" variant="outline" onClick={() => setTaking(a.id)}>Take</Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Attempts and scores" className="mt-6">
        {(attempts.data ?? []).length === 0 ? (
          <EmptyState title="No attempts yet" />
        ) : (
          <ul className="divide-y divide-border">
            {(attempts.data ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="text-foreground">{titleOf.get(a.assessmentId) ?? "Assessment"} · attempt {a.attemptNumber}</span>
                <span className="flex items-center gap-3">
                  {a.status === "graded" ? <span className="font-semibold tabular-nums">{a.percent}%</span> : null}
                  <StatusBadge status={a.status === "graded" ? (a.passed ? "passed" : "rejected") : a.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
