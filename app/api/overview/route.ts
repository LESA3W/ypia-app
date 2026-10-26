import { NextResponse } from "next/server";
import {
  getAllHistory,
  getLastInOut,
  getReadingCount,
  getLastRoutineKey,
  getLastRoutineFireMs,
  getAllRoutineConfirmed,
  getHeartbeatMs,
} from "@/lib/kv";
import { getRuntimeLogs } from "@/lib/vercel";
import { estimateCost } from "@/lib/anthropic-cost";
import { getRealCostToday } from "@/lib/anthropic-usage";
import {
  ROUTINE_KEYS,
  ROUTINE_CRONS,
  ROUTINE_LABELS,
  computeRoutineStatus,
  windowLabelLA,
  ROUTINE_STATUS_META,
} from "@/lib/routines";
import type { OverviewSnapshot, RoutineView } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const now = new Date();

  const [history, inOut, readingCount, lastKey, lastFireMs, confirmed, logsResult, realCost] =
    await Promise.all([
      getAllHistory().catch(() => []),
      getLastInOut().catch(() => ({ lastIn: null, lastOut: null })),
      getReadingCount().catch(() => 0),
      getLastRoutineKey().catch(() => null),
      getLastRoutineFireMs().catch(() => null),
      getAllRoutineConfirmed([...ROUTINE_KEYS]).catch(
        () => ({}) as Record<string, string | null>
      ),
      getRuntimeLogs(500).catch(() => ({ available: false, logs: [], note: "" })),
      getRealCostToday().catch(() => null),
    ]);

  const heartbeatMs = await getHeartbeatMs().catch(() => null);

  const logs = logsResult.logs;
  const errorRate = {
    total: logs.length,
    errors: logs.filter((l) => l.level === "error").length,
    pct: logs.length ? (logs.filter((l) => l.level === "error").length / logs.length) * 100 : 0,
    available: logsResult.available,
  };
  const lastActivityMs = logsResult.available && logs.length ? logs[0].timestamp : null;

  const routines: RoutineView[] = ROUTINE_KEYS.map((key) => {
    const { status, isLastFired } = computeRoutineStatus({
      key,
      lastRoutineKey: lastKey,
      lastFireMs,
      confirmedDate: confirmed[key] ?? null,
      now,
    });
    return {
      key,
      label: ROUTINE_LABELS[key],
      cron: ROUTINE_CRONS[key],
      scheduleId: null,
      confirmedToday: status === "confirmed",
      confirmedDate: confirmed[key] ?? null,
      status,
      lastFireMs: isLastFired ? lastFireMs : null,
      isLastFired,
      windowLabelLA: windowLabelLA(key, now),
    };
  });

  const alerts: string[] = [];
  for (const r of routines) {
    if (r.status === "missed") {
      alerts.push(`Routine ${r.label} non tirée dans sa fenêtre ${r.windowLabelLA} ⚠️`);
    }
  }
  // last activity signal comes from Vercel logs (history has no timestamps)
  if (lastActivityMs && Date.now() - lastActivityMs > 3 * 3600_000) {
    const h = Math.round((Date.now() - lastActivityMs) / 3600_000);
    alerts.push(`Bot silencieux depuis ${h}h ⚠️`);
  }

  const estimate = estimateCost(history);
  const cost = realCost
    ? { ...estimate, estimatedUsd: realCost.usd, isEstimate: false as const }
    : estimate;

  const snapshot: OverviewSnapshot = {
    lastIn: inOut.lastIn,
    lastOut: inOut.lastOut,
    routines,
    errorRate,
    cost,
    readingCount,
    alerts,
    generatedAt: Date.now(),
    partial: { logs: !errorRate.available },
  };

  return NextResponse.json({
    ...snapshot,
    lastActivityMs,
    heartbeatMs,
    costIsReal: !!realCost,
    statusMeta: ROUTINE_STATUS_META,
  });
}
