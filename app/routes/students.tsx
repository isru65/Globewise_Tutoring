import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";
import { useState, type FormEvent } from "react";

import { EmptyState, ErrorNote, FieldLabel, PageHeader, Section, fieldClass } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { GRADE_OPTIONS, TIMEZONES, errorText, gradeLabel } from "@/lib/globewise";

export function meta() {
  return [{ title: "Students · Globewise Tutoring" }];
}

function RegisterChild() {
  const create = useActionMutation("create-student");
  const [form, setForm] = useState({ firstName: "", lastName: "", gradeLevel: 3, timezone: "America/New_York" });

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate(form, {
      onSuccess: () => setForm((f) => ({ ...f, firstName: "", lastName: "" })),
    });
  }

  return (
    <Section title="Register a child" description="Children are linked to your parent account.">
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-5 md:items-end">
        <label className="block">
          <FieldLabel>First name</FieldLabel>
          <Input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </label>
        <label className="block">
          <FieldLabel>Last name</FieldLabel>
          <Input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
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
          <FieldLabel>Timezone</FieldLabel>
          <select className={fieldClass} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Saving…" : "Register child"}
        </Button>
      </form>
      <div className="mt-3">
        <ErrorNote error={create.error ? new Error(errorText(create.error)) : null} />
      </div>
    </Section>
  );
}

export default function StudentsRoute() {
  const { user } = useCurrentUser();
  const students = useActionQuery("list-students", {});
  const tutors = useActionQuery("list-users", {}, { enabled: user?.role === "admin" });
  const link = useActionMutation("link-student");
  const isParent = user?.role === "parent";
  const isAdmin = user?.role === "admin";
  const activeTutors = (tutors.data ?? []).filter((u) => u.role === "tutor" && u.status === "active");

  return (
    <>
      <PageHeader
        title={isParent ? "Children" : "Students"}
        description={
          isParent
            ? "Register each child, then follow their plans, sessions, and progress."
            : "Students visible to your role. Admins assign tutors and link student logins."
        }
      />
      {isParent ? <RegisterChild /> : null}

      <Section title={isParent ? "Your children" : "Student roster"} className={isParent ? "mt-6" : ""}>
        {(students.data ?? []).length === 0 ? (
          <EmptyState
            title={isParent ? "No children registered" : "No students assigned"}
            description={isParent ? "Use the form above to add your first child." : "Students appear once an admin assigns them."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Grade</th>
                  <th className="py-2 pr-4 font-medium">Timezone</th>
                  <th className="py-2 pr-4 font-medium">Tutor</th>
                  {isAdmin ? <th className="py-2 pr-4 font-medium">Parent</th> : null}
                  <th className="py-2 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(students.data ?? []).map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 pr-4 font-medium text-foreground">{s.firstName} {s.lastName}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{gradeLabel(s.gradeLevel)}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.timezone}</td>
                    <td className="py-3 pr-4">
                      {isAdmin ? (
                        <select
                          aria-label={`Tutor for ${s.firstName}`}
                          className={fieldClass}
                          value={s.tutorEmail ?? ""}
                          disabled={link.isPending}
                          onChange={(e) => link.mutate({ id: s.id, tutorEmail: e.target.value || null })}
                        >
                          <option value="">Unassigned</option>
                          {activeTutors.map((t) => (
                            <option key={t.id} value={t.email}>{t.name || t.email}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-muted-foreground">{s.tutorEmail ?? "Unassigned"}</span>
                      )}
                    </td>
                    {isAdmin ? <td className="py-3 pr-4 text-muted-foreground">{s.parentEmail}</td> : null}
                    <td className="py-3">
                      <a href={`/progress?student=${s.id}`} className="text-sm font-medium text-primary hover:underline">
                        View report
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3">
          <ErrorNote error={link.error ? new Error(errorText(link.error)) : null} />
        </div>
      </Section>
    </>
  );
}
