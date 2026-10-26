"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { fetcher } from "@/lib/fetcher";

/**
 * SWR poll that pauses while the tab is hidden (saves Upstash/Vercel quota).
 * refreshInterval=0 disables polling (use for mutate-on-action pages).
 */
export function usePoll<T = unknown>(
  key: string | null,
  refreshInterval = 0,
  config?: SWRConfiguration
) {
  return useSWR<T>(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    keepPreviousData: true,
    dedupingInterval: 2000,
    ...config,
  });
}
