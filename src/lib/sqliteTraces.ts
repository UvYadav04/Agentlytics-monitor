import fs from "fs";
import path from "path";
import { isRealUserRequest } from "./types";
import type {
  BreakdownStat,
  ComponentStat,
  DashboardTelemetry,
  LatencyBucket,
  SpanRecord,
  StepTimelinePoint,
  StepType,
  TelemetryFilters,
  TraceSummary,
  TraceTree,
} from "./types";

/**
 * Resolves the location of traces.db in order of priority:
 * 1. MONITORING_DB_PATH environment variable
 * 2. MONITORING_TRACES_DIR/traces.db environment variable
 * 3. Container volume bound at /app/traces/traces.db
 * 4. Container fallback volume at /app/traces-host/traces.db
 * 5. Local repo traces at server/traces/traces.db (relative to process.cwd)
 * 6. Local directory traces/traces.db
 *
 * When multiple candidate files exist, prefers the first non-empty database
 * that actually contains rows in `spans` so an empty placeholder file never
 * shadows the active traces database.
 */
function hasSpansRows(dbPath: string): boolean {
  const DatabaseSync = getDatabaseSync();
  if (!DatabaseSync) return false;
  let db: any = null;
  try {
    db = new DatabaseSync(dbPath, { readOnly: true });
    const row = db.prepare("SELECT 1 as ok FROM spans LIMIT 1").get() as { ok?: number } | undefined;
    return Boolean(row?.ok);
  } catch {
    return false;
  } finally {
    try {
      db?.close();
    } catch {}
  }
}

export function resolveTracesDbPath(): string | null {
  const rawCandidates: string[] = [];
  const envPath = process.env.MONITORING_DB_PATH;
  if (envPath) rawCandidates.push(envPath);

  const envDir = process.env.MONITORING_TRACES_DIR;
  if (envDir) rawCandidates.push(path.join(envDir, "traces.db"));

  rawCandidates.push(
    "/app/traces/traces.db",
    "/app/traces-host/traces.db",
    "/app/traces-fallback/traces.db",
    path.resolve(process.cwd(), "../server/traces/traces.db"),
    path.resolve(process.cwd(), "../Server/traces/traces.db"),
    path.resolve(process.cwd(), "../../server/traces/traces.db"),
    path.resolve(process.cwd(), "../../Server/traces/traces.db"),
    path.resolve(process.cwd(), "traces/traces.db"),
    path.resolve(process.cwd(), "../traces/traces.db"),
    path.resolve(process.cwd(), "../../traces/traces.db"),
    path.resolve(__dirname, "../../../server/traces/traces.db"),
    path.resolve(__dirname, "../../../Server/traces/traces.db"),
    path.resolve(__dirname, "../../../../../../server/traces/traces.db"),
    path.resolve(__dirname, "../../../../../../Server/traces/traces.db")
  );

  const seen = new Set<string>();
  const existing: string[] = [];
  for (const p of rawCandidates) {
    const resolved = path.resolve(p);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    try {
      if (fs.existsSync(resolved) && fs.statSync(resolved).size > 0) {
        existing.push(resolved);
      }
    } catch {
      // ignore path access errors
    }
  }

  if (existing.length === 0) return null;
  if (existing.length === 1) return existing[0];

  for (const candidate of existing) {
    if (hasSpansRows(candidate)) {
      return candidate;
    }
  }

  return existing[0];
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

interface LightSpanRow {
  span_id: string;
  trace_id: string;
  parent_span_id: string | null;
  step_name: string;
  component: string;
  step_type: StepType;
  status: string;
  start_time: number;
  end_time: number;
  duration_ms: number;
  ttft_ms: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  tags: Record<string, any>;
  created_at: string;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function buildStepTimeline(spans: LightSpanRow[]): StepTimelinePoint[] {
  if (spans.length === 0) return [];

  // Check distinct days first; if only 1 day, bucket by hour (YYYY-MM-DDTHH) for granular step trends
  const distinctDays = new Set<string>();
  for (const s of spans) {
    const day = (s.created_at || "").slice(0, 10) || "Unknown";
    distinctDays.add(day);
  }
  const useHourly = distinctDays.size <= 1;

  const buckets = new Map<string, { durations: number[]; errorCount: number; totalCount: number }>();
  for (const s of spans) {
    const iso = s.created_at || "";
    const key = useHourly ? iso.slice(0, 13) || "Unknown" : iso.slice(0, 10) || "Unknown";
    if (!buckets.has(key)) {
      buckets.set(key, { durations: [], errorCount: 0, totalCount: 0 });
    }
    const b = buckets.get(key)!;
    b.totalCount++;
    if (!isNaN(s.duration_ms) && s.duration_ms >= 0) {
      b.durations.push(s.duration_ms);
    }
    if (s.status === "error") {
      b.errorCount++;
    }
  }

  return Array.from(buckets.keys())
    .sort()
    .map((key) => {
      const b = buckets.get(key)!;
      const sorted = [...b.durations].sort((a, bVal) => a - bVal);
      const p50Ms = sorted.length > 0 ? Number(percentile(sorted, 0.5).toFixed(1)) : 0;
      const p95Ms = sorted.length > 0 ? Number(percentile(sorted, 0.95).toFixed(1)) : 0;
      const avgMs =
        sorted.length > 0 ? Number((sorted.reduce((acc, v) => acc + v, 0) / sorted.length).toFixed(1)) : 0;
      const errRate = b.totalCount > 0 ? Number(((b.errorCount / b.totalCount) * 100).toFixed(2)) : 0;

      let label = key;
      try {
        if (useHourly && key.length >= 13) {
          const dt = new Date(key + ":00:00Z");
          label = dt.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "UTC",
          });
        } else if (key.length >= 10) {
          const dt = new Date(key + "T00:00:00Z");
          label = dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        }
      } catch {}

      return {
        time: label,
        date: key,
        count: b.totalCount,
        p50_ms: p50Ms,
        avg_ms: avgMs,
        p95_ms: p95Ms,
        error_count: b.errorCount,
        error_rate_pct: errRate,
      };
    });
}

