import type { DashboardTelemetry } from "./types";

export const emptyTelemetryData: DashboardTelemetry = {
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
  recentTraces: [],
  slowestSpans: [],
};

