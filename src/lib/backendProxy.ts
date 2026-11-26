export const MONITORING_SOURCE_HEADER = "X-Monitoring-Source";

export type MonitoringSource = "sqlite" | "backend" | "empty-fallback";

export function getBackendApiBase(): string {
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api"
  ).replace(/\/$/, "");
}

/**
 * Fetches JSON from the FastAPI backend with an explicit abort timeout.
 * Returns null if the backend is unreachable, times out, or returns a non-OK status.
 */
export async function fetchBackendJson<T = any>(
  endpointPath: string,
  options: RequestInit = {},
  timeoutMs: number = 15000
): Promise<T | null> {
  const apiBase = getBackendApiBase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${apiBase}${endpointPath}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
