import type {
  ComponentStat,
  DashboardTelemetry,
  LatencyPoint,
  ServiceHealthItem,
  SpanRecord,
  TraceSummary,
  TraceTree,
  TrafficPoint,
} from "./types";

// ==========================================
// 1. DASHBOARD OVERVIEW TELEMETRY (QUARRY AI DATA PLATFORM)
// ==========================================

export const mockTrafficSeries: TrafficPoint[] = [
  { time: "10:00", requestsPerSec: 2.2 },
  { time: "10:03", requestsPerSec: 2.5 },
  { time: "10:05", requestsPerSec: 4.8 },
  { time: "10:08", requestsPerSec: 4.1 },
  { time: "10:10", requestsPerSec: 6.3 },
  { time: "10:13", requestsPerSec: 5.7 },
  { time: "10:15", requestsPerSec: 7.1 },
  { time: "10:18", requestsPerSec: 6.8 },
  { time: "10:20", requestsPerSec: 4.9 },
  { time: "10:23", requestsPerSec: 5.5 },
  { time: "10:25", requestsPerSec: 4.2 },
  { time: "10:28", requestsPerSec: 6.4 },
  { time: "10:30", requestsPerSec: 7.2 },
  { time: "10:33", requestsPerSec: 5.9 },
  { time: "10:35", requestsPerSec: 6.8 },
  { time: "10:38", requestsPerSec: 5.2 },
  { time: "10:40", requestsPerSec: 7.8 },
  { time: "10:42", requestsPerSec: 9.8 }, // Peak 9.8 investigations/sec
  { time: "10:45", requestsPerSec: 6.4 },
  { time: "10:48", requestsPerSec: 7.1 },
  { time: "10:50", requestsPerSec: 4.9 },
  { time: "10:53", requestsPerSec: 5.6 },
  { time: "10:55", requestsPerSec: 3.8 },
  { time: "10:58", requestsPerSec: 4.9 },
  { time: "11:00", requestsPerSec: 4.5 },
];

export const mockLatencySeries: LatencyPoint[] = [
  { time: "10:00", p50: 1.05, p95: 2.15, slo: 3.0 },
  { time: "10:05", p50: 1.10, p95: 2.38, slo: 3.0 },
  { time: "10:10", p50: 0.98, p95: 2.05, slo: 3.0 },
  { time: "10:15", p50: 1.02, p95: 2.18, slo: 3.0 },
  { time: "10:20", p50: 1.12, p95: 2.10, slo: 3.0 },
  { time: "10:25", p50: 0.95, p95: 2.45, slo: 3.0 },
  { time: "10:30", p50: 1.08, p95: 2.20, slo: 3.0 },
  { time: "10:35", p50: 1.02, p95: 2.32, slo: 3.0 },
  { time: "10:40", p50: 1.15, p95: 2.65, slo: 3.0 },
  { time: "10:42", p50: 1.38, p95: 3.78, slo: 3.0 }, // Transient LLM spike exceeding SLO 3.0s
  { time: "10:45", p50: 1.12, p95: 2.35, slo: 3.0 },
  { time: "10:50", p50: 1.06, p95: 2.22, slo: 3.0 },
  { time: "10:55", p50: 1.01, p95: 2.41, slo: 3.0 },
  { time: "11:00", p50: 1.04, p95: 2.28, slo: 3.0 },
];

export const mockServices: ServiceHealthItem[] = [
  { id: "s1", name: "Quarry API Gateway & Auth", p95_ms: 42, status: "healthy" },
  { id: "s2", name: "Investigation Orchestrator", p95_ms: 110, status: "healthy" },
  { id: "s3", name: "Tabular & DuckDB Engine", p95_ms: 185, status: "healthy" },
  { id: "s4", name: "SQL Database Agent", p95_ms: 240, status: "healthy" },
  { id: "s5", name: "Document RAG (Chroma + Reranker)", p95_ms: 320, status: "healthy" },
  { id: "s6", name: "Python Sandbox Worker", p95_ms: 480, status: "healthy" },
  { id: "s7", name: "LLM Engine (DeepInfra / Groq)", p95_ms: 2200, status: "latency_watch" },
];

