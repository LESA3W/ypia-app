import "server-only";

/**
 * Centralized, server-only env access. Never import this from a client component.
 * Reads are lazy so a single missing non-critical var doesn't crash unrelated routes.
 */

function read(name: string): string {
  return (process.env[name] || "").trim();
}

export const env = {
  get KV_REST_API_URL() {
    return read("KV_REST_API_URL");
  },
  get KV_REST_API_TOKEN() {
    return read("KV_REST_API_TOKEN");
  },
  get QSTASH_URL() {
    return read("QSTASH_URL");
  },
  get QSTASH_TOKEN() {
    return read("QSTASH_TOKEN");
  },
  get ANTHROPIC_API_KEY() {
    return read("ANTHROPIC_API_KEY");
  },
  get ANTHROPIC_ADMIN_KEY() {
    return read("ANTHROPIC_ADMIN_KEY");
  },
  get GROQ_API_KEY() {
    return read("GROQ_API_KEY");
  },
  get TELEGRAM_BOT_TOKEN() {
    return read("TELEGRAM_BOT_TOKEN");
  },
  get CRON_SECRET() {
    return read("CRON_SECRET");
  },
  get VERCEL_TOKEN() {
    return read("VERCEL_TOKEN");
  },
  get VERCEL_PROJECT_ID() {
    return read("VERCEL_PROJECT_ID");
  },
  // Vercel reserves VERCEL_PROJECT_ID (overrides it at runtime with the CURRENT
  // project's id). Use BOT_PROJECT_ID to point at the bot project for logs.
  get BOT_PROJECT_ID() {
    return read("BOT_PROJECT_ID") || read("VERCEL_PROJECT_ID");
  },
  get VERCEL_TEAM_ID() {
    return read("VERCEL_TEAM_ID");
  },
  get BOT_BASE_URL() {
    return read("BOT_BASE_URL");
  },
  get BOT_USER_ID() {
    return read("BOT_USER_ID");
  },
  get ANTHROPIC_MODEL() {
    return read("ANTHROPIC_MODEL") || "claude-haiku-4-5-20251001";
  },
  get DASHBOARD_PASSWORD() {
    return read("DASHBOARD_PASSWORD");
  },
};

/** Names surfaced (masked) on the /settings page. Never expose values. */
export const TRACKED_ENV_VARS: { name: string; secret: boolean; group: string }[] = [
  { name: "KV_REST_API_URL", secret: false, group: "Redis" },
  { name: "KV_REST_API_TOKEN", secret: true, group: "Redis" },
  { name: "QSTASH_URL", secret: false, group: "QStash" },
  { name: "QSTASH_TOKEN", secret: true, group: "QStash" },
  { name: "ANTHROPIC_API_KEY", secret: true, group: "Anthropic" },
  { name: "ANTHROPIC_MODEL", secret: false, group: "Anthropic" },
  { name: "TELEGRAM_BOT_TOKEN", secret: true, group: "Telegram" },
  { name: "GROQ_API_KEY", secret: true, group: "Voice" },
  { name: "CRON_SECRET", secret: true, group: "Bot" },
  { name: "BOT_BASE_URL", secret: false, group: "Bot" },
  { name: "BOT_USER_ID", secret: false, group: "Bot" },
  { name: "VERCEL_TOKEN", secret: true, group: "Vercel" },
  { name: "VERCEL_PROJECT_ID", secret: false, group: "Vercel" },
  { name: "VERCEL_TEAM_ID", secret: false, group: "Vercel" },
  { name: "DASHBOARD_PASSWORD", secret: true, group: "Dashboard" },
];
