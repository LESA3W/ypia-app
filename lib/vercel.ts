import "server-only";
import { env } from "./env";
import { fetchWithTimeout } from "./http";
import type { LogEntry } from "./types";

const API = "https://api.vercel.com";

function team() {
  return env.VERCEL_TEAM_ID ? `&teamId=${env.VERCEL_TEAM_ID}` : "";
}

function authHeaders() {
  return { Authorization: `Bearer ${env.VERCEL_TOKEN}` };
}

export interface LogsResult {
  available: boolean;
  logs: LogEntry[];
  note: string;
}

async function getLatestProdDeploymentId(): Promise<string | null> {
  const url = `${API}/v6/deployments?projectId=${env.BOT_PROJECT_ID}&target=production&limit=1${team()}`;
  const res = await fetchWithTimeout(url, { headers: authHeaders(), timeoutMs: 8000 });
  if (!res.ok) return null;
  const json = (await res.json()) as { deployments?: { uid?: string; id?: string }[] };
  const d = json.deployments?.[0];
  return d?.uid || d?.id || null;
}

function normalizeLevel(raw: unknown, status?: number): LogEntry["level"] {
  const s = String(raw || "").toLowerCase();
  if (s.includes("error") || s.includes("fatal")) return "error";
  if (s.includes("warn")) return "warning";
  if (status && status >= 500) return "error";
  if (status && status >= 400) return "warning";
  if (s.includes("info") || s) return "info";
  return "unknown";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRuntimeLog(o: any): LogEntry {
  const ts =
    o.timestamp ?? o.timestampInMs ?? o.created ?? o.time ?? Date.now();
  const status = o.statusCode ?? o.proxy?.statusCode ?? o.status;
  const message =
    o.message ??
    o.text ??
    o.payload?.text ??
    (o.proxy ? `${o.proxy.method ?? ""} ${o.proxy.path ?? ""}`.trim() : "") ??
    "";
  return {
    timestamp: typeof ts === "number" ? ts : Date.parse(String(ts)) || Date.now(),
    level: normalizeLevel(o.level ?? o.type, status),
    message: String(message).slice(0, 1000),
    path: o.path ?? o.requestPath ?? o.proxy?.path,
    status: typeof status === "number" ? status : undefined,
    source: o.source ?? o.type,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Vercel does NOT expose serverless runtime/function logs over the REST API
 * (that needs a Log Drain). What IS reliably available is the deployment history,
 * which is a genuine activity timeline (every push/deploy, status, commit, when).
 * We surface that as the "logs" feed.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getRuntimeLogs(limit = 50): Promise<LogsResult> {
  if (!env.VERCEL_TOKEN) {
    return {
      available: false,
      logs: [],
      note: "VERCEL_TOKEN non configuré. Crée un token sur vercel.com/account/tokens.",
    };
  }
  try {
    const url = `${API}/v6/deployments?projectId=${env.BOT_PROJECT_ID}&limit=${Math.min(
      limit,
      50
    )}${team()}`;
    const res = await fetchWithTimeout(url, { headers: authHeaders(), timeoutMs: 9000 });
    if (!res.ok) {
      return { available: false, logs: [], note: `Déploiements indisponibles (HTTP ${res.status}).` };
    }
    const json = (await res.json()) as { deployments?: any[] };
    const deps = json.deployments || [];
    const logs: LogEntry[] = deps.map((d) => {
      const state = String(d.state || d.readyState || "UNKNOWN");
      const ts = d.createdAt || d.created || d.buildingAt || Date.now();
      const msg =
        d.meta?.githubCommitMessage ||
        d.meta?.gitlabCommitMessage ||
        d.meta?.deploymentMessage ||
        d.name ||
        "deploy";
      const level: LogEntry["level"] =
        state === "ERROR" ? "error" : state === "CANCELED" ? "warning" : "info";
      return {
        timestamp: typeof ts === "number" ? ts : Date.parse(String(ts)) || Date.now(),
        level,
        message: `${state}${d.target ? " · " + d.target : ""}${msg ? " — " + msg : ""}`,
        source: "deploy",
      };
    });
    return {
      available: true,
      logs,
      note: "Historique des déploiements. (Vercel n'expose pas les logs runtime des fonctions via l'API — il faut un Log Drain.)",
    };
  } catch (e) {
    return { available: false, logs: [], note: `Erreur Vercel : ${(e as Error).message.slice(0, 120)}` };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getErrorRate24h(): Promise<{
  total: number;
  errors: number;
  pct: number;
  available: boolean;
}> {
  const { available, logs } = await getRuntimeLogs(500);
  if (!available) return { total: 0, errors: 0, pct: 0, available: false };
  const total = logs.length;
  const errors = logs.filter((l) => l.level === "error").length;
  return { total, errors, pct: total ? (errors / total) * 100 : 0, available: true };
}

export async function pingVercel(): Promise<string> {
  if (!env.VERCEL_TOKEN) throw new Error("VERCEL_TOKEN absent");
  const res = await fetchWithTimeout(
    `${API}/v2/user${env.VERCEL_TEAM_ID ? `?teamId=${env.VERCEL_TEAM_ID}` : ""}`,
    { headers: authHeaders(), timeoutMs: 6000 }
  );
  if (!res.ok) throw new Error(`Vercel ${res.status}`);
  return "ok";
}
