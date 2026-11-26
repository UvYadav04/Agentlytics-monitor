import { NextRequest, NextResponse } from "next/server";
import { fetchBackendJson, MONITORING_SOURCE_HEADER } from "@/lib/backendProxy";
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
      return NextResponse.json(dbData, {
        headers: { [MONITORING_SOURCE_HEADER]: "sqlite" },
      });
    }

    // 2. Second priority: Proxy to backend API if configured and reachable
    const qs = searchParams.toString();
    const backendData = await fetchBackendJson<any>(
      `/monitoring/overview${qs ? `?${qs}` : ""}`,
      {},
      15000
    );
    if (backendData && backendData.metrics) {
      return NextResponse.json(
        {
          ...emptyTelemetryData,
          ...backendData,
        },
        { headers: { [MONITORING_SOURCE_HEADER]: "backend" } }
      );
    }

    // 3. Fallback: Clean empty state with 0 traces
    return NextResponse.json(emptyTelemetryData, {
      headers: { [MONITORING_SOURCE_HEADER]: "empty-fallback" },
    });
  } catch {
    return NextResponse.json(emptyTelemetryData, {
      status: 200,
      headers: { [MONITORING_SOURCE_HEADER]: "empty-fallback" },
    });
  }
}

