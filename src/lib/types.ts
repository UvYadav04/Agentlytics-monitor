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
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  avg_ttft_ms?: number | null;
  error_count: number;
  error_rate_pct: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
}

export interface ServiceHealthItem {
  id: string;
  name: string;
  p95_ms: number;
  status: "healthy" | "latency_watch" | "degraded" | "down";
}

export interface TrafficPoint {
  time: string;
  requestsPerSec: number;
}

export interface LatencyPoint {
  time: string;
  p50: number;
  p95: number;
  slo: number;
}

export interface DashboardTelemetry {
  metrics: {
    totalRequests: number;
    requestsChangePct: number;
    requestRate: number;
    peakRequestRate: number;
    p95LatencySec: number;
    targetLatencySec: number;
    errorRatePct: number;
    failedRequestsCount: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    llmSpendUsd: number;
  };
  trafficSeries: TrafficPoint[];
  latencySeries: LatencyPoint[];
  services: ServiceHealthItem[];
  alertBanner?: {
    message: string;
    level: "warning" | "error" | "info";
  } | null;
  retrievalQuality: {
    noResultRatePct: number;
    topK: number;
    p95RetrievalMs: number;
  };
  recentTraces: TraceSummary[];
}
