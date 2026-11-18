import { NextRequest, NextResponse } from "next/server";
import { realTelemetryData, realTraceTrees } from "@/lib/realTelemetry";
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

    // 2. Check exported trace trees
    if (realTraceTrees[traceId] && realTraceTrees[traceId].spans.length > 0) {
      return NextResponse.json(realTraceTrees[traceId]);
    }

    // 3. Proxy to backend API if available
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

    // 4. Fallback span representation from recentTraces
    const trace = realTelemetryData.recentTraces.find((t) => t.trace_id === traceId);
    const now = trace?.start_time || Date.now() / 1000;
    const duration = trace?.total_duration_ms || 2400;

    const fallbackSpan = {
      span_id: `spn_root_${traceId.slice(-6)}`,
      trace_id: traceId,
      parent_span_id: null,
      step_name: trace?.intent || "Data Investigation",
      component: trace?.route || "agent.orchestrator",
      step_type: "agent",
      status: trace?.status === "Error" ? "error" : "success",
      start_time: now,
      end_time: now + duration / 1000,
      duration_ms: duration,
      prompt_tokens: trace?.total_prompt_tokens || 0,
      completion_tokens: trace?.total_completion_tokens || 0,
      total_tokens: trace?.total_tokens || 0,
      inputs: { objective: trace?.query || "Execution of data pipeline" },
      outputs: { result: "Completed trace investigation from records" },
      created_at: trace?.created_at || new Date().toISOString(),
    };

    return NextResponse.json({
      trace_id: traceId,
      total_spans: 1,
      roots: [fallbackSpan],
      spans: [fallbackSpan],
    });
  } catch {
    return NextResponse.json(
      { error: "Trace not found" },
      { status: 404 }
    );
  }
}

