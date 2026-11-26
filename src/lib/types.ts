export type StepType =
  | "llm"
  | "retriever"
  | "reranker"
  | "generator"
  | "sandbox"
  | "tool"
  | "agent"
  | "router"
  | "database"
  | "custom";

export type SpanStatus = "success" | "error" | "running";

export interface SpanError {
  type: string;
  message: string;
  traceback?: string;
  code?: string | number;
  details?: Record<string, any>;
}

export interface SpanRecord {
  span_id: string;
  trace_id: string;
  parent_span_id?: string | null;
  step_name: string;
  component: string;
  step_type: StepType;
  status: SpanStatus;
  start_time: number;
  end_time: number;
  duration_ms: number;
  ttft_ms?: number | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  inputs?: Record<string, any> | null;
  outputs?: Record<string, any> | null;
  metrics?: Record<string, any> | null;
  error?: SpanError | null;
  tags?: Record<string, any> | null;
  created_at: string;
  children?: SpanRecord[];
}

export interface TraceSummary {
  trace_id: string;
  start_time: number;
  end_time: number;
  total_duration_ms: number;
  total_spans: number;
  error_count: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  created_at: string;
  // Dashboard & observability fields
  intent?: string;
  status?: "OK" | "Timeout" | "Error" | "success" | "error" | "running";
  latency_s?: number;
  cost_usd?: number;
  query?: string;
  user_id?: string;
  route?: string;
  time_display?: string;
}

/**
 * Validates that a trace represents an actual user request rather than an
 * unattached internal LLM or tool step (e.g. "Execution of deepinfra.create").
 */
export function isRealUserRequest(t: { query?: string; intent?: string; total_spans?: number }): boolean {
  if (!t.query) return false;
  const q = t.query.trim().toLowerCase();
  if (!q) return false;
  if (q.startsWith("execution of")) return false;
  if (q.startsWith("execute_") || q.startsWith("inspect_") || q.startsWith("list_")) return false;
  if (
    q.startsWith("deepinfra.") ||
    q.startsWith("openai.") ||
    q.startsWith("openrouter.") ||
    q.startsWith("cerebras.") ||
    q.startsWith("groq.") ||
    q.startsWith("run_python_sandbox") ||
    q.startsWith("search_documents")
  ) {
    return false;
  }
  return true;
}

export interface TraceTree {
  trace_id: string;
  total_spans: number;
  roots: SpanRecord[];
  spans: SpanRecord[];
}

export interface ComponentStat {
  step_type: StepType;
  component: string;
  total_calls: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  avg_ttft_ms?: number | null;
  error_count: number;
  error_rate_pct: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
}

export interface StepTimelinePoint {
  time: string;
  date: string;
  count: number;
  p50_ms: number;
  avg_ms: number;
  p95_ms: number;
  error_count: number;
  error_rate_pct: number;
}

export interface LatencyBucket {
  label: string;
  count: number;
}

export interface BreakdownStat {
  key: string;
  label: string;
  subtitle?: string;
  category?: string;
  total_calls: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  avg_ttft_ms?: number | null;
  error_count: number;
  error_rate_pct: number;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  timeline?: StepTimelinePoint[];
  histogram?: LatencyBucket[];
}

export interface TelemetryFilters {
  sinceHours?: number | null;
  minDurationMs?: number | null;
  maxDurationMs?: number | null;
}

export interface OverviewMetrics {
  totalTraces: number;
  totalSpans: number;
  p50LatencySec: number;
  p95LatencySec: number;
  avgLatencySec?: number;
  errorRatePct: number;
  failedTracesCount: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  llmCallsCount: number;
  databaseCallsCount: number;
}

export interface ActivityPoint {
  time: string;
  date?: string;
  count: number;
  p50?: number;
  p95?: number;
  avg?: number;
  errorCount?: number;
  errorRate?: number;
}

export interface LatencyPoint {
  time: string;
  date?: string;
  p50: number;
  p95: number;
  avg?: number;
}

export interface DashboardTelemetry {
  metrics: OverviewMetrics;
  timeline: ActivityPoint[];
  componentStats: ComponentStat[];
  agentStats: BreakdownStat[];
  toolStats: BreakdownStat[];
  llmStatsByCaller: BreakdownStat[];
  llmStatsByProvider: BreakdownStat[];
  recentTraces: TraceSummary[];
  slowestSpans: SpanRecord[];
}
