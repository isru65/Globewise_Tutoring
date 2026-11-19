import { useActionQuery } from "@agent-native/core/client/hooks";
import { Link } from "react-router";

import { EmptyState, PageHeader, Section, StatCard, StatusBadge } from "@/components/app/primitives";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatDate, formatDateTime, gradeLabel, ROLE_LABELS } from "@/lib/globewise";

export function meta() {
  return [{ title: "Dashboard · Globewise Tutoring" }];
}

export default function DashboardRoute() {
  const { user } = useCurrentUser();
  const students = useActionQuery("list-students", {});
  const sessions = useActionQuery("list-sessions", {});
  const plans = useActionQuery("list-learning-plans", {});
  const uploads = useActionQuery("list-syllabus-uploads", {});
  const notifications = useActionQuery("list-notifications", { limit: 5 });

  const now = Date.now();
  const studentList = students.data ?? [];
  const names = new Map(studentList.map((s) => [s.id, `${s.firstName} ${s.lastName}`]));
  const upcoming = (sessions.data ?? [])
    .filter((s) => new Date(s.startsAt).getTime() >= now && s.status !== "cancelled")
    .slice(0, 5);
  const activePlans = (plans.data ?? []).filter((p) =>
    ["published", "in_progress"].includes(p.status),
  );
  const pendingReviews = (uploads.data ?? []).filter((u) => u.status === "pending_review");
  const isStaff = user?.role === "tutor" || user?.role === "admin";

  return (
    <>
      <PageHeader
        title={`Welcome back${user?.name ? `, ${user.name}` : ""}`}
        description={user ? `${ROLE_LABELS[user.role]} workspace · Here is what needs attention this week.` : ""}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={user?.role === "parent" ? "Children" : "Students"}
          value={studentList.length}
          hint={user?.role === "parent" ? "Linked to your account" : "Visible to you"}
        />
        <StatCard label="Upcoming sessions" value={upcoming.length} hint="Next five shown below" />
        <StatCard label="Active plans" value={activePlans.length} hint="Published or in progress" />
        {isStaff ? (
          <StatCard label="Syllabi to review" value={pendingReviews.length} hint="Awaiting tutor review" />
        ) : (
          <StatCard label="Unread updates" value={(notifications.data ?? []).filter((n) => !n.read).length} hint="Notifications" />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Section
          title="Upcoming sessions"
          description="Times shown in your local timezone"
          action={
            <Link to="/sessions" className="text-xs font-medium text-primary hover:underline">
              View schedule
            </Link>
          }
          className="lg:col-span-2"
        >
          {upcoming.length === 0 ? (
            <EmptyState title="No upcoming sessions" description="Scheduled tutoring sessions appear here." />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {s.subject}
                      {s.topic ? ` · ${s.topic}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {names.get(s.studentId) ?? "Student"} · {formatDateTime(s.startsAt, s.timezone)}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Recent notifications" action={<Link to="/notifications" className="text-xs font-medium text-primary hover:underline">All</Link>}>
          {(notifications.data ?? []).length === 0 ? (
            <EmptyState title="You are all caught up" />
          ) : (
            <ul className="space-y-3">
              {(notifications.data ?? []).map((n) => (
                <li key={n.id} className="text-sm">
                  <p className="font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Learners" className="mt-6" action={<Link to="/students" className="text-xs font-medium text-primary hover:underline">Manage</Link>}>
        {studentList.length === 0 ? (
          <EmptyState title="No students yet" description="Register a child to start their learning plan." />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {studentList.map((s) => (
              <Link key={s.id} to={`/progress?student=${s.id}`} className="rounded-md border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
                <p className="text-sm font-medium text-foreground">{s.firstName} {s.lastName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {gradeLabel(s.gradeLevel)} · Joined {formatDate(s.createdAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
