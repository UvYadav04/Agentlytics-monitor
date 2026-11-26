import { NextRequest, NextResponse } from "next/server";
import { fetchBackendJson, MONITORING_SOURCE_HEADER } from "@/lib/backendProxy";
import { deleteTracesFromDb, queryTracesListFromDb } from "@/lib/sqliteTraces";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
    const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
    const status = searchParams.get("status") || undefined;

    // 1. Direct from bound volume /app/traces/traces.db
    const tracesFromDb = queryTracesListFromDb(limit, offset, status);
    if (tracesFromDb !== null) {
      return NextResponse.json(
        {
          limit,
          offset,
          count: tracesFromDb.length,
          traces: tracesFromDb,
        },
        { headers: { [MONITORING_SOURCE_HEADER]: "sqlite" } }
      );
    }

    // 2. Proxy to backend API if available
    const backendData = await fetchBackendJson<any>(
      `/monitoring/traces?${searchParams.toString()}`,
      {},
      15000
    );
    if (backendData && Array.isArray(backendData.traces)) {
      return NextResponse.json(backendData, {
        headers: { [MONITORING_SOURCE_HEADER]: "backend" },
      });
    }

    // 3. Fallback: Clean empty trace list
    return NextResponse.json(
      {
        limit,
        offset,
        count: 0,
        traces: [],
      },
      { headers: { [MONITORING_SOURCE_HEADER]: "empty-fallback" } }
    );
  } catch {
    return NextResponse.json(
      {
        limit: 50,
        offset: 0,
        count: 0,
        traces: [],
      },
      { headers: { [MONITORING_SOURCE_HEADER]: "empty-fallback" } }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let traceIds: string[] = [];
    try {
      const body = await request.json();
      if (body && Array.isArray(body.trace_ids)) {
        traceIds = body.trace_ids;
      }
    } catch {
      const { searchParams } = new URL(request.url);
      const id = searchParams.get("trace_id");
      if (id) traceIds = [id];
    }

    if (traceIds.length === 0) {
      return NextResponse.json({ error: "No trace_ids provided" }, { status: 400 });
    }

    // 1. Delete from local SQLite store if accessible
    const dbResult = deleteTracesFromDb(traceIds);

    // 2. Also proxy to backend API if configured
    let backendSuccess = false;
    let backendDeletedSpans = 0;
    const backendJson = await fetchBackendJson<any>(
      "/monitoring/traces/bulk-delete",
      {
        method: "POST",
        body: JSON.stringify({ trace_ids: traceIds }),
      },
      10000
    );
    if (backendJson) {
      backendSuccess = true;
      if (typeof backendJson.deleted_spans_count === "number") {
        backendDeletedSpans = backendJson.deleted_spans_count;
      }
    }

    if (!dbResult.success && !backendSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to delete traces. SQLite error: ${dbResult.error || "Unknown"}. Backend API was unreachable. Ensure traces volume is mounted read-write and directory has write permissions.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_traces_count: traceIds.length,
      deleted_spans_count: Math.max(dbResult.deletedCount, backendDeletedSpans),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete traces" }, { status: 500 });
  }
}


