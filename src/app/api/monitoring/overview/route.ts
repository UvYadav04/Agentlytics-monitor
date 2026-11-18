import { NextResponse } from "next/server";
import { emptyTelemetryData } from "@/lib/emptyTelemetry";
import { queryDashboardOverviewFromDb } from "@/lib/sqliteTraces";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. First priority: Read directly from mounted volume /app/traces/traces.db
    const dbData = queryDashboardOverviewFromDb();
    if (dbData && dbData.metrics) {
      return NextResponse.json(dbData);
    }

    // 2. Second priority: Proxy to backend API if configured and reachable
    const apiBase = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${apiBase}/monitoring/overview`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json && json.metrics) {
          return NextResponse.json(json);
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

