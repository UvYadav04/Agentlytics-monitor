import { NextRequest, NextResponse } from "next/server";
import { deleteTracesFromDb, queryTraceTreeFromDb } from "@/lib/sqliteTraces";

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { traceId: string } }
) {
  try {
    const traceId = params.traceId;
    if (!traceId) {
      return NextResponse.json({ error: "No traceId provided" }, { status: 400 });
    }

    // 1. Delete from local SQLite
    const dbResult = deleteTracesFromDb([traceId]);

    // 2. Also proxy to backend API if configured
    let backendSuccess = false;
    let backendDeletedSpans = 0;
    const apiBase = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${apiBase}/monitoring/traces/${encodeURIComponent(traceId)}`, {
        method: "DELETE",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        backendSuccess = true;
        const json = await res.json().catch(() => null);
        if (json && typeof json.deleted === "number") {
          backendDeletedSpans = json.deleted;
        }
      }
    } catch {}

    if (!dbResult.success && !backendSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to delete trace. SQLite error: ${dbResult.error || "Unknown"}. Backend API was unreachable. Ensure traces volume is mounted read-write and directory has write permissions.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_trace_id: traceId,
      deleted_spans_count: Math.max(dbResult.deletedCount, backendDeletedSpans),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete trace" }, { status: 500 });
  }
}


