import type {
  DashboardTelemetry,
  LatencyPoint,
  ServiceHealthItem,
  SpanRecord,
  TraceSummary,
  TraceTree,
  TrafficPoint,
} from "./types";

// ==========================================
// 1. DASHBOARD OVERVIEW TELEMETRY (MATCHES SCREENSHOT)
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
  { time: "10:42", requestsPerSec: 9.8 }, // Peak 9.8 /s
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
  { time: "10:42", p50: 1.38, p95: 3.78, slo: 3.0 }, // Spike exceeding SLO 3.0s
  { time: "10:45", p50: 1.12, p95: 2.35, slo: 3.0 },
  { time: "10:50", p50: 1.06, p95: 2.22, slo: 3.0 },
  { time: "10:55", p50: 1.01, p95: 2.41, slo: 3.0 },
  { time: "11:00", p50: 1.04, p95: 2.28, slo: 3.0 },
];

export const mockServices: ServiceHealthItem[] = [
  { id: "s1", name: "API gateway + identity", p95_ms: 74, status: "healthy" },
  { id: "s2", name: "Chatbot backend", p95_ms: 128, status: "healthy" },
  { id: "s3", name: "RAG retrieval", p95_ms: 312, status: "healthy" },
  { id: "s4", name: "Products database", p95_ms: 96, status: "healthy" },
  { id: "s5", name: "Orders database", p95_ms: 180, status: "healthy" },
  { id: "s6", name: "LLM", p95_ms: 2200, status: "latency_watch" },
];

export const mockRecentTraces: TraceSummary[] = [
  {
    trace_id: "tr_8f2a91",
    time_display: "10:59:42",
    created_at: new Date(Date.now() - 18000).toISOString(),
    intent: "Product search",
    status: "OK",
    latency_s: 1.42,
    total_duration_ms: 1420,
    total_spans: 6,
    error_count: 0,
    total_prompt_tokens: 612,
    total_completion_tokens: 234,
    total_tokens: 846,
    cost_usd: 0.0018,
    start_time: (Date.now() - 19420) / 1000,
    end_time: (Date.now() - 18000) / 1000,
    query: "Find wireless noise-canceling headphones with >30 hours battery life under $250",
    user_id: "usr_blip_9412",
    route: "RAG + Catalog",
  },
  {
    trace_id: "tr_7c4b20",
    time_display: "10:59:37",
    created_at: new Date(Date.now() - 23000).toISOString(),
    intent: "Order status",
    status: "OK",
    latency_s: 1.86,
    total_duration_ms: 1860,
    total_spans: 5,
    error_count: 0,
    total_prompt_tokens: 720,
    total_completion_tokens: 192,
    total_tokens: 912,
    cost_usd: 0.0021,
    start_time: (Date.now() - 24860) / 1000,
    end_time: (Date.now() - 23000) / 1000,
    query: "Track delivery for order #BLIP-884920 placed yesterday",
    user_id: "usr_blip_3821",
    route: "Orders DB + Carrier API",
  },
  {
    trace_id: "tr_2e1d84",
    time_display: "10:59:31",
    created_at: new Date(Date.now() - 29000).toISOString(),
    intent: "Return policy",
    status: "OK",
    latency_s: 1.18,
    total_duration_ms: 1180,
    total_spans: 4,
    error_count: 0,
    total_prompt_tokens: 540,
    total_completion_tokens: 164,
    total_tokens: 704,
    cost_usd: 0.0014,
    start_time: (Date.now() - 30180) / 1000,
    end_time: (Date.now() - 29000) / 1000,
    query: "Can I return open-box electronics within 30 days of purchase?",
    user_id: "usr_blip_5104",
    route: "Policy Vector Search",
  },
  {
    trace_id: "tr_5a9e63",
    time_display: "10:59:26",
    created_at: new Date(Date.now() - 34000).toISOString(),
    intent: "Product comparison",
    status: "Timeout",
    latency_s: 4.21,
    total_duration_ms: 4210,
    total_spans: 6,
    error_count: 1,
    total_prompt_tokens: 980,
    total_completion_tokens: 224,
    total_tokens: 1204,
    cost_usd: 0.0028,
    start_time: (Date.now() - 38210) / 1000,
    end_time: (Date.now() - 34000) / 1000,
    query: "Compare Sony WH-1000XM5 vs Apple AirPods Max noise cancellation and battery life",
    user_id: "usr_blip_6299",
    route: "Multi-Agent Comparison",
  },
  {
    trace_id: "tr_6d3c72",
    time_display: "10:59:19",
    created_at: new Date(Date.now() - 41000).toISOString(),
    intent: "Product search",
    status: "OK",
    latency_s: 1.63,
    total_duration_ms: 1630,
    total_spans: 5,
    error_count: 0,
    total_prompt_tokens: 650,
    total_completion_tokens: 232,
    total_tokens: 882,
    cost_usd: 0.0019,
    start_time: (Date.now() - 42630) / 1000,
    end_time: (Date.now() - 41000) / 1000,
    query: "Show me ergonomic office chairs under $350 with lumbar support",
    user_id: "usr_blip_1109",
    route: "RAG + Catalog",
  },
  {
    trace_id: "tr_3b8a14",
    time_display: "10:58:50",
    created_at: new Date(Date.now() - 70000).toISOString(),
    intent: "Promo coupon",
    status: "OK",
    latency_s: 0.89,
    total_duration_ms: 890,
    total_spans: 3,
    error_count: 0,
    total_prompt_tokens: 410,
    total_completion_tokens: 110,
    total_tokens: 520,
    cost_usd: 0.0011,
    start_time: (Date.now() - 70890) / 1000,
    end_time: (Date.now() - 70000) / 1000,
    query: "Is there any active promo code for first time electronic orders?",
    user_id: "usr_blip_4480",
    route: "Promotions Cache",
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
    message: "LLM latency spike at 10:42 • recovered",
    level: "warning",
  },
  retrievalQuality: {
    noResultRatePct: 2.1,
    topK: 5,
    p95RetrievalMs: 312,
  },
  recentTraces: mockRecentTraces,
};