export const mockRecentTraces: TraceSummary[] = [
  {
    trace_id: "trc_tab_9412a81f",
    time_display: "10:59:42",
    created_at: new Date(Date.now() - 18000).toISOString(),
    intent: "Tabular Analysis",
    status: "OK",
    latency_s: 2.45,
    total_duration_ms: 2450,
    total_spans: 6,
    error_count: 0,
    total_prompt_tokens: 1240,
    total_completion_tokens: 380,
    total_tokens: 1620,
    cost_usd: 0.0031,
    start_time: (Date.now() - 20450) / 1000,
    end_time: (Date.now() - 18000) / 1000,
    query: "Analyze revenue by region and product line for Q3, then generate a growth breakdown chart",
    user_id: "usr_quarry_9412",
    route: "Tabular & DuckDB",
  },
  {
    trace_id: "trc_doc_ea3caa8a",
    time_display: "10:59:37",
    created_at: new Date(Date.now() - 23000).toISOString(),
    intent: "Document RAG",
    status: "OK",
    latency_s: 1.88,
    total_duration_ms: 1880,
    total_spans: 4,
    error_count: 0,
    total_prompt_tokens: 850,
    total_completion_tokens: 220,
    total_tokens: 1070,
    cost_usd: 0.0022,
    start_time: (Date.now() - 24880) / 1000,
    end_time: (Date.now() - 23000) / 1000,
    query: "Citi Q1 2026 revenue growth and net income results from 10-Q filing",
    user_id: "usr_quarry_3821",
    route: "Document RAG (Chroma + BGE)",
  },
  {
    trace_id: "trc_sql_d3249b26",
    time_display: "10:59:31",
    created_at: new Date(Date.now() - 29000).toISOString(),
    intent: "Database Query",
    status: "OK",
    latency_s: 1.42,
    total_duration_ms: 1420,
    total_spans: 4,
    error_count: 0,
    total_prompt_tokens: 610,
    total_completion_tokens: 180,
    total_tokens: 790,
    cost_usd: 0.0016,
    start_time: (Date.now() - 30420) / 1000,
    end_time: (Date.now() - 29000) / 1000,
    query: "Inspect PostgreSQL schema and query high-value accounts with churn risk > 0.6",
    user_id: "usr_quarry_5104",
    route: "SQL Database Agent",
  },
  {
    trace_id: "trc_orch_6299d4e1",
    time_display: "10:59:26",
    created_at: new Date(Date.now() - 34000).toISOString(),
    intent: "Multi-Agent Investigation",
    status: "Timeout",
    latency_s: 5.12,
    total_duration_ms: 5120,
    total_spans: 5,
    error_count: 1,
    total_prompt_tokens: 1850,
    total_completion_tokens: 290,
    total_tokens: 2140,
    cost_usd: 0.0042,
    start_time: (Date.now() - 39120) / 1000,
    end_time: (Date.now() - 34000) / 1000,
    query: "Reconcile Stripe payouts against warehouse dispatch logs and explain any discrepancies over $1,000",
    user_id: "usr_quarry_6299",
    route: "Orchestrator Pipeline",
  },
  {
    trace_id: "trc_sql_c3a4b261",
    time_display: "10:59:19",
    created_at: new Date(Date.now() - 41000).toISOString(),
    intent: "SQL + Visualization",
    status: "OK",
    latency_s: 2.15,
    total_duration_ms: 2150,
    total_spans: 5,
    error_count: 0,
    total_prompt_tokens: 920,
    total_completion_tokens: 260,
    total_tokens: 1180,
    cost_usd: 0.0025,
    start_time: (Date.now() - 43150) / 1000,
    end_time: (Date.now() - 41000) / 1000,
    query: "Give me a bar chart showing the count of chats created each day in the current month",
    user_id: "usr_quarry_1109",
    route: "Database Agent + Charts",
  },
  {
    trace_id: "trc_doc_e1dd7520",
    time_display: "10:58:50",
    created_at: new Date(Date.now() - 70000).toISOString(),
    intent: "Document RAG",
    status: "OK",
    latency_s: 1.64,
    total_duration_ms: 1640,
    total_spans: 4,
    error_count: 0,
    total_prompt_tokens: 780,
    total_completion_tokens: 210,
    total_tokens: 990,
    cost_usd: 0.0021,
    start_time: (Date.now() - 71640) / 1000,
    end_time: (Date.now() - 70000) / 1000,
    query: "First quarter 2026 net income and earnings per share compared to first quarter 2025",
    user_id: "usr_quarry_4480",
    route: "Document RAG (Chroma + BGE)",
  },
  {
    trace_id: "trc_tab_847195ac",
    time_display: "10:58:12",
    created_at: new Date(Date.now() - 108000).toISOString(),
    intent: "Tabular Analysis",
    status: "OK",
    latency_s: 0.94,
    total_duration_ms: 940,
    total_spans: 3,
    error_count: 0,
    total_prompt_tokens: 420,
    total_completion_tokens: 110,
    total_tokens: 530,
    cost_usd: 0.0009,
    start_time: (Date.now() - 108940) / 1000,
    end_time: (Date.now() - 108000) / 1000,
    query: "How many total sales orders are recorded in the sales dataset?",
    user_id: "usr_quarry_2715",
    route: "DuckDB Direct Scan",
  },
  {
    trace_id: "trc_cache_4480c12e",
    time_display: "10:57:45",
    created_at: new Date(Date.now() - 135000).toISOString(),
    intent: "Semantic Cache Hit",
    status: "OK",
    latency_s: 0.04,
    total_duration_ms: 40,
    total_spans: 2,
    error_count: 0,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
    total_tokens: 0,
    cost_usd: 0.0,
    start_time: (Date.now() - 135040) / 1000,
    end_time: (Date.now() - 135000) / 1000,
    query: "What is our total active ARR and gross margin for current fiscal year?",
    user_id: "usr_quarry_8830",
    route: "Redis Semantic Cache",
  },
];

