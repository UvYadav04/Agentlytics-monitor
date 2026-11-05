import type { ComponentStat, SpanRecord, TraceSummary, TraceTree } from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");

export async function fetchTraces(limit: number = 50, offset: number = 0, status?: string): Promise<TraceSummary[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) params.set("status", status);

  const res = await fetch(`${API_BASE}/monitoring/traces?${params.toString()}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("401 Unauthorized: Please log into Quarry to view monitoring traces.");
    }
    throw new Error(`Failed to fetch traces (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return data.traces || [];
}

export async function fetchTraceTree(traceId: string): Promise<TraceTree> {
  const res = await fetch(`${API_BASE}/monitoring/traces/${encodeURIComponent(traceId)}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("401 Unauthorized: Please log into Quarry to view monitoring traces.");
    }
    throw new Error(`Failed to fetch trace ${traceId} (${res.status}): ${res.statusText}`);
  }

  return res.json();
}

export async function fetchComponentStats(sinceHours: number = 24): Promise<ComponentStat[]> {
  const res = await fetch(`${API_BASE}/monitoring/stats?since_hours=${sinceHours}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("401 Unauthorized: Please log into Quarry to view monitoring stats.");
    }
    throw new Error(`Failed to fetch stats (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return data.stats || [];
}

export async function fetchSlowestSpans(limit: number = 20): Promise<SpanRecord[]> {
  const res = await fetch(`${API_BASE}/monitoring/slowest?limit=${limit}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("401 Unauthorized: Please log into Quarry to view slowest spans.");
    }
    throw new Error(`Failed to fetch slowest spans (${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return data.spans || [];
}

