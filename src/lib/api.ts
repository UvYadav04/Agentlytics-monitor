import { emptyTelemetryData } from "./emptyTelemetry";
import { isRealUserRequest } from "./types";
import type {
  ComponentStat,
  DashboardTelemetry,
  SpanRecord,
  TelemetryFilters,
  TraceSummary,
  TraceTree,
} from "./types";

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/monitoring").replace(/\/$/, "");
const INTERNAL_API = `${BASE_PATH}/api/monitoring`;
const EXTERNAL_API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
const DEFAULT_FETCH_TIMEOUT_MS = 15000;

interface FetchJsonResult<T> {
  data: T;
  source: string | null;
}

async function fetchJsonWithTimeout<T = any>(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<FetchJsonResult<T> | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    return {
      data,
      source: res.headers.get("X-Monitoring-Source"),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeOverviewPayload(data: any): DashboardTelemetry {
  return {
    metrics: data.metrics,
    timeline: data.timeline || [],
    componentStats: data.componentStats || [],
    agentStats: data.agentStats || [],
    toolStats: data.toolStats || [],
    llmStatsByCaller: data.llmStatsByCaller || [],
    llmStatsByProvider: data.llmStatsByProvider || [],
    recentTraces: (data.recentTraces || []).filter(isRealUserRequest),
    slowestSpans: data.slowestSpans || [],
  };
}

function hasOverviewData(data: any): boolean {
  if (!data?.metrics) return false;
  return (
    Number(data.metrics.totalTraces || 0) > 0 ||
    Number(data.metrics.totalSpans || 0) > 0 ||
    (Array.isArray(data.recentTraces) && data.recentTraces.length > 0)
  );
}

export async function fetchDashboardOverview(filters?: TelemetryFilters): Promise<DashboardTelemetry> {
  const params = new URLSearchParams();
  if (filters?.sinceHours !== undefined && filters?.sinceHours !== null && filters.sinceHours > 0) {
    params.set("since_hours", String(filters.sinceHours));
  }
  if (filters?.minDurationMs !== undefined && filters?.minDurationMs !== null) {
    params.set("min_duration_ms", String(filters.minDurationMs));
  }
  if (filters?.maxDurationMs !== undefined && filters?.maxDurationMs !== null) {
    params.set("max_duration_ms", String(filters.maxDurationMs));
  }
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : "";

  let internalFallback: DashboardTelemetry | null = null;

  // 1. Try Next.js internal API (queries /app/traces/traces.db directly or proxies to backend)
  const internalRes = await fetchJsonWithTimeout<any>(`${INTERNAL_API}/overview${suffix}`);
  if (internalRes?.data?.metrics) {
    const normalized = normalizeOverviewPayload(internalRes.data);
    // Only trust an empty response from internal API if it came from an authoritative source
    if (
      internalRes.source === "sqlite" ||
      internalRes.source === "backend" ||
      hasOverviewData(internalRes.data)
    ) {
      return normalized;
    }
    internalFallback = normalized;
  }

  // 2. Try FastAPI backend API directly from browser if internal API fell back to empty
  const externalRes = await fetchJsonWithTimeout<any>(`${EXTERNAL_API}/monitoring/overview${suffix}`);
  if (externalRes?.data?.metrics) {
    return normalizeOverviewPayload(externalRes.data);
  }

  // 3. Fallback to clean empty telemetry (0 traces)
  return internalFallback || emptyTelemetryData;
}

export async function fetchTraces(limit: number = 50, offset: number = 0, status?: string): Promise<TraceSummary[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) params.set("status", status);

  // 1. Try Next.js internal route (direct DB or backend proxy)
  const internalRes = await fetchJsonWithTimeout<any>(`${INTERNAL_API}/traces?${params.toString()}`);
  if (internalRes?.data && Array.isArray(internalRes.data.traces)) {
    const filtered = internalRes.data.traces.filter(isRealUserRequest);
    if (
      internalRes.source === "sqlite" ||
      internalRes.source === "backend" ||
      filtered.length > 0
    ) {
      return filtered;
    }
  }

  // 2. Try FastAPI backend directly
  const externalRes = await fetchJsonWithTimeout<any>(`${EXTERNAL_API}/monitoring/traces?${params.toString()}`);
  if (externalRes?.data && Array.isArray(externalRes.data.traces)) {
    return externalRes.data.traces.filter(isRealUserRequest);
  }

  return [];
}

export async function fetchTraceTree(traceId: string): Promise<TraceTree> {
  const encodedId = encodeURIComponent(traceId);

  // 1. Try Next.js internal route (direct DB)
  const internalRes = await fetchJsonWithTimeout<any>(`${INTERNAL_API}/traces/${encodedId}`);
  if (internalRes?.data?.spans && internalRes.data.spans.length > 0) {
    return internalRes.data;
  }

  // 2. Try FastAPI backend
  const externalRes = await fetchJsonWithTimeout<any>(`${EXTERNAL_API}/monitoring/traces/${encodedId}`);
  if (externalRes?.data?.spans && externalRes.data.spans.length > 0) {
    return externalRes.data;
  }

  // Fallback if not found
  return {
    trace_id: traceId,
    total_spans: 0,
    roots: [],
    spans: [],
  };
}

export async function fetchComponentStats(sinceHours: number = 720): Promise<ComponentStat[]> {
  const res = await fetchJsonWithTimeout<any>(`${EXTERNAL_API}/monitoring/stats?since_hours=${sinceHours}`);
  if (res?.data?.stats && Array.isArray(res.data.stats)) {
    return res.data.stats;
  }
  return [];
}

export async function fetchSlowestSpans(limit: number = 20): Promise<SpanRecord[]> {
  const res = await fetchJsonWithTimeout<any>(`${EXTERNAL_API}/monitoring/slowest?limit=${limit}`);
  if (res?.data?.spans && Array.isArray(res.data.spans)) {
    return res.data.spans;
  }
  return [];
}

export async function deleteTraces(traceIds: string[]): Promise<boolean> {
  if (!traceIds || traceIds.length === 0) return true;

  // 1. Try Next.js internal route
  try {
    const res = await fetch(`${INTERNAL_API}/traces`, {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trace_ids: traceIds }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        return true;
      }
    }
  } catch {}

  // 2. Try FastAPI backend route
  try {
    const res = await fetch(`${EXTERNAL_API}/monitoring/traces/bulk-delete`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trace_ids: traceIds }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        return true;
      }
    }
  } catch {}

  return false;
}

export async function deleteSingleTrace(traceId: string): Promise<boolean> {
  return deleteTraces([traceId]);
}

