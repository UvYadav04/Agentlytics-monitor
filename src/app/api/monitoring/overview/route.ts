import { NextRequest, NextResponse } from "next/server";
import { emptyTelemetryData } from "@/lib/emptyTelemetry";
import { queryDashboardOverviewFromDb } from "@/lib/sqliteTraces";
import type { TelemetryFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseOptionalNumber(val: string | null): number | null {
  if (val === null || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters: TelemetryFilters = {
      sinceHours: parseOptionalNumber(searchParams.get("since_hours")),
      minDurationMs: parseOptionalNumber(searchParams.get("min_duration_ms")),
      maxDurationMs: parseOptionalNumber(searchParams.get("max_duration_ms")),
    };

    // 1. First priority: Read directly from mounted volume /app/traces/traces.db
    const dbData = queryDashboardOverviewFromDb(filters);
    if (dbData && dbData.metrics) {
      return NextResponse.json(dbData);
    }

    // 2. Second priority: Proxy to backend API if configured and reachable
    const apiBase = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const qs = searchParams.toString();
      const res = await fetch(`${apiBase}/monitoring/overview${qs ? `?${qs}` : ""}`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json && json.metrics) {
          return NextResponse.json({
            ...emptyTelemetryData,
            ...json,
          });
        }
      }
    } catch {
      // Backend API not reachable
    }

    // 3. Fallback: Clean empty state with 0 traces
    return NextResponse.json(emptyTelemetryData);
  } catch (err: any) {
    return NextResponse.json(emptyTelemetryData, { status: 200 });
  }
}

