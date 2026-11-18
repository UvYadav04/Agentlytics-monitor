import { NextRequest, NextResponse } from "next/server";
import { queryTraceTreeFromDb } from "@/lib/sqliteTraces";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { traceId: string } }
) {
  try {
    const traceId = params.traceId;

    // 1. Direct from bound volume /app/traces/traces.db
    const treeFromDb = queryTraceTreeFromDb(traceId);
    if (treeFromDb && treeFromDb.spans.length > 0) {
      return NextResponse.json(treeFromDb);
    }

    // 2. Proxy to backend API if available
    const apiBase = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${apiBase}/monitoring/traces/${encodeURIComponent(traceId)}`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json && json.spans && json.spans.length > 0) {
          return NextResponse.json(json);
        }
      }
    } catch {
      // Backend offline
    }

    return NextResponse.json(
      { error: "Trace not found", trace_id: traceId, total_spans: 0, roots: [], spans: [] },
      { status: 404 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