function buildLatencyHistogram(durationsMs: number[]): LatencyBucket[] {
  const buckets: LatencyBucket[] = [
    { label: "<0.5s", count: 0 },
    { label: "0.5–2s", count: 0 },
    { label: "2–5s", count: 0 },
    { label: "5–15s", count: 0 },
    { label: ">15s", count: 0 },
  ];
  for (const ms of durationsMs) {
    if (ms < 500) buckets[0].count++;
    else if (ms < 2000) buckets[1].count++;
    else if (ms < 5000) buckets[2].count++;
    else if (ms < 15000) buckets[3].count++;
    else buckets[4].count++;
  }
  return buckets;
}

function computeBreakdownStat(
  key: string,
  label: string,
  spans: LightSpanRow[],
  options?: { subtitle?: string; category?: string }
): BreakdownStat {
  const count = spans.length;
  if (count === 0) {
    return {
      key,
      label,
      subtitle: options?.subtitle,
      category: options?.category,
      total_calls: 0,
      p50_duration_ms: 0,
      p95_duration_ms: 0,
      avg_duration_ms: 0,
      min_duration_ms: 0,
      max_duration_ms: 0,
      avg_ttft_ms: null,
      error_count: 0,
      error_rate_pct: 0,
      total_tokens: 0,
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      timeline: [],
      histogram: buildLatencyHistogram([]),
    };
  }

  const durations = spans
    .map((s) => s.duration_ms)
    .filter((d) => !isNaN(d) && d >= 0)
    .sort((a, b) => a - b);

  const errorCount = spans.filter((s) => s.status === "error").length;
  const ttfts = spans.map((s) => s.ttft_ms).filter((t): t is number => t !== null && !isNaN(t));
  const promptTokens = spans.reduce((acc, s) => acc + s.prompt_tokens, 0);
  const completionTokens = spans.reduce((acc, s) => acc + s.completion_tokens, 0);
  const totalTokens = spans.reduce((acc, s) => acc + (s.total_tokens || s.prompt_tokens + s.completion_tokens), 0);

  const avgMs = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  return {
    key,
    label,
    subtitle: options?.subtitle,
    category: options?.category,
    total_calls: count,
    p50_duration_ms: Number(percentile(durations, 0.5).toFixed(1)),
    p95_duration_ms: Number(percentile(durations, 0.95).toFixed(1)),
    avg_duration_ms: Number(avgMs.toFixed(1)),
    min_duration_ms: durations.length > 0 ? Number(durations[0].toFixed(1)) : 0,
    max_duration_ms: durations.length > 0 ? Number(durations[durations.length - 1].toFixed(1)) : 0,
    avg_ttft_ms: ttfts.length > 0 ? Number((ttfts.reduce((a, b) => a + b, 0) / ttfts.length).toFixed(1)) : null,
    error_count: errorCount,
    error_rate_pct: Number(((errorCount / count) * 100).toFixed(2)),
    total_tokens: totalTokens,
    total_prompt_tokens: promptTokens,
    total_completion_tokens: completionTokens,
    timeline: buildStepTimeline(spans),
    histogram: buildLatencyHistogram(durations),
  };
}

function classifyRoleFromText(text: string): "hypothesis" | "tabular" | "database" | "document" | "orchestrator" | null {
  const t = text.toLowerCase();
  if (t.includes("hypothes")) return "hypothesis";
  if (t.includes("tabular") || t.includes("duckdb") || t.includes("run_python")) return "tabular";
  if (t.includes("database") || t.includes("sql") || t.includes("execute_query") || t.includes("inspect_schema")) {
    return "database";
  }
  if (t.includes("document") || t.includes("rag") || t.includes("chroma") || t.includes("rerank") || t.includes("verify_chunk")) {
    return "document";
  }
  if (t.includes("orchestrator")) return "orchestrator";
  return null;
}

function classifyLlmCaller(span: LightSpanRow, spanById: Map<string, LightSpanRow>): string {
  // 1. Walk parent chain from immediate parent up to root (nearest caller wins)
  const visited = new Set<string>([span.span_id]);
  let currParentId = span.parent_span_id;
  let hops = 0;

  while (currParentId && hops < 12 && !visited.has(currParentId)) {
    visited.add(currParentId);
    const parent = spanById.get(currParentId);
    if (!parent) break;

    const parentText = `${parent.step_name} ${parent.component} ${parent.tags?.role || ""} ${parent.tags?.agent || ""}`;
    const role = classifyRoleFromText(parentText);
    if (role) return role;

    currParentId = parent.parent_span_id;
    hops++;
  }

  // 2. Check tags on the LLM span itself
  const selfTagText = `${span.tags?.agent || ""} ${span.tags?.caller || ""} ${span.tags?.role || ""} ${span.tags?.pipeline_stage || ""}`;
  const selfRole = classifyRoleFromText(selfTagText);
  if (selfRole) return selfRole;

  return "direct";
}

