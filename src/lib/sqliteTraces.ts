import fs from "fs";
import path from "path";
import type {
  ComponentStat,
  DashboardTelemetry,
  SpanRecord,
  TraceSummary,
  TraceTree,
} from "./types";

/**
 * Resolves the location of traces.db in order of priority:
 * 1. MONITORING_DB_PATH environment variable
 * 2. Container volume bound at /app/traces/traces.db
 * 3. Container fallback volume at /app/traces-host/traces.db
 * 4. Local repo traces at Server/traces/traces.db (relative to process.cwd)
 * 5. Local directory traces/traces.db
 */
export function resolveTracesDbPath(): string | null {
  const envPath = process.env.MONITORING_DB_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }

  const envDir = process.env.MONITORING_TRACES_DIR;
  if (envDir) {
    const candidate = path.join(envDir, "traces.db");
    if (fs.existsSync(candidate)) return candidate;
  }

  const candidates = [
    "/app/traces/traces.db",
    "/app/traces-host/traces.db",
    "/app/traces-fallback/traces.db",
    path.resolve(process.cwd(), "../Server/traces/traces.db"),
    path.resolve(process.cwd(), "traces/traces.db"),
    path.resolve(process.cwd(), "../traces/traces.db"),
    path.resolve(__dirname, "../../../Server/traces/traces.db"),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return p;
      }
    } catch {
      // ignore path access errors
    }
  }

  return null;
}

// Cached DatabaseSync constructor from node:sqlite
let dbSyncClass: any = null;
let dbSyncAttempted = false;

function getDatabaseSync() {
  if (dbSyncAttempted) return dbSyncClass;
  dbSyncAttempted = true;
  try {
    // Dynamic require for node:sqlite (available built-in on Node 22+)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sqlite = require("node:sqlite");
    dbSyncClass = sqlite.DatabaseSync;
  } catch (err) {
    dbSyncClass = null;
  }
  return dbSyncClass;
}

function parseJsonSafe(val: any, fallback: any = null) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function rowToSpan(r: any): SpanRecord {
  return {
    span_id: r.span_id,
    trace_id: r.trace_id,
    parent_span_id: r.parent_span_id || null,
    step_name: r.step_name,
    component: r.component,
    step_type: r.step_type,
    status: r.status,
    start_time: Number(r.start_time),
    end_time: Number(r.end_time),
    duration_ms: Number(r.duration_ms),
    ttft_ms: r.ttft_ms !== null && r.ttft_ms !== undefined ? Number(r.ttft_ms) : null,
    prompt_tokens: Number(r.prompt_tokens || 0),
    completion_tokens: Number(r.completion_tokens || 0),
    total_tokens: Number(r.total_tokens || 0),
    inputs: parseJsonSafe(r.inputs_json, {}),
    outputs: parseJsonSafe(r.outputs_json, {}),
    metrics: parseJsonSafe(r.metrics_json, {}),
    error: parseJsonSafe(r.error_json, null),
    tags: parseJsonSafe(r.tags_json, {}),
    created_at: r.created_at || new Date().toISOString(),
  };
}

