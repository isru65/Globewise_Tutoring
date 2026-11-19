import { useActionMutation, useActionQuery } from "@agent-native/core/client/hooks";

import { EmptyState, ErrorNote, PageHeader, Section, StatusBadge } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { errorText, formatDate } from "@/lib/globewise";

export function meta() {
  return [{ title: "Billing · Globewise Tutoring" }];
}

function money(cents: number, interval: string) {
  return `$${(cents / 100).toFixed(2)} / ${interval}`;
}

export default function BillingRoute() {
  const { user } = useCurrentUser();
  const canSubscribe = user?.role === "parent" || user?.role === "admin";
  const plans = useActionQuery("list-subscription-plans", {});
  const subscriptions = useActionQuery("list-subscriptions", {});
  const subscribe = useActionMutation("subscribe");

  return (
    <>
      <PageHeader
        title="Billing & subscription"
        description="Choose a plan for your family. Payment collection is not connected yet, so starting a plan creates a local subscription record only."
      />

      <Section title="Plans">
        {(plans.data ?? []).length === 0 ? (
          <EmptyState title="No plans available" />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {(plans.data ?? []).map((plan) => (
              <div key={plan.id} className="flex flex-col rounded-lg border border-border bg-background p-5">
                <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{money(plan.priceCents, plan.billingInterval)}</p>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{plan.description}</p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li>Up to {plan.studentLimit} student(s)</li>
                  <li>{plan.sessionAllowance} tutoring session(s) included</li>
                  {plan.trialDays > 0 ? <li>{plan.trialDays}-day free trial</li> : null}
                </ul>
                {canSubscribe ? (
                  <Button
                    className="mt-4"
                    variant="outline"
                    disabled={subscribe.isPending}
                    onClick={() => subscribe.mutate({ planId: plan.id })}
                  >
                    Choose {plan.name}
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <ErrorNote error={subscribe.error ? new Error(errorText(subscribe.error)) : null} />
        </div>
      </Section>

      <Section title="Your subscriptions" className="mt-6">
        {(subscriptions.data ?? []).length === 0 ? (
          <EmptyState title="No subscription yet" description="Choose a plan above to get started." />
        ) : (
          <ul className="divide-y divide-border">
            {(subscriptions.data ?? []).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{row.planName}</p>
                  <p className="text-xs text-muted-foreground">
                    {money(row.priceCents, row.billingInterval)} · Current period ends {formatDate(row.currentPeriodEnd)}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