function classifyAgentKey(span: LightSpanRow): { key: string; label: string; subtitle: string } {
  const txt = `${span.component} ${span.step_name}`.toLowerCase();
  if (txt.includes("orchestrator")) {
    return { key: "orchestrator", label: "Orchestrator", subtitle: "agent.orchestrator" };
  }
  if (txt.includes("tabular")) {
    return { key: "tabular", label: "Tabular", subtitle: "agent.tabular" };
  }
  if (txt.includes("document")) {
    return { key: "document", label: "Document", subtitle: "agent.document" };
  }
  if (txt.includes("database") || txt.includes("sql")) {
    return { key: "database", label: "Database", subtitle: "agent.database" };
  }
  return {
    key: span.component || span.step_name,
    label: span.step_name || span.component,
    subtitle: span.component,
  };
}

function isToolCallSpan(span: LightSpanRow): boolean {
  const stepName = (span.step_name || "").toLowerCase();
  const component = (span.component || "").toLowerCase();
  const stepType = (span.step_type || "").toLowerCase();

  if (stepType === "agent" || stepType === "llm") return false;
  // Exclude delegator wrappers that duplicate sub-agent runs
  if (stepName.startsWith("invoke_") && stepName.endsWith("_agent")) return false;

  if (["tool", "database", "sandbox", "retriever", "reranker", "router"].includes(stepType)) {
    return true;
  }
  return (
    component.startsWith("tool.") ||
    component.startsWith("rag.") ||
    component.startsWith("orchestrator.tool.")
  );
}

const USER_REQUEST_HAVING_SQL = `
  (
    MAX(
      CASE
        WHEN json_extract(t.tags_json, '$.investigation_id') IS NOT NULL
         AND json_extract(t.tags_json, '$.investigation_id') != ''
        THEN 1 ELSE 0
      END
    ) = 1
    OR (
      SUM(CASE WHEN t.step_type = 'agent' THEN 1 ELSE 0 END) > 0
      AND NOT (
        COUNT(*) = 1 AND (
          MAX(t.step_type) IN ('llm', 'tool', 'database', 'retriever', 'reranker', 'router', 'sandbox', 'generator', 'custom')
          OR MAX(t.step_name) LIKE 'deepinfra%'
          OR MAX(t.step_name) LIKE 'openai%'
          OR MAX(t.step_name) LIKE 'openrouter%'
          OR MAX(t.step_name) LIKE 'cerebras%'
          OR MAX(t.step_name) LIKE 'groq%'
          OR MAX(t.step_name) LIKE 'execute_%'
          OR MAX(t.step_name) LIKE 'inspect_%'
          OR MAX(t.step_name) LIKE 'run_python_sandbox%'
          OR MAX(t.step_name) LIKE 'search_documents%'
        )
      )
    )
  )
`;

const REQUEST_GROUP_EXPR = "COALESCE(NULLIF(json_extract(t.tags_json, '$.investigation_id'), ''), t.trace_id)";
const SPAN_GROUP_EXPR = "COALESCE(NULLIF(json_extract(s.tags_json, '$.investigation_id'), ''), s.trace_id)";

function buildUserRequestSelectSql(whereSql: string, extraHavingSql: string, orderAndLimitSql: string): string {
  return `
    SELECT
      ${REQUEST_GROUP_EXPR} as request_id,
      MIN(t.start_time) as start_time,
      MAX(t.end_time) as end_time,
      ROUND((MAX(t.end_time) - MIN(t.start_time)) * 1000, 2) as total_duration_ms,
      COUNT(*) as total_spans,
      SUM(CASE WHEN t.status = 'error' THEN 1 ELSE 0 END) as error_count,
      SUM(t.prompt_tokens) as total_prompt_tokens,
      SUM(t.completion_tokens) as total_completion_tokens,
      SUM(t.total_tokens) as total_tokens,
      MAX(t.created_at) as created_at,
      MAX(CASE WHEN json_extract(t.tags_json, '$.investigation_id') IS NOT NULL AND json_extract(t.tags_json, '$.investigation_id') != '' THEN 1 ELSE 0 END) as has_investigation_id,
      (SELECT s.step_name FROM spans s
       WHERE ${SPAN_GROUP_EXPR} = ${REQUEST_GROUP_EXPR}
       ORDER BY CASE WHEN s.step_type = 'agent' THEN 0 WHEN s.step_type = 'router' THEN 1 ELSE 2 END, s.start_time ASC LIMIT 1) as root_step_name,
      (SELECT s.component FROM spans s
       WHERE ${SPAN_GROUP_EXPR} = ${REQUEST_GROUP_EXPR}
       ORDER BY CASE WHEN s.step_type = 'agent' THEN 0 WHEN s.step_type = 'router' THEN 1 ELSE 2 END, s.start_time ASC LIMIT 1) as root_component,
      (SELECT s.inputs_json FROM spans s
       WHERE ${SPAN_GROUP_EXPR} = ${REQUEST_GROUP_EXPR}
         AND (s.inputs_json LIKE '%"objective"%' OR s.inputs_json LIKE '%"query"%' OR s.inputs_json LIKE '%"question"%' OR s.inputs_json LIKE '%"prompt"%')
       ORDER BY CASE WHEN s.step_type IN ('agent', 'router') THEN 0 ELSE 1 END, s.start_time ASC LIMIT 1) as query_inputs,
      (SELECT s.tags_json FROM spans s
       WHERE ${SPAN_GROUP_EXPR} = ${REQUEST_GROUP_EXPR}
         AND (s.tags_json LIKE '%"query"%' OR s.tags_json LIKE '%"objective"%' OR s.tags_json LIKE '%"investigation_id"%')
       ORDER BY CASE WHEN s.tags_json LIKE '%"query"%' THEN 0 ELSE 1 END, s.start_time ASC LIMIT 1) as query_tags
    FROM spans t
    ${whereSql}
    GROUP BY request_id
    HAVING ${USER_REQUEST_HAVING_SQL}
      ${extraHavingSql}
    ${orderAndLimitSql}
  `;
}

