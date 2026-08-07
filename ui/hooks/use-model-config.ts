import useSWR from "swr";

import {
  listAllModelProviders,
  type ModelProviderInfo,
} from "@/lib/api/model-config";

export function useModelConfig() {
  const swr = useSWR<ModelProviderInfo[]>("model-config/all", async () => {
    const result = await listAllModelProviders();
    return result.data ?? [];
  });

  return {
    providers: swr.data ?? [],
    isLoading: swr.isLoading,
    error: swr.error,
    mutate: swr.mutate,
  };
}
