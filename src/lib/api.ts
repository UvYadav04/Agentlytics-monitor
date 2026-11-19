import { emptyTelemetryData } from "./emptyTelemetry";
import { isRealUserRequest } from "./types";
import type { ComponentStat, DashboardTelemetry, SpanRecord, TraceSummary, TraceTree } from "./types";

const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/monitoring").replace(/\/$/, "");
const INTERNAL_API = `${BASE_PATH}/api/monitoring`;
const EXTERNAL_API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

export async function fetchDashboardOverview(): Promise<DashboardTelemetry> {
  // 1. Try Next.js internal API (queries /app/traces/traces.db directly)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${INTERNAL_API}/overview`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.metrics) {
        return {
          metrics: data.metrics,
          timeline: data.timeline || [],
          componentStats: data.componentStats || [],
          recentTraces: (data.recentTraces || []).filter(isRealUserRequest),
          slowestSpans: data.slowestSpans || [],
        };
      }
    }
  } catch {}

  // 2. Try FastAPI backend API (queries /app/traces/traces.db via storage.py)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${EXTERNAL_API}/monitoring/overview`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.metrics) {
        return {
          metrics: data.metrics,
          timeline: data.timeline || [],
          componentStats: data.componentStats || [],
          recentTraces: (data.recentTraces || []).filter(isRealUserRequest),
          slowestSpans: data.slowestSpans || [],
        };
      }
    }
  } catch {}

  // 3. Fallback to clean empty telemetry (0 traces)
  return emptyTelemetryData;
}

export async function fetchTraces(limit: number = 50, offset: number = 0, status?: string): Promise<TraceSummary[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) params.set("status", status);

  // 1. Try Next.js internal route (direct DB)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${INTERNAL_API}/traces?${params.toString()}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.traces)) {
        return data.traces.filter(isRealUserRequest);
      }
    }
  } catch {}

  // 2. Try FastAPI backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${EXTERNAL_API}/monitoring/traces?${params.toString()}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.traces)) {
        return data.traces.filter(isRealUserRequest);
      }
    }
  } catch {}

  return [];
}

export async function fetchTraceTree(traceId: string): Promise<TraceTree> {
  // 1. Try Next.js internal route (direct DB)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${INTERNAL_API}/traces/${encodeURIComponent(traceId)}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.spans && data.spans.length > 0) {
        return data;
      }
    }
  } catch {}

  // 2. Try FastAPI backend
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${EXTERNAL_API}/monitoring/traces/${encodeURIComponent(traceId)}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.spans && data.spans.length > 0) {
        return data;
      }
    }
  } catch {}

  // Fallback if not found
  return {
    trace_id: traceId,
    total_spans: 0,
    roots: [],
    spans: [],
  };
}

export async function fetchComponentStats(sinceHours: number = 720): Promise<ComponentStat[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${EXTERNAL_API}/monitoring/stats?since_hours=${sinceHours}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.stats && Array.isArray(data.stats)) {
        return data.stats;
      }
    }
  } catch {}

  return [];
}

export async function fetchSlowestSpans(limit: number = 20): Promise<SpanRecord[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${EXTERNAL_API}/monitoring/slowest?limit=${limit}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.spans && Array.isArray(data.spans)) {
        return data.spans;
      }
    }
  } catch {}

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
      return true;
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
      return true;
    }
  } catch {}

  return false;
}

export async function deleteSingleTrace(traceId: string): Promise<boolean> {
  return deleteTraces([traceId]);
}