function extractUserQueryFromPayloads(queryInputs: any, queryTags: any): string {
  let q =
    queryTags?.query ||
    queryTags?.objective ||
    queryInputs?.objective ||
    queryInputs?.query ||
    queryInputs?.question ||
    queryInputs?.prompt ||
    "";

  if (!q && queryInputs?.messages && Array.isArray(queryInputs.messages)) {
    const userMsg = queryInputs.messages.find(
      (m: any) =>
        typeof m === "object" &&
        m !== null &&
        (m.role === "user" || m.role === "HumanMessage" || m.type === "HumanMessage")
    );
    if (userMsg?.content) {
      q = String(userMsg.content);
    }
  }

  return typeof q === "string" ? q.trim() : String(q || "").trim();
}

function classifyIntentAndRoute(stepName: string, component: string, requestId: string): { intent: string; route: string } {
  const fullText = `${stepName} ${component} ${requestId}`.toLowerCase();
  if (fullText.includes("tabular") || fullText.includes("duckdb")) {
    return { intent: "Tabular Analysis", route: "agent.tabular" };
  }
  if (fullText.includes("database") || fullText.includes("sql")) {
    return { intent: "SQL Query Execution", route: "agent.database" };
  }
  if (fullText.includes("document") || fullText.includes("rag")) {
    return { intent: "Document RAG", route: "agent.document" };
  }
  if (fullText.includes("light") || fullText.includes("greeting")) {
    return { intent: "Direct Assistant", route: "light.reply" };
  }
  return { intent: "Data Investigation", route: "orchestrator" };
}

function mapRequestRowToSummary(d: any): TraceSummary | null {
  const stepName = d.root_step_name || "";
  const component = d.root_component || "";
  const queryInputs = parseJsonSafe(d.query_inputs, {});
  const queryTags = parseJsonSafe(d.query_tags, {});
  const requestId = d.request_id || d.trace_id;

  let q = extractUserQueryFromPayloads(queryInputs, queryTags);
  if (!q && Number(d.has_investigation_id) === 1) {
    q = `Investigation ${requestId}`;
  }
  if (!q) {
    return null;
  }

  const candidate: TraceSummary = {
    trace_id: requestId,
    user_id: queryTags?.user_email || queryTags?.user_id || "usr_prod",
    intent: "",
    route: "",
    status: "OK",
    error_count: Number(d.error_count || 0),
    total_duration_ms: Number(d.total_duration_ms || 0),
    latency_s: Number((Number(d.total_duration_ms || 0) / 1000).toFixed(2)),
    total_spans: Number(d.total_spans || 1),
    total_prompt_tokens: Number(d.total_prompt_tokens || 0),
    total_completion_tokens: Number(d.total_completion_tokens || 0),
    total_tokens:
      Number(d.total_tokens) || Number(d.total_prompt_tokens || 0) + Number(d.total_completion_tokens || 0),
    start_time: Number(d.start_time || 0),
    end_time: Number(d.end_time || 0),
    created_at: d.created_at || new Date().toISOString(),
    query: q,
  };

  if (!isRealUserRequest(candidate)) {
    return null;
  }

  const { intent, route } = classifyIntentAndRoute(stepName, component, requestId);
  const durMs = candidate.total_duration_ms;
  const isErr = candidate.error_count > 0;
  const isTimeout = durMs > 30000;

  candidate.intent = intent;
  candidate.route = queryTags?.route || route;
  candidate.status = isErr ? "Error" : isTimeout ? "Timeout" : "OK";
  return candidate;
}

function resolveInvestigationsDir(dbPath: string | null): string | null {
  const candidates: string[] = [];
  if (dbPath) {
    candidates.push(path.join(path.dirname(dbPath), "investigations"));
  }
  const envDir = process.env.MONITORING_TRACES_DIR;
  if (envDir) {
    candidates.push(path.join(envDir, "investigations"));
  }
  candidates.push("/app/traces/investigations", "/app/traces-host/investigations");

  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
        return dir;
      }
    } catch {}
  }
  return null;
}

function loadInvestigationTreeFromFile(traceId: string, dbPath: string | null): TraceTree | null {
  if (!traceId || path.basename(traceId) !== traceId || traceId.includes("..")) {
    return null;
  }
  const invDir = resolveInvestigationsDir(dbPath);
  if (!invDir) return null;

  const filePath = path.join(invDir, `${traceId}.json`);
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.spans) && parsed.spans.length > 0) {
      return {
        trace_id: parsed.trace_id || traceId,
        total_spans: parsed.total_spans || parsed.spans.length,
        roots: Array.isArray(parsed.roots) ? parsed.roots : parsed.spans,
        spans: parsed.spans,
      };
    }
  } catch {}
  return null;
}