export function queryDashboardOverviewFromDb(): DashboardTelemetry | null {
  const dbPath = resolveTracesDbPath();
  if (!dbPath) return null;

  const DatabaseSync = getDatabaseSync();
  if (!DatabaseSync) return null;

  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });

    // 1. Durations, error counts, days grouped by user request (investigation_id or multi-step request)
    const traceQuery = `
      SELECT
        COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id) as request_id,
        ROUND((MAX(t.end_time) - MIN(t.start_time)), 3) as duration_s,
        SUM(CASE WHEN t.status = 'error' THEN 1 ELSE 0 END) as error_count,
        substr(MIN(t.created_at), 1, 10) as day
      FROM spans t
      GROUP BY request_id
      HAVING 
        NOT (
          COUNT(*) = 1 AND (
            (SELECT s.step_type FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) IN ('llm', 'tool', 'database', 'retriever', 'reranker', 'router')
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'deepinfra%'
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'openai%'
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'execute_%'
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'inspect_%'
          )
        )
    `;
    const traceRows = db.prepare(traceQuery).all() as any[];
    const totalTraces = traceRows.length;
    if (totalTraces === 0) {
      db.close();
      return {
        metrics: {
          totalTraces: 0,
          totalSpans: 0,
          p50LatencySec: 0,
          p95LatencySec: 0,
          avgLatencySec: 0,
          errorRatePct: 0,
          failedTracesCount: 0,
          totalTokens: 0,
          inputTokens: 0,
          outputTokens: 0,
          llmCallsCount: 0,
          databaseCallsCount: 0,
        },
        timeline: [],
        componentStats: [],
        slowestSpans: [],
        recentTraces: [],
      };
    }

    const durations: number[] = [];
    let failedTraces = 0;
    const daysDict: Record<string, number[]> = {};

    for (const r of traceRows) {
      const dur = Number(r.duration_s);
      if (!isNaN(dur) && dur > 0) {
        durations.push(dur);
        const day = r.day || "Unknown";
        if (!daysDict[day]) daysDict[day] = [];
        daysDict[day].push(dur);
      }
      if (Number(r.error_count) > 0) {
        failedTraces++;
      }
    }

    durations.sort((a, b) => a - b);
    const p50 = durations.length > 0 ? Number(durations[Math.floor(durations.length * 0.5)].toFixed(2)) : 0;
    const p95 = durations.length > 0 ? Number(durations[Math.floor(durations.length * 0.95)].toFixed(2)) : 0;
    const avgDur =
      durations.length > 0
        ? Number((durations.reduce((sum, v) => sum + v, 0) / durations.length).toFixed(2))
        : 0;
    const errorRatePct = totalTraces > 0 ? Number(((failedTraces / totalTraces) * 100).toFixed(2)) : 0;

    // 2. Token counts & spans
    const spanQuery = `
      SELECT
        COUNT(*) as total_spans,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens,
        SUM(total_tokens) as total_tokens,
        SUM(CASE WHEN step_type = 'llm' THEN 1 ELSE 0 END) as llm_calls,
        SUM(CASE WHEN step_type = 'database' THEN 1 ELSE 0 END) as database_calls
      FROM spans
    `;
    const spanRow = db.prepare(spanQuery).get() as any;
    const totalSpans = Number(spanRow?.total_spans || 0);
    const promptTokens = Number(spanRow?.total_prompt_tokens || 0);
    const completionTokens = Number(spanRow?.total_completion_tokens || 0);
    const totalTokens = Number(spanRow?.total_tokens || promptTokens + completionTokens);
    const llmCalls = Number(spanRow?.llm_calls || 0);
    const databaseCalls = Number(spanRow?.database_calls || 0);

    // 3. Timeline
    const timeline = Object.keys(daysDict)
      .sort()
      .map((day) => {
        const sortedDay = daysDict[day].sort((a, b) => a - b);
        const cnt = sortedDay.length;
        const dP50 = cnt > 0 ? Number(sortedDay[Math.floor(cnt * 0.5)].toFixed(2)) : 0;
        const dP95 = cnt > 0 ? Number(sortedDay[Math.floor(cnt * 0.95)].toFixed(2)) : 0;
        let label = day;
        try {
          const dt = new Date(day + "T00:00:00Z");
          label = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        } catch {}
        return {
          time: label,
          date: day,
          count: cnt,
          p50: dP50,
          p95: dP95,
        };
      });

    // 4. Component stats
    const statsQuery = `
      SELECT
        step_type,
        component,
        COUNT(*) as total_calls,
        ROUND(AVG(duration_ms), 1) as avg_duration_ms,
        ROUND(MIN(duration_ms), 1) as min_duration_ms,
        ROUND(MAX(duration_ms), 1) as max_duration_ms,
        ROUND(AVG(CASE WHEN ttft_ms IS NOT NULL THEN ttft_ms ELSE NULL END), 1) as avg_ttft_ms,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
        ROUND((SUM(CASE WHEN status = 'error' THEN 1.0 ELSE 0.0 END) / COUNT(*)) * 100, 2) as error_rate_pct,
        SUM(prompt_tokens) as total_prompt_tokens,
        SUM(completion_tokens) as total_completion_tokens
      FROM spans
      GROUP BY step_type, component
      ORDER BY total_calls DESC
    `;
    const statRows = db.prepare(statsQuery).all() as any[];
    const componentStats: ComponentStat[] = statRows.map((r) => ({
      step_type: r.step_type,
      component: r.component,
      total_calls: Number(r.total_calls || 0),
      avg_duration_ms: Number(r.avg_duration_ms || 0),
      min_duration_ms: Number(r.min_duration_ms || 0),
      max_duration_ms: Number(r.max_duration_ms || 0),
      avg_ttft_ms: r.avg_ttft_ms !== null ? Number(r.avg_ttft_ms) : null,
      error_count: Number(r.error_count || 0),
      error_rate_pct: Number(r.error_rate_pct || 0),
      total_prompt_tokens: Number(r.total_prompt_tokens || 0),
      total_completion_tokens: Number(r.total_completion_tokens || 0),
    }));

    // 5. Slowest spans
    const slowestQuery = `
      SELECT *
      FROM spans
      ORDER BY duration_ms DESC
      LIMIT 20
    `;
    const slowestRows = db.prepare(slowestQuery).all() as any[];
    const slowestSpans = slowestRows.map(rowToSpan);

    // 6. Recent requests (strictly USER REQUESTS only, excluding raw internal steps)
    const recentQuery = `
      SELECT
        COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id) as request_id,
        MIN(t.start_time) as start_time,
        MAX(t.end_time) as end_time,
        ROUND((MAX(t.end_time) - MIN(t.start_time)) * 1000, 2) as total_duration_ms,
        COUNT(*) as total_spans,
        SUM(CASE WHEN t.status = 'error' THEN 1 ELSE 0 END) as error_count,
        SUM(t.prompt_tokens) as total_prompt_tokens,
        SUM(t.completion_tokens) as total_completion_tokens,
        SUM(t.total_tokens) as total_tokens,
        MAX(t.created_at) as created_at,
        (SELECT s.step_name FROM spans s WHERE (s.trace_id = t.trace_id OR json_extract(s.tags_json, '$.investigation_id') = COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id)) AND (s.parent_span_id IS NULL OR s.parent_span_id = '') LIMIT 1) as root_step_name,
        (SELECT s.component FROM spans s WHERE (s.trace_id = t.trace_id OR json_extract(s.tags_json, '$.investigation_id') = COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id)) AND (s.parent_span_id IS NULL OR s.parent_span_id = '') LIMIT 1) as root_component,
        (SELECT s.inputs_json FROM spans s WHERE (s.trace_id = t.trace_id OR json_extract(s.tags_json, '$.investigation_id') = COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id)) AND (s.inputs_json LIKE '%"objective"%' OR s.inputs_json LIKE '%"query"%' OR s.inputs_json LIKE '%"prompt"%') ORDER BY s.start_time ASC LIMIT 1) as query_inputs,
        (SELECT s.tags_json FROM spans s WHERE (s.trace_id = t.trace_id OR json_extract(s.tags_json, '$.investigation_id') = COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id)) AND (s.tags_json LIKE '%"query"%' OR s.tags_json LIKE '%"objective"%') ORDER BY s.start_time ASC LIMIT 1) as query_tags
      FROM spans t
      GROUP BY request_id
      HAVING 
        NOT (
          COUNT(*) = 1 AND (
            (SELECT s.step_type FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) IN ('llm', 'tool', 'database', 'retriever', 'reranker', 'router')
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'deepinfra%'
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'openai%'
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'execute_%'
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'inspect_%'
          )
        )
      ORDER BY start_time DESC
      LIMIT 100
    `;
    const recentRows = db.prepare(recentQuery).all() as any[];
    const recentTraces: TraceSummary[] = recentRows
      .map((d) => {
        const stepName = d.root_step_name || "";
        const component = d.root_component || "";
        const queryInputs = parseJsonSafe(d.query_inputs, {});
        const queryTags = parseJsonSafe(d.query_tags, {});

        let q =
          queryInputs?.objective ||
          queryInputs?.query ||
          queryInputs?.question ||
          queryInputs?.prompt ||
          queryTags?.query ||
          queryTags?.objective ||
          "";

        if (!q && queryInputs?.messages && Array.isArray(queryInputs.messages)) {
          const lastMsg = queryInputs.messages[queryInputs.messages.length - 1];
          q = typeof lastMsg === "object" ? lastMsg.content || "" : String(lastMsg);
        }

        // Strictly require a real user query: if empty or starts with "Execution of", it's an internal step
        if (!q) {
          return null;
        }

        const qLower = q.toLowerCase().trim();
        if (
          qLower.startsWith("execution of") ||
          qLower.startsWith("execute_") ||
          qLower.startsWith("inspect_") ||
          qLower.startsWith("list_") ||
          qLower.startsWith("deepinfra") ||
          qLower.startsWith("openai")
        ) {
          return null;
        }

        let intent = "Data Investigation";
        let route = "orchestrator";
        const fullText = (stepName + " " + component + " " + (d.request_id || "")).toLowerCase();
        if (fullText.includes("tabular") || fullText.includes("duckdb")) {
          intent = "Tabular Analysis";
          route = "agent.tabular";
        } else if (fullText.includes("database") || fullText.includes("sql")) {
          intent = "SQL Query Execution";
          route = "agent.database";
        } else if (fullText.includes("document") || fullText.includes("rag")) {
          intent = "Document RAG";
          route = "agent.document";
        } else if (fullText.includes("light")) {
          intent = "Direct Assistant";
          route = "light.reply";
        }

        const totalTokensTrace =
          Number(d.total_tokens) || Number(d.total_prompt_tokens || 0) + Number(d.total_completion_tokens || 0);

        const durMs = Number(d.total_duration_ms || 0);
        const isErr = Number(d.error_count || 0) > 0;
        const isTimeout = durMs > 30000;
        const status = isErr ? "Error" : isTimeout ? "Timeout" : "OK";

        return {
          trace_id: d.request_id || d.trace_id,
          user_id: queryTags?.user_id || "usr_prod",
          workspace_id: queryTags?.workspace_id || "ws_prod",
          intent,
          route,
          status,
          error_count: Number(d.error_count || 0),
          total_duration_ms: durMs,
          latency_s: Number((durMs / 1000).toFixed(2)),
          total_spans: Number(d.total_spans || 1),
          total_prompt_tokens: Number(d.total_prompt_tokens || 0),
          total_completion_tokens: Number(d.total_completion_tokens || 0),
          total_tokens: totalTokensTrace,
          start_time: Number(d.start_time || 0),
          end_time: Number(d.end_time || 0),
          created_at: d.created_at || new Date().toISOString(),
          query: q,
        } as TraceSummary;
      })
      .filter((t): t is TraceSummary => t !== null);

    db.close();

    return {
      metrics: {
        totalTraces,
        totalSpans,
        p50LatencySec: p50,
        p95LatencySec: p95,
        avgLatencySec: avgDur,
        errorRatePct,
        failedTracesCount: failedTraces,
        totalTokens,
        inputTokens: promptTokens,
        outputTokens: completionTokens,
        llmCallsCount: llmCalls,
        databaseCallsCount: databaseCalls,
      },
      timeline,
      componentStats,
      slowestSpans,
      recentTraces,
    };
  } catch (err) {
    console.error("Failed to query traces.db overview:", err);
    return null;
  }
}

