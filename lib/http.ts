import "server-only";

export class HttpError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string, url: string) {
    super(`HTTP ${status} on ${url}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

interface FetchOpts extends RequestInit {
  timeoutMs?: number;
}

/** fetch with timeout + non-2xx throw. Returns the raw Response. */
export async function fetchWithTimeout(url: string, opts: FetchOpts = {}): Promise<Response> {
  const { timeoutMs = 8000, ...init } = opts;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(t);
  }
}

/** fetch + JSON parse + throw on non-2xx. */
export async function fetchJson<T = unknown>(url: string, opts: FetchOpts = {}): Promise<T> {
  const res = await fetchWithTimeout(url, opts);
  const text = await res.text();
  if (!res.ok) throw new HttpError(res.status, text, url);
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
