import { useCallback, useEffect, useState } from "react";
import type { PortalRole } from "../design-system.js";

export interface CurrentUserProfile {
  id: string;
  email: string;
  name?: string;
  role: PortalRole | string;
  status?: string;
  timezone?: string;
}

interface UseCurrentUserResult {
  user: CurrentUserProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async (signal?: AbortSignal, showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const init: RequestInit = {
        credentials: "include",
        headers: { Accept: "application/json" },
      };
      if (signal) {
        init.signal = signal;
      }

      const res = await fetch("/api/v1/me", init);

      if (res.status === 401 || res.status === 403) {
        setUser(null);
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load current user (${res.status})`);
      }

      const payload = await res.json();
      const resolvedUser = payload?.data?.user ?? payload?.user ?? null;
      setUser(resolvedUser);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Unable to verify session");
      setUser(null);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchUser(controller.signal, false);
    return () => controller.abort();
  }, [fetchUser]);

  const refresh = useCallback(async () => {
    await fetchUser(undefined, true);
  }, [fetchUser]);

  return { user, loading, error, refresh };
}

export default useCurrentUser;