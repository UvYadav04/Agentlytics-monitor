"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bot,
  RefreshCw,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import { BreakdownErrorChart, BreakdownLatencyChart } from "@/components/BreakdownCharts";
import { DurationFilterBar } from "@/components/DurationFilterBar";
import { LatencyChart } from "@/components/LatencyChart";
import { RequestTrafficChart } from "@/components/RequestTrafficChart";
import { Sidebar } from "@/components/Sidebar";
import { StepAnalyticsPair, StepErrorRateChartCard } from "@/components/StepAnalyticsCharts";
import { TIME_RANGE_OPTIONS, TopHeader, timeRangeToHours } from "@/components/TopHeader";
import { fetchDashboardOverview } from "@/lib/api";
import { emptyTelemetryData } from "@/lib/emptyTelemetry";
import type { BreakdownStat, DashboardTelemetry } from "@/lib/types";

type AnalyticsSection = "all" | "timeline" | "agents" | "llm" | "tools";

export default function AnalyticsPage() {
  const router = useRouter();
  const [activeNav] = useState<string>("analytics");
  const [section, setSection] = useState<AnalyticsSection>("all");
  const [stepSearch, setStepSearch] = useState<string>("");
  const [chartLayout, setChartLayout] = useState<"per_step" | "comparison">("per_step");
  const [timeRange, setTimeRange] = useState<string>(TIME_RANGE_OPTIONS[0].label);
  const [minDurationMs, setMinDurationMs] = useState<number | null>(null);
  const [maxDurationMs, setMaxDurationMs] = useState<number | null>(null);
  const [llmViewMode, setLlmViewMode] = useState<"caller" | "provider">("caller");
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("Updated just now");
  const [telemetry, setTelemetry] = useState<DashboardTelemetry>(emptyTelemetryData);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchDashboardOverview({
        sinceHours: timeRangeToHours(timeRange),
        minDurationMs,
        maxDurationMs,
      });
      if (data && data.metrics) {
        setTelemetry(data);
      }
      setLastUpdatedText("Updated just now");
    } catch (err) {
      console.warn("Could not fetch analytics telemetry:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [timeRange, minDurationMs, maxDurationMs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      loadData();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval, loadData]);

  const handleExportTelemetry = () => {
    const blob = new Blob([JSON.stringify(telemetry, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quarry-analytics-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const q = stepSearch.trim().toLowerCase();
  const matchesSearch = useCallback(
    (s: BreakdownStat) => {
      if (!q) return true;
      return (
        s.label.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q) ||
        (s.subtitle || "").toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q)
      );
    },
    [q]
  );

  const agentStats = useMemo(
    () => (telemetry.agentStats || []).filter(matchesSearch),
    [telemetry.agentStats, matchesSearch]
  );
  const toolStats = useMemo(
    () => (telemetry.toolStats || []).filter(matchesSearch),
    [telemetry.toolStats, matchesSearch]
  );
  const llmStatsByCaller = useMemo(
    () => (telemetry.llmStatsByCaller || []).filter(matchesSearch),
    [telemetry.llmStatsByCaller, matchesSearch]
  );
  const llmStatsByProvider = useMemo(
    () => (telemetry.llmStatsByProvider || []).filter(matchesSearch),
    [telemetry.llmStatsByProvider, matchesSearch]
  );
  const activeLlmStats = llmViewMode === "caller" ? llmStatsByCaller : llmStatsByProvider;

  // Build overall request error rate BreakdownStat from telemetry.metrics + telemetry.timeline
  const overallRequestErrorStat: BreakdownStat = useMemo(
    () => ({
      key: "overall_requests",
      label: "All User Requests",
      subtitle: "End-to-end request error rate over time",
      total_calls: telemetry.metrics.totalTraces,
      p50_duration_ms: telemetry.metrics.p50LatencySec * 1000,
      p95_duration_ms: telemetry.metrics.p95LatencySec * 1000,
      avg_duration_ms: (telemetry.metrics.avgLatencySec ?? 0) * 1000,
      min_duration_ms: 0,
      max_duration_ms: 0,
      error_count: telemetry.metrics.failedTracesCount,
      error_rate_pct: telemetry.metrics.errorRatePct,
      total_tokens: telemetry.metrics.totalTokens,
      total_prompt_tokens: telemetry.metrics.inputTokens,
      total_completion_tokens: telemetry.metrics.outputTokens,
      timeline: (telemetry.timeline || []).map((pt) => ({
        time: pt.time,
        date: pt.date || pt.time,
        count: pt.count,
        p50_ms: (pt.p50 ?? 0) * 1000,
        avg_ms: (pt.avg ?? pt.p50 ?? 0) * 1000,
        p95_ms: (pt.p95 ?? 0) * 1000,
        error_count: pt.errorCount ?? 0,
        error_rate_pct: pt.errorRate ?? 0,
      })),
    }),
    [telemetry.metrics, telemetry.timeline]
  );

  const totalAgentCalls = (telemetry.agentStats || []).reduce((sum, a) => sum + a.total_calls, 0);
  const totalToolCalls = (telemetry.toolStats || []).reduce((sum, t) => sum + t.total_calls, 0);

  const llmModeSwitcher = (
    <div className="flex items-center rounded-lg border border-[#1E293B] bg-[#070C19] p-0.5 text-[10px]">
      <button
        type="button"
        onClick={() => setLlmViewMode("caller")}
        className={`px-2.5 py-1 rounded font-semibold transition-colors ${
          llmViewMode === "caller" ? "bg-indigo-500/25 text-indigo-300" : "text-slate-400 hover:text-white"
        }`}
      >
        By Agent / Role
      </button>
      <button
        type="button"
        onClick={() => setLlmViewMode("provider")}
        className={`px-2.5 py-1 rounded font-semibold transition-colors ${
          llmViewMode === "provider" ? "bg-indigo-500/25 text-indigo-300" : "text-slate-400 hover:text-white"
        }`}
      >
        By Provider
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070C19] text-slate-100 flex">
      {/* Left Sidebar */}
      <Sidebar
        activeNav={activeNav}
        onSelectNav={(nav) => {
          if (nav === "overview") router.push("/");
          else if (nav === "requests") router.push("/requests");
          else if (nav === "bottlenecks") router.push("/bottlenecks");
          else if (nav === "analytics") {
            // Already on analytics
          } else {
            router.push(`/?tab=${nav}`);
          }
        }}
      />

      {/* Main Content */}
      <div className="flex-1 pl-60 flex flex-col min-w-0">
        <TopHeader
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          refreshInterval={refreshInterval}
          setRefreshInterval={setRefreshInterval}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          lastUpdatedText={lastUpdatedText}
          onExport={handleExportTelemetry}
        />

        <main className="p-6 space-y-6 flex-1">
          {/* Page Header & Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
                  <span>Step-Level Latency &amp; Error Analytics</span>
                  <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
                    p50 · Avg · p95
                  </span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dedicated latency and error-rate charts for every agent, LLM call group, and tool execution step
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Step search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter step (tabular, document, database, hypothesis...)"
                  value={stepSearch}
                  onChange={(e) => setStepSearch(e.target.value)}
                  className="h-8 w-64 rounded-lg border border-[#1E293B] bg-[#0F172A] pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Section Tabs */}
              <div className="flex items-center gap-1 rounded-xl border border-[#1E293B] bg-[#0F172A] p-1 text-xs">
                {(
                  [
                    { id: "all", label: "All Steps" },
                    { id: "timeline", label: "Timeline" },
                    { id: "agents", label: `Agents (${agentStats.length})` },
                    { id: "llm", label: `LLM Calls (${activeLlmStats.length})` },
                    { id: "tools", label: `Tools (${toolStats.length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSection(tab.id)}
                    className={`px-2.5 py-1 rounded-lg transition-all font-medium ${
                      section === tab.id
                        ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Per-Step vs Comparison Toggle */}
              <div className="flex items-center rounded-xl border border-[#1E293B] bg-[#0F172A] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setChartLayout("per_step")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    chartLayout === "per_step" ? "bg-purple-500/20 text-purple-300 font-semibold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Per-Step Charts
                </button>
                <button
                  type="button"
                  onClick={() => setChartLayout("comparison")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    chartLayout === "comparison" ? "bg-purple-500/20 text-purple-300 font-semibold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Compare All
                </button>
              </div>

              <button
                type="button"
                onClick={loadData}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Duration & Time Filters */}
          <DurationFilterBar
            minDurationMs={minDurationMs}
            maxDurationMs={maxDurationMs}
            onChangeDurationRange={(nextMin, nextMax) => {
              setMinDurationMs(nextMin);
              setMaxDurationMs(nextMax);
            }}
            timeRangeLabel={timeRange}
            matchingTracesCount={telemetry.metrics.totalTraces}
            matchingSpansCount={telemetry.metrics.totalSpans}
          />

          {/* Compact Analytics KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-3.5">
              <span className="text-[11px] font-medium text-slate-400 block">p50 Latency</span>
              <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">
                {telemetry.metrics.p50LatencySec.toFixed(2)} s
              </span>
            </div>
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-3.5">
              <span className="text-[11px] font-medium text-slate-400 block">Avg Latency</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                {(telemetry.metrics.avgLatencySec ?? 0).toFixed(2)} s
              </span>
            </div>
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-3.5">
              <span className="text-[11px] font-medium text-slate-400 block">p95 Latency</span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                {telemetry.metrics.p95LatencySec.toFixed(2)} s
              </span>
            </div>
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-3.5">
              <span className="text-[11px] font-medium text-slate-400 block">Request Error Rate</span>
              <span
                className={`text-xl font-bold font-mono mt-1 block ${
                  telemetry.metrics.errorRatePct > 5
                    ? "text-rose-400"
                    : telemetry.metrics.errorRatePct > 0
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {telemetry.metrics.errorRatePct.toFixed(2)}%
              </span>
            </div>
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-3.5">
              <span className="text-[11px] font-medium text-slate-400 block">Agent / LLM Calls</span>
              <span className="text-xl font-bold font-mono text-indigo-400 mt-1 block">
                {totalAgentCalls} / {telemetry.metrics.llmCallsCount}
              </span>
            </div>
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-3.5">
              <span className="text-[11px] font-medium text-slate-400 block">Tool Calls</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {totalToolCalls.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 1. End-to-End Timeline Charts */}
          {(section === "all" || section === "timeline") && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">End-to-End Request Traffic, Latency &amp; Error Rate</h2>
                  <p className="text-[11px] text-slate-400">
                    Daily request volume, p50 / Average / p95 execution latencies, and overall request failure rate
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <RequestTrafficChart data={telemetry.timeline} />
                <LatencyChart data={telemetry.timeline} />
                <StepErrorRateChartCard stat={overallRequestErrorStat} titlePrefix="User Requests" />
              </div>
            </section>
          )}

          {/* 2. Per-Agent Specific Charts (Orchestrator, Tabular, Document, Database) */}
          {(section === "all" || section === "agents") && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1E293B] pb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/25">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Per-Agent Latency &amp; Error Rate Charts (Orchestrator, Tabular, Document, Database)
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Dedicated p50, Average, p95 latency and failure rate charts for each specific agent
                  </p>
                </div>
              </div>

              {agentStats.length === 0 ? (
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-8 text-center text-xs text-slate-500">
                  No agents match the current filter.
                </div>
              ) : chartLayout === "per_step" ? (
                <div className="space-y-4">
                  {agentStats.map((agent) => (
                    <StepAnalyticsPair
                      key={agent.key}
                      stat={agent}
                      titlePrefix={`${agent.label} Agent`}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <BreakdownLatencyChart
                    title="All Agents — Latency Comparison (p50 · Avg · p95)"
                    subtitle="Side-by-side latency comparison across agents"
                    items={agentStats}
                  />
                  <BreakdownErrorChart
                    title="All Agents — Error Rate Comparison"
                    subtitle="Side-by-side failure rate comparison across agents"
                    items={agentStats}
                  />
                </div>
              )}
            </section>
          )}

          {/* 3. Per-LLM Caller Specific Charts (Orchestrator, Tabular, Document, Database, Hypothesis) */}
          {(section === "all" || section === "llm") && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Per-Caller LLM Latency &amp; Error Rate Charts (Orchestrator, Tabular, Document, Database, Hypothesis)
                    </h2>
                    <p className="text-[11px] text-slate-400">
                      Dedicated LLM call latency (p50, Average, p95) and error rate charts for each pipeline caller or provider
                    </p>
                  </div>
                </div>
                {llmModeSwitcher}
              </div>

              {activeLlmStats.length === 0 ? (
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-8 text-center text-xs text-slate-500">
                  No LLM call groups match the current filter.
                </div>
              ) : chartLayout === "per_step" ? (
                <div className="space-y-4">
                  {activeLlmStats.map((llmGroup) => (
                    <StepAnalyticsPair
                      key={llmGroup.key}
                      stat={llmGroup}
                      titlePrefix={
                        llmViewMode === "caller"
                          ? `${llmGroup.label} LLM Calls`
                          : `${llmGroup.label} Provider LLM Calls`
                      }
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <BreakdownLatencyChart
                    title={
                      llmViewMode === "caller"
                        ? "LLM Calls by Caller — Latency Comparison (p50 · Avg · p95)"
                        : "LLM Calls by Provider — Latency Comparison (p50 · Avg · p95)"
                    }
                    subtitle="Side-by-side LLM latency comparison"
                    items={activeLlmStats}
                  />
                  <BreakdownErrorChart
                    title={
                      llmViewMode === "caller"
                        ? "LLM Calls by Caller — Error Rate Comparison"
                        : "LLM Calls by Provider — Error Rate Comparison"
                    }
                    subtitle="Side-by-side LLM error rate comparison"
                    items={activeLlmStats}
                  />
                </div>
              )}
            </section>
          )}

          {/* 4. Per-Tool Call Specific Charts */}
          {(section === "all" || section === "tools") && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1E293B] pb-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Per-Tool Call Latency &amp; Error Rate Charts
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Individual latency (p50, Average, p95) and error rate charts for every traced tool call
                  </p>
                </div>
              </div>

              {toolStats.length === 0 ? (
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-8 text-center text-xs text-slate-500">
                  No tool calls recorded for the current filter window.
                </div>
              ) : chartLayout === "per_step" ? (
                <div className="space-y-4">
                  {toolStats.map((tool) => (
                    <StepAnalyticsPair
                      key={tool.key}
                      stat={tool}
                      titlePrefix={`Tool: ${tool.label}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <BreakdownLatencyChart
                    title="All Tool Calls — Latency Comparison (p50 · Avg · p95)"
                    subtitle="Side-by-side tool latency comparison"
                    items={toolStats}
                    maxHeightClass="max-h-[480px]"
                  />
                  <BreakdownErrorChart
                    title="All Tool Calls — Error Rate Comparison"
                    subtitle="Side-by-side tool error rate comparison"
                    items={toolStats}
                    maxHeightClass="max-h-[480px]"
                  />
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
