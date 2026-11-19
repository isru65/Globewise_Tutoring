import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useState, type FormEvent } from "react";

import { EmptyState, ErrorNote, FieldLabel, PageHeader, Section, StatusBadge, fieldClass } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { errorText, formatDate } from "@/lib/globewise";

export function meta() {
  return [{ title: "Syllabus · Globewise Tutoring" }];
}

const FILE_TYPES = ["pdf", "docx", "jpg", "png"] as const;

function UploadForm({ studentId, students }: { studentId: string; students: { id: string; firstName: string; lastName: string }[] }) {
  const create = useActionMutation("create-syllabus-upload");
  const [child, setChild] = useState(studentId);
  const [weekStart, setWeekStart] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const fileType = (extension === "jpeg" ? "jpg" : extension) as (typeof FILE_TYPES)[number];
    create.mutate(
      { studentId: child, weekStart, fileName: file.name, fileType },
      { onSuccess: () => { setFile(null); setWeekStart(""); } },
    );
  }

  return (
    <Section title="Upload this week's school syllabus" description="PDF, DOCX, JPG, or PNG. A tutor reviews every upload before planning.">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-4 md:items-end">
        <label className="block">
          <FieldLabel>Child</FieldLabel>
          <select className={fieldClass} required value={child} onChange={(e) => setChild(e.target.value)}>
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
          <FieldLabel>Syllabus file</FieldLabel>
          <Input type="file" required accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <Button type="submit" disabled={!file || !child || create.isPending}>
          {create.isPending ? "Uploading…" : "Upload syllabus"}
        </Button>
      </form>
      <div className="mt-3">
        <ErrorNote error={create.error ? new Error(errorText(create.error)) : null} />
      </div>
    </Section>
  );
}