export const mockDashboardData: DashboardTelemetry = {
  metrics: {
    totalRequests: 18240,
    requestsChangePct: 12.4,
    requestRate: 5.1,
    peakRequestRate: 9.8,
    p95LatencySec: 2.8,
    targetLatencySec: 3.0,
    errorRatePct: 0.8,
    failedRequestsCount: 146,
    totalTokens: 17500000,
    inputTokens: 14200000,
    outputTokens: 3300000,
    llmSpendUsd: 38.64,
  },
  trafficSeries: mockTrafficSeries,
  latencySeries: mockLatencySeries,
  services: mockServices,
  alertBanner: {
    message: "LLM latency spike on deepinfra.create at 10:42 • recovered",
    level: "warning",
  },
  retrievalQuality: {
    noResultRatePct: 1.8,
    topK: 8,
    p95RetrievalMs: 312,
  },
  recentTraces: mockRecentTraces,
};

// ==========================================
// 2. DETAILED TRACE TREES (CLICK-TO-INSPECT)
// ==========================================

export const mockTraceTrees: Record<string, TraceTree> = {
  // Trace 1: trc_tab_9412a81f - Tabular Analysis & Visualizations
  trc_tab_9412a81f: {
    trace_id: "trc_tab_9412a81f",
    total_spans: 6,
    roots: [],
    spans: [
      {
        span_id: "sp_tab_01",
        trace_id: "trc_tab_9412a81f",
        parent_span_id: null,
        step_name: "orchestrator_agent_run",
        component: "agent.orchestrator",
        step_type: "agent",
        status: "success",
        start_time: 1731927580.0,
        end_time: 1731927582.45,
        duration_ms: 2450,
        prompt_tokens: 1240,
        completion_tokens: 380,
        total_tokens: 1620,
        inputs: {
          user_id: "usr_quarry_9412",
          session_id: "sess_quarry_8920",
          query: "Analyze revenue by region and product line for Q3, then generate a growth breakdown chart",
          mentioned_file_ids: ["file_sales_q3_2026.parquet"],
        },
        outputs: {
          intent: "tabular_analysis",
          dataset: "file_sales_q3_2026.parquet",
          summary: "Q3 revenue reached $4.82M across 4 regions. North America led with $2.14M (+18% YoY), driven by Enterprise Cloud subscriptions.",
          chart_generated: true,
          chart_type: "bar",
        },
        tags: {
          user_email: "alex.analyst@acme.corp",
          workspace_id: "ws_finance_core",
          route: "Tabular & DuckDB",
        },
        created_at: "2026-11-18T10:59:42Z",
      },
      {
        span_id: "sp_tab_02",
        trace_id: "trc_tab_9412a81f",
        parent_span_id: "sp_tab_01",
        step_name: "intent_classification_and_routing",
        component: "router.intent",
        step_type: "router",
        status: "success",
        start_time: 1731927580.02,
        end_time: 1731927580.12,
        duration_ms: 100,
        prompt_tokens: 110,
        completion_tokens: 20,
        total_tokens: 130,
        inputs: {
          text: "Analyze revenue by region and product line for Q3, then generate a growth breakdown chart",
          available_routes: ["tabular", "database", "document", "orchestrator"],
        },
        outputs: {
          confidence: 0.992,
          routed_to: "tabular_agent",
          entities: {
            dimensions: ["region", "product_line"],
            timeframe: "Q3 2026",
            visualization_requested: true,
          },
        },
        created_at: "2026-11-18T10:59:42Z",
      },
      {
        span_id: "sp_tab_03",
        trace_id: "trc_tab_9412a81f",
        parent_span_id: "sp_tab_01",
        step_name: "tabular_agent_run",
        component: "agent.tabular",
        step_type: "agent",
        status: "success",
        start_time: 1731927580.13,
        end_time: 1731927582.44,
        duration_ms: 2310,
        prompt_tokens: 1130,
        completion_tokens: 360,
        total_tokens: 1490,
        inputs: {
          objective: "Analyze revenue by region and product line for Q3, then generate a growth breakdown chart",
          file_id: "file_sales_q3_2026.parquet",
        },
        outputs: {
          rows_scanned: 48500,
          groups_computed: 16,
        },
        created_at: "2026-11-18T10:59:42Z",
      },
      {
        span_id: "sp_tab_04",
        trace_id: "trc_tab_9412a81f",
        parent_span_id: "sp_tab_03",
        step_name: "run_python_sandbox",
        component: "tool.tabular.run_python",
        step_type: "sandbox",
        status: "success",
        start_time: 1731927580.15,
        end_time: 1731927580.68,
        duration_ms: 530,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          code: "import duckdb\nimport pandas as pd\ndf = duckdb.query('''SELECT region, product_line, SUM(amount) as revenue, ROUND(SUM(amount) * 100.0 / SUM(SUM(amount)) OVER(), 2) as pct FROM 'data/sales_q3.parquet' GROUP BY region, product_line ORDER BY revenue DESC''').df()\nprint(df.to_json(orient='records'))",
        },
        outputs: {
          stdout: '[{"region":"North America","product_line":"Enterprise Cloud","revenue":2140000.0,"pct":44.4},{"region":"EMEA","product_line":"Enterprise Cloud","revenue":1320000.0,"pct":27.38},{"region":"APAC","product_line":"Developer Pro","revenue":820000.0,"pct":17.01},{"region":"LATAM","product_line":"Starter","revenue":540000.0,"pct":11.2}]',
          exit_code: 0,
        },
        created_at: "2026-11-18T10:59:42Z",
      },
      {
        span_id: "sp_tab_05",
        trace_id: "trc_tab_9412a81f",
        parent_span_id: "sp_tab_03",
        step_name: "deepinfra.create",
        component: "llm.deepinfra",
        step_type: "llm",
        status: "success",
        start_time: 1731927580.70,
        end_time: 1731927582.15,
        duration_ms: 1450,
        ttft_ms: 285,
        prompt_tokens: 920,
        completion_tokens: 320,
        total_tokens: 1240,
        inputs: {
          model: "openai/gpt-oss-120b",
          temperature: 0.1,
          messages: [
            { role: "system", content: "You are Quarry Tabular Analyst, synthesizing data analysis findings into executive summaries." },
            { role: "user", content: "Summarize the Q3 revenue distribution calculated in sandbox." },
          ],
        },
        outputs: {
          content: "Q3 revenue reached $4.82M across four global regions. North America represents the largest share at 44.4% ($2.14M), followed by EMEA at 27.4% ($1.32M). Enterprise Cloud remains the strongest revenue driver across all mature territories.",
        },
        tags: { provider: "deepinfra", model: "openai/gpt-oss-120b" },
        created_at: "2026-11-18T10:59:42Z",
      },
      {
        span_id: "sp_tab_06",
        trace_id: "trc_tab_9412a81f",
        parent_span_id: "sp_tab_03",
        step_name: "create_visualization",
        component: "tool.tabular.create_visualization",
        step_type: "tool",
        status: "success",
        start_time: 1731927582.16,
        end_time: 1731927582.44,
        duration_ms: 280,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          chart_type: "bar",
          title: "Q3 2026 Revenue by Region & Product Line",
          x_axis: "region",
          y_axis: "revenue",
          category: "product_line",
        },
        outputs: {
          chart_id: "cht_q3_rev_breakdown",
          status: "rendered",
        },
        created_at: "2026-11-18T10:59:42Z",
      },
    ],
  },

  // Trace 2: trc_doc_ea3caa8a - Document RAG (Real SEC filing query)
  trc_doc_ea3caa8a: {
    trace_id: "trc_doc_ea3caa8a",
    total_spans: 4,
    roots: [],
    spans: [
      {
        span_id: "sp_doc_01",
        trace_id: "trc_doc_ea3caa8a",
        parent_span_id: null,
        step_name: "document_agent_run",
        component: "agent.document",
        step_type: "agent",
        status: "success",
        start_time: 1731927575.0,
        end_time: 1731927576.88,
        duration_ms: 1880,
        prompt_tokens: 850,
        completion_tokens: 220,
        total_tokens: 1070,
        inputs: {
          user_id: "usr_quarry_3821",
          query: "Citi Q1 2026 revenue growth and net income results from 10-Q filing",
          file_ids: ["sec.gov_Archives_edgar_data_831001_citi_10q.pdf"],
        },
        outputs: {
          answer: "In Q1 2026, Citigroup reported total revenue of $21.1 billion, representing a 3% YoY increase. Net income rose to $3.4 billion ($1.58 per diluted share), up from $3.2 billion in Q1 2025, driven by higher investment banking fees and Services revenue.",
          citations: ["Item 1 - Financial Statements, p. 4", "Management Discussion & Analysis, p. 32"],
        },
        tags: {
          user_email: "sarah.research@capital.io",
          workspace_id: "ws_equity_research",
          route: "Document RAG",
        },
        created_at: "2026-11-18T10:59:37Z",
      },
      {
        span_id: "sp_doc_02",
        trace_id: "trc_doc_ea3caa8a",
        parent_span_id: "sp_doc_01",
        step_name: "chroma_query",
        component: "rag.chroma",
        step_type: "retriever",
        status: "success",
        start_time: 1731927575.05,
        end_time: 1731927575.48,
        duration_ms: 430,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          query: "Citi Q1 2026 revenue growth and net income results",
          top_k: 24,
          collection: "quarry_sec_filings",
        },
        outputs: {
          chunks_retrieved: 24,
          collection: "quarry_sec_filings",
        },
        created_at: "2026-11-18T10:59:37Z",
      },
      {
        span_id: "sp_doc_03",
        trace_id: "trc_doc_ea3caa8a",
        parent_span_id: "sp_doc_01",
        step_name: "cross_encoder_rerank",
        component: "rag.reranker",
        step_type: "reranker",
        status: "success",
        start_time: 1731927575.49,
        end_time: 1731927575.92,
        duration_ms: 430,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          model: "BAAI/bge-reranker-v2-m3",
          candidates_in: 24,
          top_k: 8,
        },
        outputs: {
          kept_out: 8,
          highest_score: 0.942,
          lowest_score: 0.781,
        },
        created_at: "2026-11-18T10:59:37Z",
      },
      {
        span_id: "sp_doc_04",
        trace_id: "trc_doc_ea3caa8a",
        parent_span_id: "sp_doc_01",
        step_name: "groq.create",
        component: "llm.groq",
        step_type: "llm",
        status: "success",
        start_time: 1731927575.94,
        end_time: 1731927576.87,
        duration_ms: 930,
        ttft_ms: 180,
        prompt_tokens: 850,
        completion_tokens: 220,
        total_tokens: 1070,
        inputs: {
          model: "llama-3.3-70b-versatile",
          temperature: 0.0,
        },
        outputs: {
          content: "In Q1 2026, Citigroup reported total revenue of $21.1 billion (+3% YoY) and net income of $3.4 billion ($1.58 per share).",
        },
        tags: { provider: "groq", model: "llama-3.3-70b-versatile" },
        created_at: "2026-11-18T10:59:37Z",
      },
    ],
  },

  // Trace 3: trc_sql_d3249b26 - SQL Database Agent
  trc_sql_d3249b26: {
    trace_id: "trc_sql_d3249b26",
    total_spans: 4,
    roots: [],
    spans: [
      {
        span_id: "sp_sql_01",
        trace_id: "trc_sql_d3249b26",
        parent_span_id: null,
        step_name: "database_agent_run",
        component: "agent.database",
        step_type: "agent",
        status: "success",
        start_time: 1731927571.0,
        end_time: 1731927572.42,
        duration_ms: 1420,
        prompt_tokens: 610,
        completion_tokens: 180,
        total_tokens: 790,
        inputs: {
          user_id: "usr_quarry_5104",
          objective: "Inspect PostgreSQL schema and query high-value accounts with churn risk > 0.6",
          connection_id: "conn_pg_prod_analytics",
        },
        outputs: {
          rows_returned: 14,
          highest_ltv_account: "Acme Logistics ($142,500 LTV, 0.72 churn risk)",
        },
        tags: {
          user_email: "marcus.ops@enterprise.co",
          workspace_id: "ws_crm_data",
          route: "SQL Database Agent",
        },
        created_at: "2026-11-18T10:59:31Z",
      },
      {
        span_id: "sp_sql_02",
        trace_id: "trc_sql_d3249b26",
        parent_span_id: "sp_sql_01",
        step_name: "inspect_database_schema",
        component: "tool.database.inspect_schema",
        step_type: "database",
        status: "success",
        start_time: 1731927571.05,
        end_time: 1731927571.22,
        duration_ms: 170,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          tables: ["public.customers", "public.orders", "public.churn_predictions"],
        },
        outputs: {
          tables_scanned: 3,
          primary_keys: ["customers.id", "orders.id", "churn_predictions.customer_id"],
        },
        created_at: "2026-11-18T10:59:31Z",
      },
      {
        span_id: "sp_sql_03",
        trace_id: "trc_sql_d3249b26",
        parent_span_id: "sp_sql_01",
        step_name: "execute_database_query",
        component: "tool.database.execute_query",
        step_type: "database",
        status: "success",
        start_time: 1731927571.24,
        end_time: 1731927571.48,
        duration_ms: 240,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          sql: "SELECT c.id, c.name, SUM(o.amount) as ltv, cp.risk_score FROM public.customers c JOIN public.orders o ON c.id = o.customer_id JOIN public.churn_predictions cp ON c.id = cp.customer_id GROUP BY c.id, c.name, cp.risk_score HAVING SUM(o.amount) > 50000 AND cp.risk_score > 0.6 ORDER BY ltv DESC LIMIT 20;",
        },
        outputs: {
          row_count: 14,
          execution_time_ms: 236,
        },
        created_at: "2026-11-18T10:59:31Z",
      },
      {
        span_id: "sp_sql_04",
        trace_id: "trc_sql_d3249b26",
        parent_span_id: "sp_sql_01",
        step_name: "deepinfra.create",
        component: "llm.deepinfra",
        step_type: "llm",
        status: "success",
        start_time: 1731927571.50,
        end_time: 1731927572.40,
        duration_ms: 900,
        ttft_ms: 260,
        prompt_tokens: 610,
        completion_tokens: 180,
        total_tokens: 790,
        inputs: {
          model: "openai/gpt-oss-120b",
        },
        outputs: {
          content: "Identified 14 high-value accounts exceeding $50k LTV that exhibit churn risk scores above 0.6. The top risk account is Acme Logistics ($142.5k LTV, 0.72 risk).",
        },
        tags: { provider: "deepinfra", model: "openai/gpt-oss-120b" },
        created_at: "2026-11-18T10:59:31Z",
      },
    ],
  },

  // Trace 4: trc_orch_6299d4e1 - Multi-Agent Investigation Timeout
  trc_orch_6299d4e1: {
    trace_id: "trc_orch_6299d4e1",
    total_spans: 5,
    roots: [],
    spans: [
      {
        span_id: "sp_orch_01",
        trace_id: "trc_orch_6299d4e1",
        parent_span_id: null,
        step_name: "orchestrator_agent_run",
        component: "agent.orchestrator",
        step_type: "agent",
        status: "error",
        start_time: 1731927560.0,
        end_time: 1731927565.12,
        duration_ms: 5120,
        prompt_tokens: 1850,
        completion_tokens: 290,
        total_tokens: 2140,
        inputs: {
          user_id: "usr_quarry_6299",
          query: "Reconcile Stripe payouts against warehouse dispatch logs and explain any discrepancies over $1,000",
        },
        error: {
          type: "SandboxTimeoutError",
          message: "Python sandbox execution timed out after 5000ms wall-clock limit during full outer cross-join without partitioned index.",
          traceback: "Traceback (most recent call last):\n  File \"/sandbox/worker.py\", line 142, in execute_code\n    res = run_isolated(code, timeout_ms=5000)\n  File \"/sandbox/executor.py\", line 89, in run_isolated\n    raise SandboxTimeoutError('Execution exceeded 5000ms limit')\nexceptions.SandboxTimeoutError: Execution exceeded 5000ms limit",
        },
        tags: {
          user_email: "elena.audit@globalfin.org",
          workspace_id: "ws_audit_prod",
          route: "Orchestrator Pipeline",
        },
        created_at: "2026-11-18T10:59:26Z",
      },
      {
        span_id: "sp_orch_02",
        trace_id: "trc_orch_6299d4e1",
        parent_span_id: "sp_orch_01",
        step_name: "invoke_database_agent",
        component: "orchestrator.tool.invoke_database_agent",
        step_type: "agent",
        status: "success",
        start_time: 1731927560.08,
        end_time: 1731927560.85,
        duration_ms: 770,
        prompt_tokens: 650,
        completion_tokens: 120,
        total_tokens: 770,
        inputs: {
          task: "Query Stripe payout ledger for last 30 days",
        },
        outputs: {
          record_count: 12400,
        },
        created_at: "2026-11-18T10:59:26Z",
      },
      {
        span_id: "sp_orch_03",
        trace_id: "trc_orch_6299d4e1",
        parent_span_id: "sp_orch_02",
        step_name: "execute_database_query",
        component: "tool.database.execute_query",
        step_type: "database",
        status: "success",
        start_time: 1731927560.10,
        end_time: 1731927560.82,
        duration_ms: 720,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          sql: "SELECT payout_id, amount, status, created_at FROM stripe_payouts WHERE created_at >= NOW() - INTERVAL '30 days';",
        },
        outputs: {
          row_count: 12400,
        },
        created_at: "2026-11-18T10:59:26Z",
      },
      {
        span_id: "sp_orch_04",
        trace_id: "trc_orch_6299d4e1",
        parent_span_id: "sp_orch_01",
        step_name: "invoke_tabular_agent",
        component: "agent.tabular",
        step_type: "agent",
        status: "error",
        start_time: 1731927560.88,
        end_time: 1731927565.10,
        duration_ms: 4220,
        prompt_tokens: 1200,
        completion_tokens: 170,
        total_tokens: 1370,
        inputs: {
          task: "Cross-reconcile 12.4k database records with warehouse dispatch logs CSV",
        },
        created_at: "2026-11-18T10:59:26Z",
      },
      {
        span_id: "sp_orch_05",
        trace_id: "trc_orch_6299d4e1",
        parent_span_id: "sp_orch_04",
        step_name: "run_python_sandbox",
        component: "tool.tabular.run_python",
        step_type: "sandbox",
        status: "error",
        start_time: 1731927560.92,
        end_time: 1731927565.08,
        duration_ms: 4160,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          code: "merged = pd.merge(payouts, dispatches, how='outer', on='tracking_ref')\ndiffs = merged[abs(merged['payout_amount'] - merged['dispatch_amount']) > 1000]",
        },
        error: {
          type: "SandboxTimeoutError",
          message: "Execution exceeded 5000ms wall-clock limit",
        },
        created_at: "2026-11-18T10:59:26Z",
      },
    ],
  },
};

