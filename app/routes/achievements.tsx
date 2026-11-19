import { useActionQuery } from "@agent-native/core/client/hooks";

import { EmptyState, PageHeader, Section, StatCard } from "@/components/app/primitives";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/globewise";

export function meta() {
  return [{ title: "Achievements · Globewise Tutoring" }];
}

export default function AchievementsRoute() {
  const students = useActionQuery("list-students", {});
  const studentId = students.data?.[0]?.id ?? "";
  const data = useActionQuery("get-achievements", { studentId }, { enabled: Boolean(studentId) });
  const achievements = data.data;

  return (
    <>
      <PageHeader title="Achievements" description="Points, levels, badges, and your learning streak." />
      {achievements ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Level" value={achievements.level} hint={`${achievements.pointsToNextLevel} points to next level`} />
            <StatCard label="Points" value={achievements.totalPoints.toLocaleString()} />
            <StatCard label="Learning streak" value={`${achievements.streakDays} day${achievements.streakDays === 1 ? "" : "s"}`} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <Section title="Badges">
              {achievements.badges.length === 0 ? (
                <EmptyState title="No badges configured yet" />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {achievements.badges.map((badge) => (
                    <li
                      key={badge.id}
                      className={cn(
                        "rounded-md border p-4",
                        badge.earned ? "border-primary/30 bg-primary/5" : "border-border opacity-60",
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground">{badge.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{badge.description}</p>
                      <p className="mt-2 text-xs font-medium text-muted-foreground">
                        {badge.earned ? "Earned" : `Unlocks at ${badge.pointsRequired} points`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Recent activity">
              {achievements.recentActivity.length === 0 ? (
                <EmptyState title="No activity yet" description="Complete lessons and assessments to earn points." />
              ) : (
                <ul className="divide-y divide-border">
                  {achievements.recentActivity.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                      <span className="min-w-0">
                        <span className="block text-foreground">{row.reason}</span>
                        <span className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-primary">+{row.pointsDelta}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Loading achievements…</p>
      )}
    </>
  );
}
