import { NextRequest, NextResponse } from "next/server";
import { queryTracesListFromDb } from "@/lib/sqliteTraces";

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
      return NextResponse.json({
        limit,
        offset,
        count: tracesFromDb.length,
        traces: tracesFromDb,
      });
    }

    // 2. Proxy to backend API if available
    const apiBase = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${apiBase}/monitoring/traces?${searchParams.toString()}`, {
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        return NextResponse.json(json);
      }
    } catch {
      // Backend offline
    }

    // 3. Fallback: Clean empty trace list
    return NextResponse.json({
      limit,
      offset,
      count: 0,
      traces: [],
    });
  } catch {
    return NextResponse.json({
      limit: 50,
      offset: 0,
      count: 0,
      traces: [],
    });
  }
}