// ==========================================
// 3. FALLBACK TRACE TREE GENERATOR (QUARRY AGENTS & TOOLS)
// ==========================================

export function getOrCreateTraceTree(traceId: string): TraceTree {
  if (mockTraceTrees[traceId]) {
    const tree = mockTraceTrees[traceId];
    if (!tree.roots || tree.roots.length === 0) {
      const byId = new Map<string, SpanRecord>();
      tree.spans.forEach((s) => byId.set(s.span_id, { ...s, children: [] }));
      const roots: SpanRecord[] = [];
      tree.spans.forEach((s) => {
        const item = byId.get(s.span_id)!;
        if (s.parent_span_id && byId.has(s.parent_span_id)) {
          byId.get(s.parent_span_id)!.children!.push(item);
        } else {
          roots.push(item);
        }
      });
      tree.roots = roots;
    }
    return tree;
  }

  // Derive intent from trace_id prefix
  const isDoc = traceId.includes("doc");
  const isSql = traceId.includes("sql") || traceId.includes("db");
  const isTab = traceId.includes("tab");
  const isTimeout = traceId.includes("6299");

  const rootStep = isDoc
    ? "document_agent_run"
    : isSql
    ? "database_agent_run"
    : isTab
    ? "tabular_agent_run"
    : "orchestrator_agent_run";

  const rootComponent = isDoc
    ? "agent.document"
    : isSql
    ? "agent.database"
    : isTab
    ? "agent.tabular"
    : "agent.orchestrator";

  const queryText = isDoc
    ? "Citi Q1 2026 revenue growth and net income results from 10-Q filing"
    : isSql
    ? "Count total registered users and inspect public schema"
    : isTab
    ? "Compute rolling 30-day cohort retention curve"
    : "Multi-agent autonomous data investigation";

  const rootSpanId = `spn_root_${traceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`;
  const child1Id = `spn_c1_${traceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`;
  const child2Id = `spn_c2_${traceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`;
  const child3Id = `spn_c3_${traceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}`;

  const nowSec = Date.now() / 1000;

  const spans: SpanRecord[] = [
    {
      span_id: rootSpanId,
      trace_id: traceId,
      parent_span_id: null,
      step_name: rootStep,
      component: rootComponent,
      step_type: "agent",
      status: isTimeout ? "error" : "success",
      start_time: nowSec - 2.5,
      end_time: nowSec,
      duration_ms: isTimeout ? 5120 : 1850,
      prompt_tokens: 820,
      completion_tokens: 240,
      total_tokens: 1060,
      inputs: {
        query: queryText,
        user_id: "usr_quarry_prod",
      },
      outputs: isTimeout
        ? undefined
        : {
            result: "Quarry agent execution completed successfully.",
            data_points_analyzed: 14200,
          },
      error: isTimeout
        ? {
            type: "ExecutionTimeout",
            message: "Operation timed out during multi-table join.",
          }
        : undefined,
      tags: {
        user_email: "analyst@quarry.data",
        workspace_id: "ws_analytics_prod",
        route: isDoc ? "Document RAG" : isSql ? "SQL Database Agent" : "Tabular & DuckDB",
      },
      created_at: new Date(Date.now() - 2500).toISOString(),
    },
    {
      span_id: child1Id,
      trace_id: traceId,
      parent_span_id: rootSpanId,
      step_name: isDoc ? "chroma_query" : isSql ? "inspect_database_schema" : "run_python_sandbox",
      component: isDoc ? "rag.chroma" : isSql ? "tool.database.inspect_schema" : "tool.tabular.run_python",
      step_type: isDoc ? "retriever" : isSql ? "database" : "sandbox",
      status: "success",
      start_time: nowSec - 2.4,
      end_time: nowSec - 1.8,
      duration_ms: 600,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      inputs: isDoc
        ? { query: queryText, top_k: 8 }
        : isSql
        ? { tables: ["public.users", "public.chats"] }
        : { code: "import duckdb\nprint(duckdb.query('SELECT count(*) FROM df').fetchall())" },
      outputs: isDoc
        ? { retrieved_chunks: 8 }
        : isSql
        ? { tables_found: 2 }
        : { stdout: "[(14200,)]" },
      created_at: new Date(Date.now() - 2400).toISOString(),
    },
    {
      span_id: child2Id,
      trace_id: traceId,
      parent_span_id: rootSpanId,
      step_name: isDoc ? "cross_encoder_rerank" : isSql ? "execute_database_query" : "deepinfra.create",
      component: isDoc ? "rag.reranker" : isSql ? "tool.database.execute_query" : "llm.deepinfra",
      step_type: isDoc ? "reranker" : isSql ? "database" : "llm",
      status: "success",
      start_time: nowSec - 1.7,
      end_time: nowSec - 1.0,
      duration_ms: 700,
      prompt_tokens: isTab ? 580 : 0,
      completion_tokens: isTab ? 160 : 0,
      total_tokens: isTab ? 740 : 0,
      inputs: isDoc
        ? { candidates_in: 8, top_k: 4 }
        : isSql
        ? { sql: "SELECT count(*) FROM public.chats;" }
        : { model: "openai/gpt-oss-120b" },
      outputs: isDoc
        ? { kept: 4 }
        : isSql
        ? { row_count: 1 }
        : { content: "Analysis complete." },
      created_at: new Date(Date.now() - 1700).toISOString(),
    },
    {
      span_id: child3Id,
      trace_id: traceId,
      parent_span_id: rootSpanId,
      step_name: isDoc ? "groq.create" : "deepinfra.create",
      component: isDoc ? "llm.groq" : "llm.deepinfra",
      step_type: "llm",
      status: isTimeout ? "error" : "success",
      start_time: nowSec - 0.9,
      end_time: nowSec - 0.05,
      duration_ms: 850,
      ttft_ms: 240,
      prompt_tokens: 650,
      completion_tokens: 180,
      total_tokens: 830,
      inputs: {
        model: isDoc ? "llama-3.3-70b-versatile" : "openai/gpt-oss-120b",
      },
      outputs: isTimeout ? undefined : { content: "Generated response from Quarry AI engine." },
      error: isTimeout ? { type: "Timeout", message: "Response timeout from upstream provider" } : undefined,
      created_at: new Date(Date.now() - 900).toISOString(),
    },
  ];

  const rootItem = { ...spans[0], children: spans.slice(1) };
  return {
    trace_id: traceId,
    total_spans: spans.length,
    roots: [rootItem],
    spans: spans,
  };
}