// ==========================================
// 2. DETAILED TRACE TREES (CLICK-TO-INSPECT)
// ==========================================

export const mockTraceTrees: Record<string, TraceTree> = {
  // Trace 1: tr_8f2a91 - Product Search
  tr_8f2a91: {
    trace_id: "tr_8f2a91",
    total_spans: 6,
    roots: [],
    spans: [
      {
        span_id: "sp_8f_01",
        trace_id: "tr_8f2a91",
        parent_span_id: null,
        step_name: "Shopping Assistant Orchestrator",
        component: "orchestrator.agent",
        step_type: "agent",
        status: "success",
        start_time: 1731927580.0,
        end_time: 1731927581.42,
        duration_ms: 1420,
        prompt_tokens: 612,
        completion_tokens: 234,
        total_tokens: 846,
        inputs: {
          user_id: "usr_blip_9412",
          session_id: "sess_cart_8920",
          query: "Find wireless noise-canceling headphones with >30 hours battery life under $250",
          filters: { category: "Audio", in_stock_only: true },
        },
        outputs: {
          intent: "product_search",
          matched_count: 3,
          recommended_item: "Sony WH-1000XM4 ($248.00)",
          reply:
            "I found 3 great options matching your criteria! The Sony WH-1000XM4 is currently on sale for $248.00 with 30-hour battery life and industry-leading active noise cancellation. Other great matches include Sennheiser Momentum 4 (60h battery, $229) and Anker Soundcore Space Q45 (50h battery, $149).",
        },
        tags: {
          user_email: "alex.tech@example.com",
          workspace_id: "ws_electronics_store",
          route: "RAG + Catalog",
        },
        created_at: "2026-11-18T10:59:42Z",
      },
      {
        span_id: "sp_8f_02",
        trace_id: "tr_8f2a91",
        parent_span_id: "sp_8f_01",
        step_name: "Intent Classification & Router",
        component: "router.semantic_intent",
        step_type: "router",
        status: "success",
        start_time: 1731927580.02,
        end_time: 1731927580.12,
        duration_ms: 100,
        prompt_tokens: 85,
        completion_tokens: 15,
        total_tokens: 100,
        inputs: {
          text: "Find wireless noise-canceling headphones with >30 hours battery life under $250",
          available_routes: ["product_search", "order_status", "returns", "policy_faq"],
        },
        outputs: {
          confidence: 0.984,
          routed_to: "product_search_pipeline",
          entities: {
            category: "headphones",
            features: ["wireless", "noise-canceling", ">30h battery"],
            max_price: 250,
          },
        },
        created_at: "2026-11-18T10:59:42Z",
      },
      {
        span_id: "sp_8f_03",
        trace_id: "tr_8f2a91",
        parent_span_id: "sp_8f_01",
        step_name: "Chroma Vector Store Search",
        component: "retriever.vector_search",
        step_type: "retriever",
        status: "success",
        start_time: 1731927580.13,
        end_time: 1731927580.44,
        duration_ms: 310,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          collection: "product_embeddings_v2",
          embedding_model: "text-embedding-3-small",
          query: "wireless noise-canceling headphones 30 hours battery life",
          top_k: 8,
          filter: { category: "Audio", in_stock: true },
        },
        outputs: {
          retrieved_chunks: [
            {
              id: "prod_sony_xm4",
              score: 0.92,
              title: "Sony WH-1000XM4 Wireless Headphones",
              price: 248.0,
              battery_hours: 30,
              anc: true,
            },
            {
              id: "prod_senn_m4",
              score: 0.89,
              title: "Sennheiser Momentum 4 Wireless",
              price: 229.95,
              battery_hours: 60,
              anc: true,
            },
            {
              id: "prod_anker_q45",
              score: 0.85,
              title: "Anker Soundcore Space Q45",
              price: 149.99,
              battery_hours: 50,
              anc: true,
            },
            {
              id: "prod_bose_qc45",
              score: 0.81,
              title: "Bose QuietComfort 45",
              price: 279.0,
              battery_hours: 24,
              anc: true,
            },
          ],
        },
        metrics: {
          similarity_threshold: 0.75,
          chunks_scanned: 14200,
        },
        created_at: "2026-11-18T10:59:42Z",
      },
      {
        span_id: "sp_8f_04",
        trace_id: "tr_8f2a91",
        parent_span_id: "sp_8f_01",
        step_name: "Cross-Encoder Precision Reranker",
        component: "reranker.bge_reranker",
        step_type: "reranker",
        status: "success",
        start_time: 1731927580.45,
        end_time: 1731927580.57,
        duration_ms: 120,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          model: "BAAI/bge-reranker-large",
          query: "wireless noise-canceling headphones battery >30 hours max price $250",
          candidate_count: 8,
          top_n: 3,
        },
        outputs: {
          ranked_results: [
            { id: "prod_sony_xm4", rerank_score: 0.965, rank: 1 },
            { id: "prod_senn_m4", rerank_score: 0.941, rank: 2 },
            { id: "prod_anker_q45", rerank_score: 0.892, rank: 3 },
          ],
        },
        created_at: "2026-11-18T10:59:42Z",
      },
      {
        span_id: "sp_8f_05",
        trace_id: "tr_8f2a91",
        parent_span_id: "sp_8f_01",
        step_name: "Postgres Products Inventory Verification",
        component: "database.postgres_products",
        step_type: "database",
        status: "success",
        start_time: 1731927580.58,
        end_time: 1731927580.66,
        duration_ms: 80,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          statement:
            "SELECT sku, name, current_price, inventory_quantity, warehouse_zone FROM products WHERE sku IN ('prod_sony_xm4', 'prod_senn_m4', 'prod_anker_q45') AND inventory_quantity > 0;",
        },
        outputs: {
          rows: [
            { sku: "prod_sony_xm4", name: "Sony WH-1000XM4", current_price: 248.0, inventory_quantity: 42, warehouse_zone: "East-01" },
            { sku: "prod_senn_m4", name: "Sennheiser Momentum 4", current_price: 229.95, inventory_quantity: 18, warehouse_zone: "West-03" },
            { sku: "prod_anker_q45", name: "Anker Soundcore Space Q45", current_price: 149.99, inventory_quantity: 85, warehouse_zone: "Central-02" },
          ],
          row_count: 3,
        },
        metrics: {
          db_execution_time_ms: 18.4,
          row_count: 3,
        },
        created_at: "2026-11-18T10:59:42Z",
      },
      {
        span_id: "sp_8f_06",
        trace_id: "tr_8f2a91",
        parent_span_id: "sp_8f_01",
        step_name: "DeepInfra LLM Synthesis",
        component: "llm.deepinfra",
        step_type: "llm",
        status: "success",
        start_time: 1731927580.67,
        end_time: 1731927581.41,
        duration_ms: 740,
        ttft_ms: 280,
        prompt_tokens: 527,
        completion_tokens: 219,
        total_tokens: 746,
        inputs: {
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
          temperature: 0.3,
          max_tokens: 512,
          messages: [
            {
              role: "system",
              content:
                "You are BlipCart Shopping Assistant. Use the verified product catalog data to present helpful comparisons.",
            },
            {
              role: "user",
              content:
                "Find wireless noise-canceling headphones with >30 hours battery life under $250. Retrieved items: Sony WH-1000XM4 ($248, 30h battery, in stock: 42), Sennheiser Momentum 4 ($229.95, 60h battery, in stock: 18), Anker Space Q45 ($149.99, 50h battery, in stock: 85).",
            },
          ],
        },
        outputs: {
          content:
            "I found 3 great options matching your criteria! The Sony WH-1000XM4 is currently on sale for $248.00 with 30-hour battery life and industry-leading active noise cancellation. Other great matches include Sennheiser Momentum 4 (60h battery, $229) and Anker Soundcore Space Q45 (50h battery, $149).",
        },
        tags: {
          provider: "deepinfra",
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
        },
        created_at: "2026-11-18T10:59:42Z",
      },
    ],
  },

  // Trace 2: tr_7c4b20 - Order Status
  tr_7c4b20: {
    trace_id: "tr_7c4b20",
    total_spans: 5,
    roots: [],
    spans: [
      {
        span_id: "sp_7c_01",
        trace_id: "tr_7c4b20",
        parent_span_id: null,
        step_name: "Customer Support Orchestrator",
        component: "orchestrator.agent",
        step_type: "agent",
        status: "success",
        start_time: 1731927575.0,
        end_time: 1731927576.86,
        duration_ms: 1860,
        prompt_tokens: 720,
        completion_tokens: 192,
        total_tokens: 912,
        inputs: {
          user_id: "usr_blip_3821",
          query: "Track delivery for order #BLIP-884920 placed yesterday",
        },
        outputs: {
          reply:
            "Good news! Your order #BLIP-884920 is currently Out for Delivery with FedEx (tracking #789043211048) and expected to arrive today before 4:30 PM.",
        },
        tags: {
          user_email: "sarah.jenkins@example.com",
          route: "Orders DB + Carrier API",
        },
        created_at: "2026-11-18T10:59:37Z",
      },
      {
        span_id: "sp_7c_02",
        trace_id: "tr_7c4b20",
        parent_span_id: "sp_7c_01",
        step_name: "Customer Identity & Order Verification",
        component: "tool.identity_verify",
        step_type: "tool",
        status: "success",
        start_time: 1731927575.05,
        end_time: 1731927575.18,
        duration_ms: 130,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          user_id: "usr_blip_3821",
          requested_order: "BLIP-884920",
        },
        outputs: {
          authorized: true,
          customer_name: "Sarah Jenkins",
          tier: "BlipCart Plus",
        },
        created_at: "2026-11-18T10:59:37Z",
      },
      {
        span_id: "sp_7c_03",
        trace_id: "tr_7c4b20",
        parent_span_id: "sp_7c_01",
        step_name: "Orders Database Query",
        component: "database.postgres_orders",
        step_type: "database",
        status: "success",
        start_time: 1731927575.2,
        end_time: 1731927575.38,
        duration_ms: 180,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          statement:
            "SELECT order_id, order_status, tracking_carrier, tracking_number, shipping_address, items_summary FROM orders WHERE order_id = 'BLIP-884920' AND customer_id = 'usr_blip_3821';",
        },
        outputs: {
          rows: [
            {
              order_id: "BLIP-884920",
              order_status: "SHIPPED",
              tracking_carrier: "FedEx",
              tracking_number: "789043211048",
              items_summary: "Logitech MX Master 3S Mouse (Black)",
            },
          ],
          row_count: 1,
        },
        metrics: {
          db_execution_time_ms: 24.1,
          row_count: 1,
        },
        created_at: "2026-11-18T10:59:37Z",
      },
      {
        span_id: "sp_7c_04",
        trace_id: "tr_7c4b20",
        parent_span_id: "sp_7c_01",
        step_name: "FedEx Carrier Real-time Tracking API",
        component: "tool.carrier_tracker",
        step_type: "tool",
        status: "success",
        start_time: 1731927575.39,
        end_time: 1731927575.88,
        duration_ms: 490,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          carrier: "FedEx",
          tracking_number: "789043211048",
        },
        outputs: {
          current_status: "OUT_FOR_DELIVERY",
          last_checkpoint: "Local Delivery Facility, Austin TX at 08:15 AM",
          estimated_delivery: "Today by 4:30 PM",
        },
        created_at: "2026-11-18T10:59:37Z",
      },
      {
        span_id: "sp_7c_05",
        trace_id: "tr_7c4b20",
        parent_span_id: "sp_7c_01",
        step_name: "DeepInfra LLM Response Generation",
        component: "llm.deepinfra",
        step_type: "llm",
        status: "success",
        start_time: 1731927575.89,
        end_time: 1731927576.85,
        duration_ms: 960,
        ttft_ms: 310,
        prompt_tokens: 720,
        completion_tokens: 192,
        total_tokens: 912,
        inputs: {
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
          messages: [
            {
              role: "system",
              content: "You are the BlipCart Customer Assistant. Provide a warm, concise status update.",
            },
            {
              role: "user",
              content:
                "Order BLIP-884920: Item: Logitech MX Master 3S. Status: Out for Delivery by FedEx (#789043211048), estimated today by 4:30 PM.",
            },
          ],
        },
        outputs: {
          content:
            "Good news! Your order #BLIP-884920 is currently Out for Delivery with FedEx (tracking #789043211048) and expected to arrive today before 4:30 PM.",
        },
        tags: {
          provider: "deepinfra",
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
        },
        created_at: "2026-11-18T10:59:37Z",
      },
    ],
  },

  // Trace 3: tr_5a9e63 - TIMEOUT & FAILURE TRACE
  tr_5a9e63: {
    trace_id: "tr_5a9e63",
    total_spans: 6,
    roots: [],
    spans: [
      {
        span_id: "sp_5a_01",
        trace_id: "tr_5a9e63",
        parent_span_id: null,
        step_name: "Product Comparison Orchestrator",
        component: "orchestrator.agent",
        step_type: "agent",
        status: "error",
        start_time: 1731927560.0,
        end_time: 1731927564.21,
        duration_ms: 4210,
        prompt_tokens: 980,
        completion_tokens: 224,
        total_tokens: 1204,
        inputs: {
          user_id: "usr_blip_6299",
          query: "Compare Sony WH-1000XM5 vs Apple AirPods Max noise cancellation and battery life",
        },
        outputs: null,
        error: {
          type: "GatewayTimeoutError",
          message: "Upstream LLM completion endpoint failed to respond within 4000ms deadline (duration: 4,210ms)",
          code: "504_GATEWAY_TIMEOUT",
          traceback: `Traceback (most recent call last):
  File "/app/services/orchestrator.py", line 184, in execute_pipeline
    response = await self.llm_gateway.generate(messages=prompt_context, timeout=4.0)
  File "/app/core/llm_client.py", line 92, in generate
    raise asyncio.TimeoutError("Upstream LLM request exceeded 4000ms timeout threshold")
asyncio.exceptions.TimeoutError: Upstream LLM request exceeded 4000ms timeout threshold

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/app/api/monitoring_middleware.py", line 58, in __call__
    return await self.app(scope, receive, send)
  File "/app/routes/chat.py", line 112, in handle_chat_request
    result = await orchestrator.run_investigation(request.query)
GatewayTimeoutError: Upstream LLM completion endpoint failed to respond within 4000ms deadline (duration: 4,210ms)`,
        },
        tags: {
          user_email: "marcus.v@example.com",
          route: "Multi-Agent Comparison",
        },
        created_at: "2026-11-18T10:59:26Z",
      },
      {
        span_id: "sp_5a_02",
        trace_id: "tr_5a9e63",
        parent_span_id: "sp_5a_01",
        step_name: "Intent Classification",
        component: "router.semantic_intent",
        step_type: "router",
        status: "success",
        start_time: 1731927560.02,
        end_time: 1731927560.14,
        duration_ms: 120,
        prompt_tokens: 90,
        completion_tokens: 18,
        total_tokens: 108,
        inputs: {
          query: "Compare Sony WH-1000XM5 vs Apple AirPods Max noise cancellation and battery life",
        },
        outputs: {
          intent: "product_comparison",
          items: ["Sony WH-1000XM5", "Apple AirPods Max"],
        },
        created_at: "2026-11-18T10:59:26Z",
      },
      {
        span_id: "sp_5a_03",
        trace_id: "tr_5a9e63",
        parent_span_id: "sp_5a_01",
        step_name: "Catalog Specs Retrieval",
        component: "tool.specs_retriever",
        step_type: "tool",
        status: "success",
        start_time: 1731927560.15,
        end_time: 1731927560.42,
        duration_ms: 270,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          products: ["Sony WH-1000XM5", "Apple AirPods Max"],
          attributes: ["anc_rating", "battery_hours", "weight", "price"],
        },
        outputs: {
          specs: {
            "Sony WH-1000XM5": { price: 398, battery: 30, anc_score: 9.6, weight_g: 250 },
            "Apple AirPods Max": { price: 549, battery: 20, anc_score: 9.4, weight_g: 384 },
          },
        },
        created_at: "2026-11-18T10:59:26Z",
      },
      {
        span_id: "sp_5a_04",
        trace_id: "tr_5a9e63",
        parent_span_id: "sp_5a_01",
        step_name: "Python Sandbox Comparison Compute",
        component: "sandbox.python_exec",
        step_type: "sandbox",
        status: "success",
        start_time: 1731927560.43,
        end_time: 1731927560.68,
        duration_ms: 250,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          code: `# Compute normalized cost-to-battery and weight ratios
sony = {"price": 398, "battery": 30, "weight": 250}
apple = {"price": 549, "battery": 20, "weight": 384}
cost_per_hour_sony = round(sony["price"] / sony["battery"], 2)
cost_per_hour_apple = round(apple["price"] / apple["battery"], 2)
weight_diff_pct = round(((apple["weight"] - sony["weight"]) / sony["weight"]) * 100, 1)
print(f"Sony cost/hr: \${cost_per_hour_sony}, Apple: \${cost_per_hour_apple}")
print(f"AirPods Max are {weight_diff_pct}% heavier than XM5")`,
        },
        outputs: {
          stdout: `Sony cost/hr: \$13.27, Apple: \$27.45
AirPods Max are 53.6% heavier than XM5`,
          stderr: "",
          exit_code: 0,
        },
        created_at: "2026-11-18T10:59:26Z",
      },
      {
        span_id: "sp_5a_05",
        trace_id: "tr_5a9e63",
        parent_span_id: "sp_5a_01",
        step_name: "DeepInfra LLM Synthesis (Primary Gateway)",
        component: "llm.deepinfra",
        step_type: "llm",
        status: "error",
        start_time: 1731927560.69,
        end_time: 1731927564.20,
        duration_ms: 3510,
        ttft_ms: null,
        prompt_tokens: 890,
        completion_tokens: 0,
        total_tokens: 890,
        inputs: {
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
          timeout_sec: 3.5,
          messages: [
            {
              role: "system",
              content: "You are the BlipCart Comparative Shopping Expert.",
            },
            {
              role: "user",
              content:
                "Write detailed comparison for Sony WH-1000XM5 vs Apple AirPods Max incorporating ANC benchmarks and battery efficiency.",
            },
          ],
        },
        outputs: null,
        error: {
          type: "TimeoutError",
          message: "HTTP POST https://api.deepinfra.com/v1/openai/chat/completions timed out after 3500ms",
          code: 504,
          traceback: `Traceback (most recent call last):
  File "aiohttp/client.py", line 608, in _request
    await asyncio.sleep(timeout)
asyncio.exceptions.TimeoutError: Request to DeepInfra upstream cluster timed out`,
        },
        tags: {
          provider: "deepinfra",
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
        },
        created_at: "2026-11-18T10:59:26Z",
      },
    ],
  },

  // Trace 4: tr_2e1d84 - Return Policy
  tr_2e1d84: {
    trace_id: "tr_2e1d84",
    total_spans: 4,
    roots: [],
    spans: [
      {
        span_id: "sp_2e_01",
        trace_id: "tr_2e1d84",
        parent_span_id: null,
        step_name: "Policy Assistant",
        component: "orchestrator.agent",
        step_type: "agent",
        status: "success",
        start_time: 1731927570.0,
        end_time: 1731927571.18,
        duration_ms: 1180,
        prompt_tokens: 540,
        completion_tokens: 164,
        total_tokens: 704,
        inputs: {
          user_id: "usr_blip_5104",
          query: "Can I return open-box electronics within 30 days of purchase?",
        },
        outputs: {
          reply:
            "Yes! BlipCart offers a 30-day return window for open-box electronics as long as all original accessories and packaging are included. A free prepaid return shipping label can be generated from your Orders page.",
        },
        tags: {
          user_email: "lisa.m@example.com",
          route: "Policy Vector Search",
        },
        created_at: "2026-11-18T10:59:31Z",
      },
      {
        span_id: "sp_2e_02",
        trace_id: "tr_2e1d84",
        parent_span_id: "sp_2e_01",
        step_name: "Policy Document Retriever",
        component: "retriever.vector_search",
        step_type: "retriever",
        status: "success",
        start_time: 1731927570.05,
        end_time: 1731927570.32,
        duration_ms: 270,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          collection: "blipcart_store_policies",
          query: "open box electronics 30 day return refund policy",
          top_k: 3,
        },
        outputs: {
          chunks: [
            {
              doc_id: "doc_returns_sec_4",
              score: 0.94,
              text: "Section 4.2: Electronics & Wearables. Open-box electronics are eligible for full refund within 30 days of delivery. Must contain original cables, power adapters, and undamaged manufacturer box.",
            },
          ],
        },
        created_at: "2026-11-18T10:59:31Z",
      },
      {
        span_id: "sp_2e_03",
        trace_id: "tr_2e1d84",
        parent_span_id: "sp_2e_01",
        step_name: "DeepInfra LLM Synthesis",
        component: "llm.deepinfra",
        step_type: "llm",
        status: "success",
        start_time: 1731927570.33,
        end_time: 1731927571.17,
        duration_ms: 840,
        ttft_ms: 290,
        prompt_tokens: 540,
        completion_tokens: 164,
        total_tokens: 704,
        inputs: {
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
          messages: [
            { role: "system", content: "Summarize store return policies accurately." },
            { role: "user", content: "Can I return open-box electronics within 30 days?" },
          ],
        },
        outputs: {
          content:
            "Yes! BlipCart offers a 30-day return window for open-box electronics as long as all original accessories and packaging are included. A free prepaid return shipping label can be generated from your Orders page.",
        },
        created_at: "2026-11-18T10:59:31Z",
      },
    ],
  },

  // Trace 5: tr_6d3c72 - Product Search
  tr_6d3c72: {
    trace_id: "tr_6d3c72",
    total_spans: 5,
    roots: [],
    spans: [
      {
        span_id: "sp_6d_01",
        trace_id: "tr_6d3c72",
        parent_span_id: null,
        step_name: "Furniture & Workspace Assistant",
        component: "orchestrator.agent",
        step_type: "agent",
        status: "success",
        start_time: 1731927555.0,
        end_time: 1731927556.63,
        duration_ms: 1630,
        prompt_tokens: 650,
        completion_tokens: 232,
        total_tokens: 882,
        inputs: {
          user_id: "usr_blip_1109",
          query: "Show me ergonomic office chairs under $350 with lumbar support",
        },
        outputs: {
          reply:
            "Here are the top-rated ergonomic office chairs under $350 with dedicated adjustable lumbar support: 1. Branch Ergonomic Chair ($329), 2. Autonomous ErgoChair Pro ($349 on sale), 3. SIHOO Doro C300 ($299). All include 5-year warranties.",
        },
        tags: {
          user_email: "kevin.o@example.com",
          route: "RAG + Catalog",
        },
        created_at: "2026-11-18T10:59:19Z",
      },
      {
        span_id: "sp_6d_02",
        trace_id: "tr_6d3c72",
        parent_span_id: "sp_6d_01",
        step_name: "Catalog Vector Search",
        component: "retriever.vector_search",
        step_type: "retriever",
        status: "success",
        start_time: 1731927555.08,
        end_time: 1731927555.39,
        duration_ms: 310,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          collection: "furniture_catalog",
          query: "ergonomic office chairs adjustable lumbar support under 350",
          top_k: 5,
        },
        outputs: {
          matches: [
            { id: "chair_branch_ergo", score: 0.93, price: 329.0 },
            { id: "chair_autonomous_pro", score: 0.91, price: 349.0 },
            { id: "chair_sihoo_c300", score: 0.88, price: 299.0 },
          ],
        },
        created_at: "2026-11-18T10:59:19Z",
      },
      {
        span_id: "sp_6d_03",
        trace_id: "tr_6d3c72",
        parent_span_id: "sp_6d_01",
        step_name: "Postgres Stock & Pricing Check",
        component: "database.postgres_products",
        step_type: "database",
        status: "success",
        start_time: 1731927555.4,
        end_time: 1731927555.51,
        duration_ms: 110,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        inputs: {
          statement:
            "SELECT sku, name, current_price, stock_count FROM inventory WHERE sku IN ('chair_branch_ergo', 'chair_autonomous_pro', 'chair_sihoo_c300');",
        },
        outputs: {
          rows: [
            { sku: "chair_branch_ergo", name: "Branch Ergonomic Chair", current_price: 329.0, stock_count: 14 },
            { sku: "chair_autonomous_pro", name: "Autonomous ErgoChair Pro", current_price: 349.0, stock_count: 9 },
            { sku: "chair_sihoo_c300", name: "SIHOO Doro C300", current_price: 299.0, stock_count: 22 },
          ],
          row_count: 3,
        },
        created_at: "2026-11-18T10:59:19Z",
      },
      {
        span_id: "sp_6d_04",
        trace_id: "tr_6d3c72",
        parent_span_id: "sp_6d_01",
        step_name: "DeepInfra LLM Synthesis",
        component: "llm.deepinfra",
        step_type: "llm",
        status: "success",
        start_time: 1731927555.52,
        end_time: 1731927556.62,
        duration_ms: 1100,
        ttft_ms: 340,
        prompt_tokens: 650,
        completion_tokens: 232,
        total_tokens: 882,
        inputs: {
          model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
          messages: [
            { role: "system", content: "You are the BlipCart Home Office Assistant." },
            { role: "user", content: "Recommend ergonomic chairs under $350 with lumbar support." },
          ],
        },
        outputs: {
          content:
            "Here are the top-rated ergonomic office chairs under $350 with dedicated adjustable lumbar support: 1. Branch Ergonomic Chair ($329), 2. Autonomous ErgoChair Pro ($349 on sale), 3. SIHOO Doro C300 ($299). All include 5-year warranties.",
        },
        created_at: "2026-11-18T10:59:19Z",
      },
    ],
  },
};

