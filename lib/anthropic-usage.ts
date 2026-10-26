import "server-only";
import { env } from "./env";
import { fetchWithTimeout } from "./http";

/**
 * Real Anthropic spend for "today" (UTC) via the Organization Cost API.
 * Requires an ADMIN API key (sk-ant-admin...) in ANTHROPIC_ADMIN_KEY — the regular
 * message key cannot access it. Returns null when unavailable so callers fall back
 * to the estimate.
 */
export interface RealCost {
  usd: number;
  available: true;
}

function startOfTodayUtcISO(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  return d.toISOString();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function sumAmounts(node: any): number {
  let total = 0;
  if (node == null) return 0;
  if (Array.isArray(node)) {
    for (const x of node) total += sumAmounts(x);
    return total;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if ((k === "amount" || k === "cost") && (typeof v === "string" || typeof v === "number")) {
        const n = typeof v === "number" ? v : parseFloat(v);
        if (Number.isFinite(n)) total += n;
      } else {
        total += sumAmounts(v);
      }
    }
  }
  return total;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getRealCostToday(): Promise<RealCost | null> {
  const key = env.ANTHROPIC_ADMIN_KEY;
  if (!key) return null;
  try {
    const url = `https://api.anthropic.com/v1/organizations/cost_report?starting_at=${encodeURIComponent(
      startOfTodayUtcISO()
    )}&bucket_width=1d`;
    const res = await fetchWithTimeout(url, {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      timeoutMs: 9000,
    });
    if (!res.ok) return null;
    const json = await res.json();
    const usd = sumAmounts(json);
    if (!Number.isFinite(usd)) return null;
    return { usd, available: true };
  } catch {
    return null;
  }
}
