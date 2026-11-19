import { useActionQuery } from "@agent-native/core/client/hooks";

import type { AppRole } from "@/lib/globewise";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  status: string;
};

export function useCurrentUser() {
  const query = useActionQuery("get-current-user", {}, { method: "POST" });
  return {
    ...query,
    user: query.data as CurrentUser | undefined,
  };
}
