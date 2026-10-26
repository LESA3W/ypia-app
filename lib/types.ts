export type RoutineKey = "sleep_test" | "nuit" | "matin" | "lait";

export type RoutineStatus =
  | "confirmed" // confirmed today
  | "pending" // window not opened yet
  | "in-window" // window open now, not confirmed
  | "fired-unconfirmed" // fired today but no confirmation row
  | "missed"; // window closed, never confirmed

export interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
  /** set when this user message was sent as a voice note (audio is playable) */
  voiceId?: string;
  durationMs?: number;
  /** set when this user message was a photo sent from the dashboard (viewable) */
  photoId?: string;
  /** epoch ms when the message was stored (added by the bot; absent on legacy messages) */
  ts?: number;
  hasImage?: boolean;
  index: number;
}

export interface QStashSchedule {
  scheduleId: string;
  cron: string;
  destination: string;
  routineKey?: RoutineKey | string;
  prompt?: string;
  rawBody?: string;
  createdAt?: number;
  paused?: boolean;
}

export interface QStashEvent {
  time: number;
  state: string;
  messageId?: string;
  error?: string;
}

export interface EnrichedSchedule {
  scheduleId: string;
  cron: string;
  cronLA: string;
  destination: string;
  routineKey: string | null;
  label: string;
  desc: string;
  prompt: string;
  paused: boolean;
  nextFireMs: number | null;
  lastFireMs: number | null;
  status: RoutineStatus | "unknown";
  confirmedDate: string | null;
  isDue: boolean;
}

export interface RoutineView {
  key: RoutineKey;
  label: string;
  cron: string; // UTC
  scheduleId: string | null;
  confirmedToday: boolean;
  confirmedDate: string | null;
  status: RoutineStatus;
  lastFireMs: number | null; // only reliable for the most-recently-fired routine
  isLastFired: boolean;
  windowLabelLA: string;
}

export interface LogEntry {
  timestamp: number;
  level: "error" | "warning" | "info" | "unknown";
  message: string;
  path?: string;
  status?: number;
  source?: string;
}

export interface CostEstimate {
  messageCount: number;
  userMsgs: number;
  assistantMsgs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedUsd: number;
  isEstimate: boolean;
  assumptions: Record<string, number>;
}

export interface OverviewSnapshot {
  lastIn: HistoryEntry | null;
  lastOut: HistoryEntry | null;
  routines: RoutineView[];
  errorRate: { total: number; errors: number; pct: number; available: boolean };
  cost: CostEstimate;
  readingCount: number;
  alerts: string[];
  generatedAt: number;
  partial: { logs: boolean };
}

export interface PingResult {
  target: string;
  ok: boolean;
  latencyMs: number;
  detail: string;
}
