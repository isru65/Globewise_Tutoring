import { useSearchParams } from "react-router";

import { EmptyState, PageHeader } from "@/components/app/primitives";

export function meta() {
  return [{ title: "Coming soon · Globewise Tutoring" }];
}

export default function ComingSoonRoute() {
  const [params] = useSearchParams();
  const item = params.get("item") ?? "This section";
  return (
    <>
      <PageHeader title={item} />
      <EmptyState title="Coming in a later update" description="This area is planned and will be added in a follow-up." />
    </>
  );
}