// Wire up root spans for each trace tree if empty
for (const traceId of Object.keys(mockTraceTrees)) {
  const tree = mockTraceTrees[traceId];
  if (tree.roots.length === 0) {
    const root = tree.spans.find((s) => !s.parent_span_id);
    if (root) {
      root.children = tree.spans.filter((s) => s.parent_span_id === root.span_id);
      tree.roots = [root];
    } else if (tree.spans.length > 0) {
      tree.roots = [tree.spans[0]];
    }
  }
}

/**
 * Returns a fallback trace tree if a trace ID is requested that isn't in mockTraceTrees.
 */
export function getOrCreateTraceTree(traceId: string): TraceTree {
  if (mockTraceTrees[traceId]) {
    return mockTraceTrees[traceId];
  }

  // Generate dynamic realistic tree for unknown trace
  const rootSpan: SpanRecord = {
    span_id: `sp_${traceId}_root`,
    trace_id: traceId,
    parent_span_id: null,
    step_name: "Shopping Assistant Orchestrator",
    component: "orchestrator.agent",
    step_type: "agent",
    status: "success",
    start_time: (Date.now() - 1500) / 1000,
    end_time: Date.now() / 1000,
    duration_ms: 1500,
    prompt_tokens: 580,
    completion_tokens: 180,
    total_tokens: 760,
    inputs: {
      trace_id: traceId,
      query: `Live request execution for trace ${traceId}`,
    },
    outputs: {
      result: `Completed analysis and response pipeline for request ${traceId}`,
    },
    tags: {
      route: "Interactive Chatbot Flow",
      user_id: "usr_blip_live",
    },
    created_at: new Date().toISOString(),
  };

  const routerSpan: SpanRecord = {
    span_id: `sp_${traceId}_router`,
    trace_id: traceId,
    parent_span_id: rootSpan.span_id,
    step_name: "Intent Classifier",
    component: "router.semantic_intent",
    step_type: "router",
    status: "success",
    start_time: rootSpan.start_time + 0.05,
    end_time: rootSpan.start_time + 0.15,
    duration_ms: 100,
    prompt_tokens: 80,
    completion_tokens: 20,
    total_tokens: 100,
    inputs: { query: `Intent classification for ${traceId}` },
    outputs: { intent: "product_search", confidence: 0.99 },
    created_at: new Date().toISOString(),
  };

  const retrieverSpan: SpanRecord = {
    span_id: `sp_${traceId}_retriever`,
    trace_id: traceId,
    parent_span_id: rootSpan.span_id,
    step_name: "Vector Store Retrieval",
    component: "retriever.vector_search",
    step_type: "retriever",
    status: "success",
    start_time: rootSpan.start_time + 0.16,
    end_time: rootSpan.start_time + 0.48,
    duration_ms: 320,
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    inputs: { collection: "product_catalog", top_k: 5 },
    outputs: { retrieved_documents: 5 },
    created_at: new Date().toISOString(),
  };

  const llmSpan: SpanRecord = {
    span_id: `sp_${traceId}_llm`,
    trace_id: traceId,
    parent_span_id: rootSpan.span_id,
    step_name: "LLM Response Generation",
    component: "llm.deepinfra",
    step_type: "llm",
    status: "success",
    start_time: rootSpan.start_time + 0.49,
    end_time: rootSpan.end_time,
    duration_ms: 1010,
    ttft_ms: 290,
    prompt_tokens: 500,
    completion_tokens: 160,
    total_tokens: 660,
    inputs: {
      model: "meta-llama/Meta-Llama-3.1-70B-Instruct",
      temperature: 0.3,
    },
    outputs: {
      content: `Generated response payload for request ${traceId}.`,
    },
    created_at: new Date().toISOString(),
  };

  rootSpan.children = [routerSpan, retrieverSpan, llmSpan];

  return {
    trace_id: traceId,
    total_spans: 4,
    roots: [rootSpan],
    spans: [rootSpan, routerSpan, retrieverSpan, llmSpan],
  };
}