function loadInvestigationSummariesFromFiles(
  dbPath: string | null,
  existingIds: Set<string>,
  options: { limit?: number; cutoffSec?: number | null; minDurationMs?: number | null; maxDurationMs?: number | null } = {}
): TraceSummary[] {
  const invDir = resolveInvestigationsDir(dbPath);
  if (!invDir) return [];

  try {
    const entries = fs
      .readdirSync(invDir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => {
        const full = path.join(invDir, name);
        let mtimeMs = 0;
        try {
          mtimeMs = fs.statSync(full).mtimeMs;
        } catch {}
        return { name, id: name.slice(0, -5), full, mtimeMs };
      })
      .filter((item) => !existingIds.has(item.id))
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    const maxRead = options.limit ?? 100;
    const summaries: TraceSummary[] = [];

    for (const item of entries) {
      if (summaries.length >= maxRead) break;
      try {
        const parsed = JSON.parse(fs.readFileSync(item.full, "utf-8"));
        const spans: SpanRecord[] = Array.isArray(parsed?.spans) ? parsed.spans : [];
        if (spans.length === 0) continue;

        const startTime = Math.min(...spans.map((s) => Number(s.start_time || 0)));
        const endTime = Math.max(...spans.map((s) => Number(s.end_time || 0)));
        const durMs = Math.max(0, Number(((endTime - startTime) * 1000).toFixed(2)));

        if (options.cutoffSec !== undefined && options.cutoffSec !== null && startTime < options.cutoffSec) continue;
        if (options.minDurationMs !== undefined && options.minDurationMs !== null && durMs < options.minDurationMs) continue;
        if (options.maxDurationMs !== undefined && options.maxDurationMs !== null && durMs > options.maxDurationMs) continue;

        const agentSpan = spans.find((s) => s.step_type === "agent" || s.step_type === "router") || spans[0];
        let q = "";
        let tags: Record<string, any> = {};
        for (const s of spans) {
          if (s.tags && (s.tags.query || s.tags.objective || s.tags.user_id || s.tags.user_email)) {
            tags = { ...tags, ...s.tags };
          }
          if (!q) {
            q = extractUserQueryFromPayloads(s.inputs, s.tags);
          }
        }
        if (!q) q = `Investigation ${item.id}`;

        const errorCount = spans.filter((s) => s.status === "error").length;
        const promptTokens = spans.reduce((acc, s) => acc + Number(s.prompt_tokens || 0), 0);
        const completionTokens = spans.reduce((acc, s) => acc + Number(s.completion_tokens || 0), 0);
        const totalTokens = spans.reduce(
          (acc, s) => acc + Number(s.total_tokens || Number(s.prompt_tokens || 0) + Number(s.completion_tokens || 0)),
          0
        );
        const { intent, route } = classifyIntentAndRoute(
          agentSpan?.step_name || "",
          agentSpan?.component || "",
          item.id
        );

        summaries.push({
          trace_id: parsed.trace_id || item.id,
          user_id: tags.user_email || tags.user_id || "usr_prod",
          intent,
          route: tags.route || route,
          status: errorCount > 0 ? "Error" : durMs > 30000 ? "Timeout" : "OK",
          error_count: errorCount,
          total_duration_ms: durMs,
          latency_s: Number((durMs / 1000).toFixed(2)),
          total_spans: spans.length,
          total_prompt_tokens: promptTokens,
          total_completion_tokens: completionTokens,
          total_tokens: totalTokens,
          start_time: startTime,
          end_time: endTime,
          created_at: spans[spans.length - 1]?.created_at || new Date(item.mtimeMs || Date.now()).toISOString(),
          query: q,
        });
      } catch {}
    }

    return summaries;
  } catch {
    return [];
  }
}