// ==========================================
// 4. COMPONENT & BOTTLENECK STATS (QUARRY ENGINES)
// ==========================================

export const mockComponentStats: ComponentStat[] = [
  {
    step_type: "agent",
    component: "agent.orchestrator",
    total_calls: 3240,
    avg_duration_ms: 2450,
    min_duration_ms: 820,
    max_duration_ms: 8900,
    avg_ttft_ms: null,
    error_count: 14,
    error_rate_pct: 0.43,
    total_prompt_tokens: 3890000,
    total_completion_tokens: 920000,
  },
  {
    step_type: "agent",
    component: "agent.tabular",
    total_calls: 5820,
    avg_duration_ms: 1850,
    min_duration_ms: 420,
    max_duration_ms: 7400,
    avg_ttft_ms: null,
    error_count: 22,
    error_rate_pct: 0.38,
    total_prompt_tokens: 5200000,
    total_completion_tokens: 1100000,
  },
  {
    step_type: "agent",
    component: "agent.database",
    total_calls: 4190,
    avg_duration_ms: 1420,
    min_duration_ms: 310,
    max_duration_ms: 6100,
    avg_ttft_ms: null,
    error_count: 18,
    error_rate_pct: 0.43,
    total_prompt_tokens: 2800000,
    total_completion_tokens: 650000,
  },
  {
    step_type: "agent",
    component: "agent.document",
    total_calls: 2980,
    avg_duration_ms: 2120,
    min_duration_ms: 640,
    max_duration_ms: 8200,
    avg_ttft_ms: null,
    error_count: 12,
    error_rate_pct: 0.4,
    total_prompt_tokens: 2310000,
    total_completion_tokens: 630000,
  },
  {
    step_type: "llm",
    component: "llm.deepinfra",
    total_calls: 14200,
    avg_duration_ms: 2200,
    min_duration_ms: 540,
    max_duration_ms: 6200,
    avg_ttft_ms: 285,
    error_count: 64,
    error_rate_pct: 0.45,
    total_prompt_tokens: 11400000,
    total_completion_tokens: 2600000,
  },
  {
    step_type: "llm",
    component: "llm.groq",
    total_calls: 4040,
    avg_duration_ms: 950,
    min_duration_ms: 280,
    max_duration_ms: 3200,
    avg_ttft_ms: 190,
    error_count: 16,
    error_rate_pct: 0.4,
    total_prompt_tokens: 2800000,
    total_completion_tokens: 700000,
  },
  {
    step_type: "retriever",
    component: "rag.chroma",
    total_calls: 5120,
    avg_duration_ms: 320,
    min_duration_ms: 85,
    max_duration_ms: 1450,
    avg_ttft_ms: null,
    error_count: 6,
    error_rate_pct: 0.12,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
  },
  {
    step_type: "reranker",
    component: "rag.reranker",
    total_calls: 4890,
    avg_duration_ms: 430,
    min_duration_ms: 120,
    max_duration_ms: 1850,
    avg_ttft_ms: null,
    error_count: 4,
    error_rate_pct: 0.08,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
  },
  {
    step_type: "sandbox",
    component: "tool.tabular.run_python",
    total_calls: 3940,
    avg_duration_ms: 480,
    min_duration_ms: 95,
    max_duration_ms: 5120,
    avg_ttft_ms: null,
    error_count: 28,
    error_rate_pct: 0.71,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
  },
  {
    step_type: "database",
    component: "tool.database.execute_query",
    total_calls: 4120,
    avg_duration_ms: 240,
    min_duration_ms: 45,
    max_duration_ms: 2980,
    avg_ttft_ms: null,
    error_count: 8,
    error_rate_pct: 0.19,
    total_prompt_tokens: 0,
    total_completion_tokens: 0,
  },
];

