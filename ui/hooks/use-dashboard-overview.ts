"use client";

import * as React from "react";
import { getDashboardOverview } from "@/lib/api/dashboard";
import type { DashboardOverview } from "@/lib/api/dashboard";

export function useDashboardOverview() {
  const [data, setData] = React.useState<DashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboardOverview());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加载数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void refresh(); }, [refresh]);

  return { data, loading, error, refresh };
}
