"use client";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "unauthorized");
  }
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text)?.error || text;
    } catch {
      /* keep text */
    }
    throw new ApiError(res.status, msg);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
};

export async function apiMutate<T = unknown>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text)?.error || text;
    } catch {
      /* keep text */
    }
    throw new ApiError(res.status, msg || `HTTP ${res.status}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