export const mockBottleneckSpans: SpanRecord[] = [
  {
    span_id: "spn_btn_01",
    trace_id: "trc_orch_6299d4e1",
    step_name: "run_python_sandbox",
    component: "tool.tabular.run_python",
    step_type: "sandbox",
    duration_ms: 5120,
    status: "error",
    created_at: new Date(Date.now() - 34000).toISOString(),
    start_time: 1731927560.0,
    end_time: 1731927565.12,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  },
  {
    span_id: "spn_btn_02",
    trace_id: "trc_tab_9412a81f",
    step_name: "deepinfra.create",
    component: "llm.deepinfra",
    step_type: "llm",
    duration_ms: 2200,
    status: "success",
    created_at: new Date(Date.now() - 18000).toISOString(),
    start_time: 1731927580.0,
    end_time: 1731927582.2,
    prompt_tokens: 920,
    completion_tokens: 320,
    total_tokens: 1240,
  },
  {
    span_id: "spn_btn_03",
    trace_id: "trc_doc_ea3caa8a",
    step_name: "cross_encoder_rerank",
    component: "rag.reranker",
    step_type: "reranker",
    duration_ms: 1850,
    status: "success",
    created_at: new Date(Date.now() - 23000).toISOString(),
    start_time: 1731927575.0,
    end_time: 1731927576.85,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  },
  {
    span_id: "spn_btn_04",
    trace_id: "trc_sql_d3249b26",
    step_name: "execute_database_query",
    component: "tool.database.execute_query",
    step_type: "database",
    duration_ms: 1420,
    status: "success",
    created_at: new Date(Date.now() - 29000).toISOString(),
    start_time: 1731927571.0,
    end_time: 1731927572.42,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  },
];
