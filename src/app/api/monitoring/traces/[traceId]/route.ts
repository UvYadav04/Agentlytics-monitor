import { NextRequest, NextResponse } from "next/server";
import { fetchBackendJson } from "@/lib/backendProxy";
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
    const backendJson = await fetchBackendJson<any>(
      `/monitoring/traces/${encodeURIComponent(traceId)}`,
      {},
      15000
    );
    if (backendJson && backendJson.spans && backendJson.spans.length > 0) {
      return NextResponse.json(backendJson);
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
    const backendJson = await fetchBackendJson<any>(
      `/monitoring/traces/${encodeURIComponent(traceId)}`,
      { method: "DELETE" },
      10000
    );
    if (backendJson) {
      backendSuccess = true;
      if (typeof backendJson.deleted === "number") {
        backendDeletedSpans = backendJson.deleted;
      }
    }

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