export function queryTraceTreeFromDb(traceId: string): TraceTree | null {
  const dbPath = resolveTracesDbPath();
  if (!dbPath) return null;

  const DatabaseSync = getDatabaseSync();
  if (!DatabaseSync) return null;

  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db
      .prepare(
        `SELECT * FROM spans 
         WHERE trace_id = ? 
            OR json_extract(tags_json, '$.investigation_id') = ?
         ORDER BY start_time ASC`
      )
      .all(traceId, traceId) as any[];
    db.close();

    if (!rows || rows.length === 0) return null;

    const spans = rows.map(rowToSpan);
    const byId: Record<string, any> = {};
    for (const s of spans) {
      byId[s.span_id] = { ...s, children: [] };
    }

    const roots: any[] = [];
    for (const s of spans) {
      const pid = s.parent_span_id;
      if (pid && byId[pid]) {
        byId[pid].children.push(byId[s.span_id]);
      } else {
        roots.push(byId[s.span_id]);
      }
    }

    return {
      trace_id: traceId,
      total_spans: spans.length,
      roots: roots.length > 0 ? roots : spans,
      spans,
    };
  } catch (err) {
    console.error(`Failed to query trace tree for ${traceId}:`, err);
    return null;
  }
}

export function queryTracesListFromDb(limit = 50, offset = 0, status?: string): TraceSummary[] | null {
  const dbPath = resolveTracesDbPath();
  if (!dbPath) return null;

  const DatabaseSync = getDatabaseSync();
  if (!DatabaseSync) return null;

  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    let havingStatus = "";
    if (status) {
      if (status.toLowerCase() === "ok" || status.toLowerCase() === "success") {
        havingStatus = "AND error_count = 0";
      } else if (status.toLowerCase() === "error" || status.toLowerCase() === "failed") {
        havingStatus = "AND error_count > 0";
      }
    }

    const query = `
      SELECT
        COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id) as request_id,
        MIN(t.start_time) as start_time,
        MAX(t.end_time) as end_time,
        ROUND((MAX(t.end_time) - MIN(t.start_time)) * 1000, 2) as total_duration_ms,
        COUNT(*) as total_spans,
        SUM(CASE WHEN t.status = 'error' THEN 1 ELSE 0 END) as error_count,
        SUM(t.prompt_tokens) as total_prompt_tokens,
        SUM(t.completion_tokens) as total_completion_tokens,
        SUM(t.total_tokens) as total_tokens,
        MAX(t.created_at) as created_at,
        (SELECT s.step_name FROM spans s WHERE (s.trace_id = t.trace_id OR json_extract(s.tags_json, '$.investigation_id') = COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id)) AND (s.parent_span_id IS NULL OR s.parent_span_id = '') LIMIT 1) as root_step_name,
        (SELECT s.component FROM spans s WHERE (s.trace_id = t.trace_id OR json_extract(s.tags_json, '$.investigation_id') = COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id)) AND (s.parent_span_id IS NULL OR s.parent_span_id = '') LIMIT 1) as root_component,
        (SELECT s.inputs_json FROM spans s WHERE (s.trace_id = t.trace_id OR json_extract(s.tags_json, '$.investigation_id') = COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id)) AND (s.inputs_json LIKE '%"objective"%' OR s.inputs_json LIKE '%"query"%' OR s.inputs_json LIKE '%"prompt"%') ORDER BY s.start_time ASC LIMIT 1) as query_inputs,
        (SELECT s.tags_json FROM spans s WHERE (s.trace_id = t.trace_id OR json_extract(s.tags_json, '$.investigation_id') = COALESCE(json_extract(t.tags_json, '$.investigation_id'), t.trace_id)) AND (s.tags_json LIKE '%"query"%' OR s.tags_json LIKE '%"objective"%') ORDER BY s.start_time ASC LIMIT 1) as query_tags
      FROM spans t
      GROUP BY request_id
      HAVING 
        NOT (
          COUNT(*) = 1 AND (
            (SELECT s.step_type FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) IN ('llm', 'tool', 'database', 'retriever', 'reranker', 'router')
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'deepinfra%'
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'openai%'
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'execute_%'
            OR (SELECT s.step_name FROM spans s WHERE s.trace_id = t.trace_id LIMIT 1) LIKE 'inspect_%'
          )
        )
        ${havingStatus}
      ORDER BY start_time DESC
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(query).all(limit, offset) as any[];
    db.close();

    return rows
      .map((d) => {
        const stepName = d.root_step_name || "";
        const component = d.root_component || "";
        const queryInputs = parseJsonSafe(d.query_inputs, {});
        const queryTags = parseJsonSafe(d.query_tags, {});

        let q =
          queryInputs?.objective ||
          queryInputs?.query ||
          queryInputs?.question ||
          queryInputs?.prompt ||
          queryTags?.query ||
          queryTags?.objective ||
          "";

        if (!q && queryInputs?.messages && Array.isArray(queryInputs.messages)) {
          const lastMsg = queryInputs.messages[queryInputs.messages.length - 1];
          q = typeof lastMsg === "object" ? lastMsg.content || "" : String(lastMsg);
        }
        if (!q) {
          q = "Execution of " + (stepName || component || "Data Query");
        }

        if (
          q.startsWith("Execution of deepinfra") ||
          q.startsWith("Execution of openai") ||
          q.startsWith("Execution of execute_") ||
          q.startsWith("Execution of inspect_")
        ) {
          return null;
        }

        let intent = "Data Investigation";
        let route = "orchestrator";
        const fullText = (stepName + " " + component + " " + (d.request_id || "")).toLowerCase();
        if (fullText.includes("tabular") || fullText.includes("duckdb")) {
          intent = "Tabular Analysis";
          route = "agent.tabular";
        } else if (fullText.includes("database") || fullText.includes("sql")) {
          intent = "SQL Query Execution";
          route = "agent.database";
        } else if (fullText.includes("document") || fullText.includes("rag")) {
          intent = "Document RAG";
          route = "agent.document";
        } else if (fullText.includes("light")) {
          intent = "Direct Assistant";
          route = "light.reply";
        }

        const totalTokensTrace =
          Number(d.total_tokens) || Number(d.total_prompt_tokens || 0) + Number(d.total_completion_tokens || 0);

        const durMs = Number(d.total_duration_ms || 0);
        const isErr = Number(d.error_count || 0) > 0;
        const isTimeout = durMs > 30000;
        const status = isErr ? "Error" : isTimeout ? "Timeout" : "OK";

        return {
          trace_id: d.request_id || d.trace_id,
          user_id: queryTags?.user_id || "usr_prod",
          workspace_id: queryTags?.workspace_id || "ws_prod",
          intent,
          route,
          status,
          error_count: Number(d.error_count || 0),
          total_duration_ms: durMs,
          latency_s: Number((durMs / 1000).toFixed(2)),
          total_spans: Number(d.total_spans || 1),
          total_prompt_tokens: Number(d.total_prompt_tokens || 0),
          total_completion_tokens: Number(d.total_completion_tokens || 0),
          total_tokens: totalTokensTrace,
          start_time: Number(d.start_time || 0),
          end_time: Number(d.end_time || 0),
          created_at: d.created_at || new Date().toISOString(),
          query: q,
        } as TraceSummary;
      })
      .filter((t): t is TraceSummary => t !== null);
  } catch (err) {
    console.error("Failed to query traces list from DB:", err);
    return null;
  }
}

/**
 * Deletes all spans associated with the specified trace IDs or investigation IDs.
 */
export function deleteTracesFromDb(traceIds: string[]): { success: boolean; deletedCount: number } {
  if (!traceIds || traceIds.length === 0) return { success: true, deletedCount: 0 };

  const dbPath = resolveTracesDbPath();
  if (!dbPath) return { success: false, deletedCount: 0 };

  const DatabaseSync = getDatabaseSync();
  if (!DatabaseSync) return { success: false, deletedCount: 0 };

  try {
    const db = new DatabaseSync(dbPath);
    let totalDeleted = 0;
    for (let i = 0; i < traceIds.length; i += 50) {
      const chunk = traceIds.slice(i, i + 50);
      const placeholders = chunk.map(() => "?").join(",");
      const stmt = db.prepare(`
        DELETE FROM spans
        WHERE trace_id IN (${placeholders})
           OR json_extract(tags_json, '$.investigation_id') IN (${placeholders})
      `);
      const res = stmt.run(...chunk, ...chunk) as any;
      totalDeleted += res?.changes || 0;
    }
    db.close();
    return { success: true, deletedCount: totalDeleted };
  } catch (err) {
    console.error("Failed to delete traces from db:", err);
    return { success: false, deletedCount: 0 };
  }
}