export function queryDashboardOverviewFromDb(filters: TelemetryFilters = {}): DashboardTelemetry | null {
  const dbPath = resolveTracesDbPath();
  if (!dbPath) return null;

  const DatabaseSync = getDatabaseSync();
  if (!DatabaseSync) return null;

  const sinceHours =
    filters.sinceHours !== undefined && filters.sinceHours !== null && filters.sinceHours > 0
      ? Number(filters.sinceHours)
      : null;
  const minDurationMs =
    filters.minDurationMs !== undefined && filters.minDurationMs !== null && !isNaN(filters.minDurationMs)
      ? Number(filters.minDurationMs)
      : null;
  const maxDurationMs =
    filters.maxDurationMs !== undefined && filters.maxDurationMs !== null && !isNaN(filters.maxDurationMs)
      ? Number(filters.maxDurationMs)
      : null;

  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });

    const cutoffSec = sinceHours ? Date.now() / 1000 - sinceHours * 3600 : null;
    const whereClauses: string[] = [];
    const whereParams: any[] = [];
    if (cutoffSec !== null) {
      whereClauses.push("t.start_time >= ?");
      whereParams.push(cutoffSec);
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const havingDurationClauses: string[] = [];
    const havingDurationParams: any[] = [];
    if (minDurationMs !== null) {
      havingDurationClauses.push("((MAX(t.end_time) - MIN(t.start_time)) * 1000) >= ?");
      havingDurationParams.push(minDurationMs);
    }
    if (maxDurationMs !== null) {
      havingDurationClauses.push("((MAX(t.end_time) - MIN(t.start_time)) * 1000) <= ?");
      havingDurationParams.push(maxDurationMs);
    }
    const havingDurationSql =
      havingDurationClauses.length > 0 ? `AND ${havingDurationClauses.join(" AND ")}` : "";

    // 1. Trace durations, error counts, days grouped strictly by user request
    const traceQuery = `
      SELECT
        ${REQUEST_GROUP_EXPR} as request_id,
        ROUND((MAX(t.end_time) - MIN(t.start_time)), 3) as duration_s,
        SUM(CASE WHEN t.status = 'error' THEN 1 ELSE 0 END) as error_count,
        substr(MIN(t.created_at), 1, 10) as day
      FROM spans t
      ${whereSql}
      GROUP BY request_id
      HAVING ${USER_REQUEST_HAVING_SQL}
        ${havingDurationSql}
    `;
    const traceRows = db.prepare(traceQuery).all(...whereParams, ...havingDurationParams) as any[];
    const totalTraces = traceRows.length;

    const durations: number[] = [];
    let failedTraces = 0;
    const daysDict: Record<string, { durations: number[]; errorCount: number; totalCount: number }> = {};

    for (const r of traceRows) {
      const dur = Number(r.duration_s);
      const day = r.day || "Unknown";
      if (!daysDict[day]) daysDict[day] = { durations: [], errorCount: 0, totalCount: 0 };
      daysDict[day].totalCount++;

      if (!isNaN(dur) && dur >= 0) {
        durations.push(dur);
        daysDict[day].durations.push(dur);
      }
      if (Number(r.error_count) > 0) {
        failedTraces++;
        daysDict[day].errorCount++;
      }
    }

    durations.sort((a, b) => a - b);
    const p50 = durations.length > 0 ? Number(percentile(durations, 0.5).toFixed(2)) : 0;
    const p95 = durations.length > 0 ? Number(percentile(durations, 0.95).toFixed(2)) : 0;
    const avgDur =
      durations.length > 0
        ? Number((durations.reduce((sum, v) => sum + v, 0) / durations.length).toFixed(2))
        : 0;
    const errorRatePct = totalTraces > 0 ? Number(((failedTraces / totalTraces) * 100).toFixed(2)) : 0;

    // 2. Load spans in time window for accurate parent attribution + percentile breakdowns
    const spanWhereSql = cutoffSec !== null ? "WHERE start_time >= ?" : "";
    const spanSelectSql = `
      SELECT
        span_id, trace_id, parent_span_id, step_name, component, step_type, status,
        start_time, end_time, duration_ms, ttft_ms,
        prompt_tokens, completion_tokens, total_tokens, tags_json, created_at
      FROM spans
      ${spanWhereSql}
    `;
    const rawSpanRows = (cutoffSec !== null
      ? db.prepare(spanSelectSql).all(cutoffSec)
      : db.prepare(spanSelectSql).all()) as any[];

    const allWindowSpans: LightSpanRow[] = rawSpanRows.map((r) => ({
      span_id: r.span_id,
      trace_id: r.trace_id,
      parent_span_id: r.parent_span_id || null,
      step_name: r.step_name || "",
      component: r.component || "",
      step_type: (r.step_type || "custom") as StepType,
      status: r.status || "success",
      start_time: Number(r.start_time || 0),
      end_time: Number(r.end_time || 0),
      duration_ms: Number(r.duration_ms || 0),
      ttft_ms: r.ttft_ms !== null && r.ttft_ms !== undefined ? Number(r.ttft_ms) : null,
      prompt_tokens: Number(r.prompt_tokens || 0),
      completion_tokens: Number(r.completion_tokens || 0),
      total_tokens: Number(r.total_tokens || 0),
      tags: parseJsonSafe(r.tags_json, {}),
      created_at: r.created_at || "",
    }));

    // Build parent lookup BEFORE duration filtering so child LLM calls keep their agent/hypothesis parent attribution
    const spanById = new Map<string, LightSpanRow>();
    for (const s of allWindowSpans) {
      spanById.set(s.span_id, s);
    }

    // Apply duration filter to spans
    const filteredSpans = allWindowSpans.filter((s) => {
      if (minDurationMs !== null && s.duration_ms < minDurationMs) return false;
      if (maxDurationMs !== null && s.duration_ms > maxDurationMs) return false;
      return true;
    });

    const totalSpans = filteredSpans.length;
    const promptTokens = filteredSpans.reduce((acc, s) => acc + s.prompt_tokens, 0);
    const completionTokens = filteredSpans.reduce((acc, s) => acc + s.completion_tokens, 0);
    const totalTokens = filteredSpans.reduce(
      (acc, s) => acc + (s.total_tokens || s.prompt_tokens + s.completion_tokens),
      0
    );
    const llmCalls = filteredSpans.filter((s) => s.step_type === "llm").length;
    const databaseCalls = filteredSpans.filter((s) => s.step_type === "database").length;

    // 3. Timeline
    const timeline = Object.keys(daysDict)
      .sort()
      .map((day) => {
        const entry = daysDict[day];
        const sortedDay = [...entry.durations].sort((a, b) => a - b);
        const cnt = entry.totalCount;
        const dP50 = sortedDay.length > 0 ? Number(percentile(sortedDay, 0.5).toFixed(2)) : 0;
        const dP95 = sortedDay.length > 0 ? Number(percentile(sortedDay, 0.95).toFixed(2)) : 0;
        const dAvg =
          sortedDay.length > 0
            ? Number((sortedDay.reduce((a, b) => a + b, 0) / sortedDay.length).toFixed(2))
            : 0;
        const dErrRate = cnt > 0 ? Number(((entry.errorCount / cnt) * 100).toFixed(2)) : 0;
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
          avg: dAvg,
          errorCount: entry.errorCount,
          errorRate: dErrRate,
        };
      });

    // 4. Component stats (with p50 & p95)
    const componentGroups = new Map<string, { step_type: StepType; component: string; spans: LightSpanRow[] }>();
    for (const s of filteredSpans) {
      const k = `${s.step_type}::${s.component}`;
      if (!componentGroups.has(k)) {
        componentGroups.set(k, { step_type: s.step_type, component: s.component, spans: [] });
      }
      componentGroups.get(k)!.spans.push(s);
    }

    const componentStats: ComponentStat[] = Array.from(componentGroups.values())
      .map((grp) => {
        const st = computeBreakdownStat(grp.component, grp.component, grp.spans);
        return {
          step_type: grp.step_type,
          component: grp.component,
          total_calls: st.total_calls,
          p50_duration_ms: st.p50_duration_ms,
          p95_duration_ms: st.p95_duration_ms,
          avg_duration_ms: st.avg_duration_ms,
          min_duration_ms: st.min_duration_ms,
          max_duration_ms: st.max_duration_ms,
          avg_ttft_ms: st.avg_ttft_ms,
          error_count: st.error_count,
          error_rate_pct: st.error_rate_pct,
          total_prompt_tokens: st.total_prompt_tokens,
          total_completion_tokens: st.total_completion_tokens,
        };
      })
      .sort((a, b) => b.total_calls - a.total_calls);

    // 4b. Agent Stats (Orchestrator, Tabular, Document, Database + any extra)
    const canonicalAgents: Array<{ key: string; label: string; subtitle: string }> = [
      { key: "orchestrator", label: "Orchestrator", subtitle: "agent.orchestrator" },
      { key: "tabular", label: "Tabular", subtitle: "agent.tabular" },
      { key: "document", label: "Document", subtitle: "agent.document" },
      { key: "database", label: "Database", subtitle: "agent.database" },
    ];
    const agentGroups = new Map<string, { label: string; subtitle: string; spans: LightSpanRow[] }>();
    for (const ca of canonicalAgents) {
      agentGroups.set(ca.key, { label: ca.label, subtitle: ca.subtitle, spans: [] });
    }
    for (const s of filteredSpans) {
      if (s.step_type !== "agent" || s.step_name.startsWith("invoke_")) continue;
      const meta = classifyAgentKey(s);
      if (!agentGroups.has(meta.key)) {
        agentGroups.set(meta.key, { label: meta.label, subtitle: meta.subtitle, spans: [] });
      }
      agentGroups.get(meta.key)!.spans.push(s);
    }
    const agentStats: BreakdownStat[] = Array.from(agentGroups.entries()).map(([key, grp]) =>
      computeBreakdownStat(key, grp.label, grp.spans, { subtitle: grp.subtitle, category: "agent" })
    );

    // 4c. Tool Calls Stats (each tool call)
    const toolGroups = new Map<string, { label: string; subtitle: string; category: string; spans: LightSpanRow[] }>();
    for (const s of filteredSpans) {
      if (!isToolCallSpan(s)) continue;
      const key = `${s.step_name}::${s.component}`;
      if (!toolGroups.has(key)) {
        toolGroups.set(key, {
          label: s.step_name || s.component,
          subtitle: s.component,
          category: s.step_type,
          spans: [],
        });
      }
      toolGroups.get(key)!.spans.push(s);
    }
    const toolStats: BreakdownStat[] = Array.from(toolGroups.entries())
      .map(([key, grp]) =>
        computeBreakdownStat(key, grp.label, grp.spans, { subtitle: grp.subtitle, category: grp.category })
      )
      .sort((a, b) => b.total_calls - a.total_calls || b.p95_duration_ms - a.p95_duration_ms);

    // 4d. LLM Calls Stats by Caller (Orchestrator, Tabular, Document, Database, Hypothesis + Direct if present)
    const canonicalLlmCallers: Array<{ key: string; label: string; subtitle: string }> = [
      { key: "orchestrator", label: "Orchestrator", subtitle: "agent.orchestrator" },
      { key: "tabular", label: "Tabular", subtitle: "agent.tabular" },
      { key: "document", label: "Document", subtitle: "agent.document" },
      { key: "database", label: "Database", subtitle: "agent.database" },
      { key: "hypothesis", label: "Hypothesis", subtitle: "tools.hypothesis" },
    ];
    const llmCallerGroups = new Map<string, { label: string; subtitle: string; spans: LightSpanRow[] }>();
    for (const cl of canonicalLlmCallers) {
      llmCallerGroups.set(cl.key, { label: cl.label, subtitle: cl.subtitle, spans: [] });
    }
    const directLlmSpans: LightSpanRow[] = [];
    const llmProviderGroups = new Map<string, { label: string; subtitle: string; spans: LightSpanRow[] }>();

    for (const s of filteredSpans) {
      if (s.step_type !== "llm") continue;

      const callerKey = classifyLlmCaller(s, spanById);
      if (llmCallerGroups.has(callerKey)) {
        llmCallerGroups.get(callerKey)!.spans.push(s);
      } else {
        directLlmSpans.push(s);
      }

      const provKey = s.component || s.step_name || "llm.unknown";
      const provLabel = provKey.replace(/^llm\./i, "");
      if (!llmProviderGroups.has(provKey)) {
        llmProviderGroups.set(provKey, {
          label: provLabel.charAt(0).toUpperCase() + provLabel.slice(1),
          subtitle: provKey,
          spans: [],
        });
      }
      llmProviderGroups.get(provKey)!.spans.push(s);
    }

    const llmStatsByCaller: BreakdownStat[] = Array.from(llmCallerGroups.entries()).map(([key, grp]) =>
      computeBreakdownStat(key, grp.label, grp.spans, { subtitle: grp.subtitle, category: "llm_caller" })
    );
    if (directLlmSpans.length > 0) {
      llmStatsByCaller.push(
        computeBreakdownStat("direct", "Direct / Standalone", directLlmSpans, {
          subtitle: "unattached llm calls",
          category: "llm_caller",
        })
      );
    }

    const llmStatsByProvider: BreakdownStat[] = Array.from(llmProviderGroups.entries())
      .map(([key, grp]) =>
        computeBreakdownStat(key, grp.label, grp.spans, { subtitle: grp.subtitle, category: "llm_provider" })
      )
      .sort((a, b) => b.total_calls - a.total_calls);

    // 5. Slowest spans (filtered by time window and duration)
    const slowestClauses: string[] = [];
    const slowestParams: any[] = [];
    if (cutoffSec !== null) {
      slowestClauses.push("start_time >= ?");
      slowestParams.push(cutoffSec);
    }
    if (minDurationMs !== null) {
      slowestClauses.push("duration_ms >= ?");
      slowestParams.push(minDurationMs);
    }
    if (maxDurationMs !== null) {
      slowestClauses.push("duration_ms <= ?");
      slowestParams.push(maxDurationMs);
    }
    const slowestWhereSql = slowestClauses.length > 0 ? `WHERE ${slowestClauses.join(" AND ")}` : "";
    const slowestQuery = `
      SELECT *
      FROM spans
      ${slowestWhereSql}
      ORDER BY duration_ms DESC
      LIMIT 20
    `;
    const slowestRows = db.prepare(slowestQuery).all(...slowestParams) as any[];
    const slowestSpans = slowestRows.map(rowToSpan);

    // 6. Recent requests (strictly USER REQUESTS only, excluding raw internal steps)
    const recentQuery = buildUserRequestSelectSql(whereSql, havingDurationSql, "ORDER BY start_time DESC LIMIT 100");
    const recentRows = db.prepare(recentQuery).all(...whereParams, ...havingDurationParams) as any[];
    const dbRecentTraces: TraceSummary[] = recentRows
      .map(mapRequestRowToSummary)
      .filter((t): t is TraceSummary => t !== null);

    db.close();

    const seenIds = new Set(dbRecentTraces.map((t) => t.trace_id));
    const jsonFallbackTraces = loadInvestigationSummariesFromFiles(dbPath, seenIds, {
      limit: 100,
      cutoffSec,
      minDurationMs,
      maxDurationMs,
    });
    const recentTraces = [...dbRecentTraces, ...jsonFallbackTraces]
      .sort((a, b) => b.start_time - a.start_time)
      .slice(0, 100);

    return {
      metrics: {
        totalTraces: Math.max(totalTraces, recentTraces.length),
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
      agentStats,
      toolStats,
      llmStatsByCaller,
      llmStatsByProvider,
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
  if (!dbPath) return loadInvestigationTreeFromFile(traceId, null);

  const DatabaseSync = getDatabaseSync();
  if (!DatabaseSync) return loadInvestigationTreeFromFile(traceId, dbPath);

  try {
    const db = new DatabaseSync(dbPath, { readOnly: true });
    const rows = db
      .prepare(
        `SELECT * FROM spans 
         WHERE trace_id = ? 
            OR json_extract(tags_json, '$.investigation_id') = ?
         ORDER BY COALESCE(json_extract(tags_json, '$.call_order'), 999999) ASC, start_time ASC`
      )
      .all(traceId, traceId) as any[];
    db.close();

    if (!rows || rows.length === 0) {
      return loadInvestigationTreeFromFile(traceId, dbPath);
    }

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
    return loadInvestigationTreeFromFile(traceId, dbPath);
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

    const query = buildUserRequestSelectSql("", havingStatus, "ORDER BY start_time DESC LIMIT ? OFFSET ?");
    const rows = db.prepare(query).all(limit, offset) as any[];
    db.close();

    const dbRequests = rows
      .map(mapRequestRowToSummary)
      .filter((t): t is TraceSummary => t !== null);

    if (offset === 0) {
      const seenIds = new Set(dbRequests.map((t) => t.trace_id));
      const jsonFallback = loadInvestigationSummariesFromFiles(dbPath, seenIds, { limit });
      const filteredJson = status
        ? jsonFallback.filter((t) =>
            status.toLowerCase() === "ok" || status.toLowerCase() === "success"
              ? t.error_count === 0
              : t.error_count > 0
          )
        : jsonFallback;
      return [...dbRequests, ...filteredJson].sort((a, b) => b.start_time - a.start_time).slice(0, limit);
    }

    return dbRequests;
  } catch (err) {
    console.error("Failed to query traces list from DB:", err);
    return null;
  }
}

/**
 * Deletes all spans associated with the specified trace IDs or investigation IDs.
 */
export function deleteTracesFromDb(traceIds: string[]): { success: boolean; deletedCount: number; error?: string } {
  if (!traceIds || traceIds.length === 0) return { success: true, deletedCount: 0 };

  const dbPath = resolveTracesDbPath();
  if (!dbPath) {
    const msg = "traces.db not found on any known path";
    console.error("deleteTracesFromDb failed:", msg);
    return { success: false, deletedCount: 0, error: msg };
  }

  const DatabaseSync = getDatabaseSync();
  if (!DatabaseSync) {
    const msg = "node:sqlite DatabaseSync not available in current Node runtime";
    console.error("deleteTracesFromDb failed:", msg);
    return { success: false, deletedCount: 0, error: msg };
  }

  try {
    const db = new DatabaseSync(dbPath);
    db.exec("PRAGMA busy_timeout = 5000;");

    let totalDeleted = 0;
    for (let i = 0; i < traceIds.length; i += 50) {
      const chunk = traceIds.slice(i, i + 50);
      const placeholders = chunk.map(() => "?").join(",");
      const stmt = db.prepare(`
        DELETE FROM spans
        WHERE trace_id IN (${placeholders})
           OR json_extract(tags_json, '$.investigation_id') IN (${placeholders})
           OR json_extract(tags_json, '$.request_id') IN (${placeholders})
      `);
      const res = stmt.run(...chunk, ...chunk, ...chunk) as any;
      totalDeleted += res?.changes || 0;
    }

    // Flush WAL changes if database is in WAL mode
    try {
      db.exec("PRAGMA wal_checkpoint(PASSIVE);");
    } catch {}

    db.close();

    // Clean up any exported investigation JSON files matching deleted traces
    try {
      const invDir = path.join(path.dirname(dbPath), "investigations");
      if (fs.existsSync(invDir)) {
        for (const tid of traceIds) {
          const f = path.join(invDir, `${tid}.json`);
          if (fs.existsSync(f)) {
            try {
              fs.unlinkSync(f);
            } catch {}
          }
        }
      }
    } catch {}

    return { success: true, deletedCount: totalDeleted };
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`Failed to delete traces from db at ${dbPath}:`, msg);
    return { success: false, deletedCount: 0, error: msg };
  }
}
