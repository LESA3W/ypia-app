/**
 * Auth shared by the Edge proxy and Node route handlers.
 * Uses Web Crypto (available in both runtimes). The cookie stores sha256(password),
 * never the password itself, so a leaked cookie does not leak the secret.
 */

export const AUTH_COOKIE = "auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function password(): string {
  return (process.env.DASHBOARD_PASSWORD || "").trim();
}

function allowedEmail(): string {
  return (process.env.ALLOWED_EMAIL || "").trim().toLowerCase();
}

export async function expectedCookieValue(): Promise<string> {
  return sha256Hex(`bot-console::${password()}`);
}

/** Constant-time-ish comparison over equal-length hex strings. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isValidAuthCookie(value: string | undefined | null): Promise<boolean> {
  if (!value || !password()) return false;
  return safeEqual(value, await expectedCookieValue());
}

export async function verifyPassword(input: string): Promise<boolean> {
  const expected = password();
  if (!expected) return false;
  // hash both sides to equal length before compare
  const a = await sha256Hex(input.trim());
  const b = await sha256Hex(expected);
  return safeEqual(a, b);
}

/**
 * Single-account auth: email must match ALLOWED_EMAIL and password must match.
 * Both checks always run (no short-circuit) and use hashed timing-safe compares
 * so a wrong email and a wrong password are indistinguishable to the caller.
 */
export async function verifyCredentials(email: string, pwd: string): Promise<boolean> {
  const expectedEmail = allowedEmail();
  const expectedPwd = password();
  if (!expectedEmail || !expectedPwd) return false;

  const emailA = await sha256Hex((email || "").trim().toLowerCase());
  const emailB = await sha256Hex(expectedEmail);
  const pwdA = await sha256Hex((pwd || "").trim());
  const pwdB = await sha256Hex(expectedPwd);

  const emailOk = safeEqual(emailA, emailB);
  const pwdOk = safeEqual(pwdA, pwdB);
  return emailOk && pwdOk;
}
