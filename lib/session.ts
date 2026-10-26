/**
 * Server-side session store + login rate limiter (Upstash Redis).
 *
 * The auth cookie is now a RANDOM session id (not a hash of the password), so it
 * cannot be brute-forced offline, and logout actually revokes it (the id is deleted
 * from Redis). Read directly from process.env so this module stays edge-safe for the
 * proxy/middleware, mirroring lib/auth.ts.
 */
import { Redis } from "@upstash/redis";
import { AUTH_COOKIE, COOKIE_MAX_AGE } from "@/lib/auth";

export { AUTH_COOKIE, COOKIE_MAX_AGE };

let _redis: Redis | null = null;
function redis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: (process.env.KV_REST_API_URL || "").trim(),
      token: (process.env.KV_REST_API_TOKEN || "").trim(),
      automaticDeserialization: false,
    });
  }
  return _redis;
}

const SESSION_PREFIX = "session:";
const SID_RE = /^[0-9a-f]{64}$/;

function newSid(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Create a session, persist it with a TTL, return the opaque id for the cookie. */
export async function createSession(): Promise<string> {
  const sid = newSid();
  await redis().set(`${SESSION_PREFIX}${sid}`, "1", { ex: COOKIE_MAX_AGE });
  return sid;
}

/** True only if the cookie is a well-formed id that still exists in Redis. */
export async function isValidSession(sid: string | undefined | null): Promise<boolean> {
  if (!sid || !SID_RE.test(sid)) return false;
  try {
    return (await redis().get(`${SESSION_PREFIX}${sid}`)) === "1";
  } catch {
    return false;
  }
}

/** Revoke a session (logout). Safe to call with a missing/invalid id. */
export async function destroySession(sid: string | undefined | null): Promise<void> {
  if (!sid || !SID_RE.test(sid)) return;
  try {
    await redis().del(`${SESSION_PREFIX}${sid}`);
  } catch {
    /* ignore */
  }
}

/**
 * Fixed-window login limiter: at most `limit` attempts per `windowSec` per ip.
 * Fails open on a Redis error so a transient outage never locks the owner out.
 */
export async function loginRateLimitOk(ip: string, limit = 5, windowSec = 900): Promise<boolean> {
  try {
    const key = `login:rl:${ip}`;
    const n = Number(await redis().incr(key));
    if (n === 1) await redis().expire(key, windowSec);
    return n <= limit;
  } catch {
    return true;
  }
}