function TopicRow({
  topic,
  curriculum,
  locked,
}: {
  topic: { id: string; schoolSubject: string; schoolTopic: string; schoolDate: string; objective: string; curriculumTopicId: string | null; mappingConfirmed: boolean; suggestedTopicId: string | null };
  curriculum: { id: string; title: string; subject: string }[];
  locked: boolean;
}) {
  const update = useActionMutation("update-syllabus-topic");
  return (
    <li className="grid gap-3 py-4 md:grid-cols-[1fr_1fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{topic.schoolTopic}</p>
        <p className="text-xs text-muted-foreground">{topic.schoolSubject} · {topic.schoolDate || "No date"}</p>
        {topic.objective ? <p className="mt-1 text-xs text-muted-foreground">{topic.objective}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <select
          aria-label={`Curriculum topic for ${topic.schoolTopic}`}
          className={fieldClass}
          disabled={locked || update.isPending}
          value={topic.curriculumTopicId ?? topic.suggestedTopicId ?? ""}
          onChange={(e) => update.mutate({ id: topic.id, curriculumTopicId: e.target.value || null })}
        >
          <option value="">Choose a curriculum topic</option>
          {curriculum.map((c) => (
            <option key={c.id} value={c.id}>{c.subject}: {c.title}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        {topic.mappingConfirmed ? (
          <StatusBadge status="approved" />
        ) : (
          <Button size="sm" variant="outline" disabled={locked || update.isPending || !(topic.curriculumTopicId ?? topic.suggestedTopicId)}
            onClick={() => update.mutate({ id: topic.id, curriculumTopicId: topic.curriculumTopicId ?? topic.suggestedTopicId, mappingConfirmed: true })}>
            Confirm
          </Button>
        )}
      </div>
      <div className="md:col-span-3"><ErrorNote error={update.error ? new Error(errorText(update.error)) : null} /></div>
    </li>
  );
}

function ReviewPanel({ uploadId, upload, studentName }: { uploadId: string; upload: { status: string; weekStart: string; fileName: string; studentId: string }; studentName: string }) {
  const topics = useActionQuery("list-syllabus-topics", { uploadId });
  const curriculum = useActionQuery("list-topics", {});
  const addTopic = useActionMutation("create-syllabus-topic");
  const review = useActionMutation("review-syllabus-upload");
  const [draft, setDraft] = useState({ schoolSubject: "", schoolTopic: "", schoolDate: "", objective: "" });
  const [note, setNote] = useState("");
  const locked = upload.status === "approved";
  const list = topics.data ?? [];
  const unconfirmed = list.filter((t) => !t.mappingConfirmed).length;

  function submitTopic(event: FormEvent) {
    event.preventDefault();
    addTopic.mutate({ uploadId, ...draft }, { onSuccess: () => setDraft({ schoolSubject: "", schoolTopic: "", schoolDate: "", objective: "" }) });
  }

  return (
    <Section
      title={`Review: ${studentName}, week of ${formatDate(upload.weekStart)}`}
      description={`${upload.fileName} · Check the original file, correct each topic, then map it to the curriculum.`}
      action={<StatusBadge status={upload.status} />}
    >
      {topics.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading topics…</p>
      ) : list.length === 0 ? (
        <EmptyState title="No school topics yet" description="Add the topics from the original file below." />
      ) : (
        <ul className="divide-y divide-border">
          {list.map((t) => (
            <TopicRow key={t.id} topic={t} curriculum={curriculum.data ?? []} locked={locked} />
          ))}
        </ul>
      )}

      {!locked ? (
        <form onSubmit={submitTopic} className="mt-6 grid gap-3 border-t border-border pt-5 md:grid-cols-4 md:items-end">
          <label className="block">
            <FieldLabel>School subject</FieldLabel>
            <Input required value={draft.schoolSubject} onChange={(e) => setDraft({ ...draft, schoolSubject: e.target.value })} />
          </label>
          <label className="block">
            <FieldLabel>School topic</FieldLabel>
            <Input required value={draft.schoolTopic} onChange={(e) => setDraft({ ...draft, schoolTopic: e.target.value })} />
          </label>
          <label className="block">
            <FieldLabel>Date</FieldLabel>
            <Input value={draft.schoolDate} onChange={(e) => setDraft({ ...draft, schoolDate: e.target.value })} placeholder="Mon 11/9" />
          </label>
          <Button type="submit" variant="outline" disabled={addTopic.isPending}>Add school topic</Button>
          <label className="block md:col-span-4">
            <FieldLabel>Objective</FieldLabel>
            <Input value={draft.objective} onChange={(e) => setDraft({ ...draft, objective: e.target.value })} />
          </label>
        </form>
      ) : null}
      <div className="mt-2"><ErrorNote error={addTopic.error ? new Error(errorText(addTopic.error)) : null} /></div>

      {!locked ? (
        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 md:flex-row md:items-end">
          <label className="block flex-1">
            <FieldLabel>Review note (required to send back)</FieldLabel>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Button variant="outline" disabled={review.isPending || !note.trim()} onClick={() => review.mutate({ id: uploadId, decision: "reject", note })}>
            Send back
          </Button>
          <Button disabled={review.isPending || unconfirmed > 0 || list.length === 0} onClick={() => review.mutate({ id: uploadId, decision: "approve", note: "" })}>
            Approve baseline
          </Button>
        </div>
      ) : null}
      {!locked && unconfirmed > 0 ? <p className="mt-2 text-xs text-muted-foreground">{unconfirmed} mapping(s) to confirm before approval.</p> : null}
      <div className="mt-2"><ErrorNote error={review.error ? new Error(errorText(review.error)) : null} /></div>
    </Section>
  );
}

export default function SyllabusRoute() {
  const { user } = useCurrentUser();
  const uploads = useActionQuery("list-syllabus-uploads", {});
  const students = useActionQuery("list-students", {});
  const [selected, setSelected] = useState<string | null>(null);
  const isParent = user?.role === "parent";
  const isStaff = user?.role === "tutor" || user?.role === "admin";
  const studentById = new Map((students.data ?? []).map((s) => [s.id, s]));
  const current = (uploads.data ?? []).find((u) => u.id === selected);
  const currentStudent = current ? studentById.get(current.studentId) : undefined;

  return (
    <>
      <PageHeader
        title={isParent ? "School syllabus" : "Syllabus review"}
        description={
          isParent
            ? "Upload each week's school syllabus. Your tutor reviews it before planning."
            : "Review parent uploads, correct extracted topics, and map them to the curriculum."
        }
      />
      {isParent ? <UploadForm studentId={students.data?.[0]?.id ?? ""} students={students.data ?? []} /> : null}

      <Section title={isParent ? "Your uploads" : "Upload queue"} className="mt-6">
        {(uploads.data ?? []).length === 0 ? (
          <EmptyState title="No syllabi yet" description={isParent ? "Uploads for each child and week appear here." : "Parent uploads show up here for review."} />
        ) : (
          <ul className="divide-y divide-border">
            {(uploads.data ?? []).map((u) => {
              const s = studentById.get(u.studentId);
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => isStaff && setSelected(u.id)}
                    disabled={!isStaff}
                    className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left disabled:cursor-default aria-selected:text-primary"
                    aria-selected={selected === u.id}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{s ? `${s.firstName} ${s.lastName}` : "Student"} · week of {formatDate(u.weekStart)}</p>
                      <p className="text-xs text-muted-foreground">{u.fileName}</p>
                      {u.reviewNote ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{u.reviewNote}</p> : null}
                    </div>
                    <StatusBadge status={u.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {isStaff && current ? (
        <div className="mt-6">
          <ReviewPanel
            key={current.id}
            uploadId={current.id}
            upload={current}
            studentName={currentStudent ? `${currentStudent.firstName} ${currentStudent.lastName}` : "Student"}
          />
        </div>
      ) : null}
    </>
  );
}
