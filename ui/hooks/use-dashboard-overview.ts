"use client";

import * as React from "react";
import { getDashboardOverview } from "@/lib/api/dashboard";
import type { DashboardOverview } from "@/lib/api/dashboard";
import { useAuth } from "@/providers/AuthProvider";

export function useDashboardOverview() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [data, setData] = React.useState<DashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (authLoading || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboardOverview());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setData(null);
      setLoading(false);
      return;
    }
    void refresh();
  }, [authLoading, isAuthenticated, refresh]);

  return { data, loading, error, refresh };
}
