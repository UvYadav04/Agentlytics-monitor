"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  Cpu,
  Layers,
  Search,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { BottlenecksTable } from "@/components/BottlenecksTable";
import { BreakdownErrorChart, BreakdownLatencyChart } from "@/components/BreakdownCharts";
import { ComponentStats } from "@/components/ComponentStats";
import { DurationFilterBar } from "@/components/DurationFilterBar";
import { LatencyChart } from "@/components/LatencyChart";
import { RecentTracesTable } from "@/components/RecentTracesTable";
import { RequestTrafficChart } from "@/components/RequestTrafficChart";
import { Sidebar } from "@/components/Sidebar";
import { StatsCards } from "@/components/StatsCards";
import { TIME_RANGE_OPTIONS, TopHeader, timeRangeToHours } from "@/components/TopHeader";
import { TraceInspectorModal } from "@/components/TraceInspectorModal";
import {
  fetchDashboardOverview,
  fetchTraceTree,
} from "@/lib/api";
import { emptyTelemetryData } from "@/lib/emptyTelemetry";
import { formatDuration, formatTokens } from "@/lib/formatters";
import type { DashboardTelemetry, TraceTree } from "@/lib/types";

export default function MonitoringDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<string>("overview");
  const [timeRange, setTimeRange] = useState<string>(TIME_RANGE_OPTIONS[0].label);
  const [minDurationMs, setMinDurationMs] = useState<number | null>(null);
  const [maxDurationMs, setMaxDurationMs] = useState<number | null>(null);
  const [llmViewMode, setLlmViewMode] = useState<"caller" | "provider">("caller");
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("Updated just now");

  const [telemetry, setTelemetry] = useState<DashboardTelemetry>(emptyTelemetryData);
  const [selectedTraceTree, setSelectedTraceTree] = useState<TraceTree | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSelectNav = (nav: string) => {
    if (nav === "requests") {
      router.push("/requests");
    } else if (nav === "bottlenecks") {
      router.push("/bottlenecks");
    } else {
      setActiveNav(nav);
    }
  };

  // Load telemetry traces & stats with active filters
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
      console.warn("Could not fetch remote overview, starting with clean telemetry state:", err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [timeRange, minDurationMs, maxDurationMs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      loadData();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval, loadData]);

  const handleDurationRangeChange = (nextMinMs: number | null, nextMaxMs: number | null) => {
    setMinDurationMs(nextMinMs);
    setMaxDurationMs(nextMaxMs);
  };

  const handleExportTelemetry = () => {
    const blob = new Blob([JSON.stringify(telemetry, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quarry-telemetry-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle trace inspection click
  const handleSelectTrace = async (traceId: string) => {
    setSelectedTraceId(traceId);
    try {
      const tree = await fetchTraceTree(traceId);
      setSelectedTraceTree(tree);
    } catch (err) {
      console.error(`Failed to load trace ${traceId}:`, err);
    }
  };

  const handleDeleteRequests = (deletedIds: string[]) => {
    setTelemetry((prev) => ({
      ...prev,
      recentTraces: prev.recentTraces.filter((r) => !deletedIds.includes(r.trace_id)),
    }));
    loadData();
  };

  const traces = telemetry.recentTraces;
  const componentStats = telemetry.componentStats;
  const agentStats = telemetry.agentStats || [];
  const toolStats = telemetry.toolStats || [];
  const llmStatsByCaller = telemetry.llmStatsByCaller || [];
  const llmStatsByProvider = telemetry.llmStatsByProvider || [];
  const activeLlmStats = llmViewMode === "caller" ? llmStatsByCaller : llmStatsByProvider;
  const slowestSpans = telemetry.slowestSpans;
  const failedTraces = traces.filter((t) => t.status === "Error" || t.error_count > 0);

  const llmModeSwitcher = (
    <div className="flex items-center rounded-lg border border-[#1E293B] bg-[#070C19] p-0.5 text-[10px]">
      <button
        type="button"
        onClick={() => setLlmViewMode("caller")}
        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
          llmViewMode === "caller" ? "bg-indigo-500/25 text-indigo-300" : "text-slate-400 hover:text-white"
        }`}
      >
        By Agent / Role
      </button>
      <button
        type="button"
        onClick={() => setLlmViewMode("provider")}
        className={`px-2 py-0.5 rounded font-semibold transition-colors ${
          llmViewMode === "provider" ? "bg-indigo-500/25 text-indigo-300" : "text-slate-400 hover:text-white"
        }`}
      >
        By Provider
      </button>
    </div>
  );

  // Component lookups for retrieval view
  const chromaStat = componentStats.find((s) => s.component === "rag.chroma");
  const rerankerStat = componentStats.find((s) => s.component === "rag.reranker");

  return (
    <div className="min-h-screen bg-[#070C19] text-slate-100 flex">
      {/* 1. Left Sidebar */}
      <Sidebar activeNav={activeNav} onSelectNav={handleSelectNav} />

      {/* 2. Main Dashboard Area (offset by sidebar width: 240px / 15rem) */}
      <div className="flex-1 pl-60 flex flex-col min-w-0">
        {/* Top Header */}
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

        {/* Dashboard Content Container */}
        <main className="p-6 space-y-6 flex-1">
          {/* Page Heading & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2.5">
                <span>Quarry Engine Observability</span>
                <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
                  Live Telemetry
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Real tracing metrics from SQLite data store across SQL agents, tabular analysis, and RAG pipelines
              </p>
            </div>

            {/* Quick Filter pills */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#0F172A] border border-[#1E293B] p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveNav("overview")}
                className={`px-3 py-1 rounded-lg transition-all font-medium ${
                  activeNav === "overview" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => router.push("/requests")}
                className={`px-3 py-1 rounded-lg transition-all font-medium ${
                  activeNav === "requests" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                Requests
              </button>
              <button
                onClick={() => router.push("/bottlenecks")}
                className={`px-3 py-1 rounded-lg transition-all font-medium ${
                  activeNav === "bottlenecks" ? "bg-amber-500/20 text-amber-300 font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                Bottlenecks
              </button>
              <button
                onClick={() => setActiveNav("services")}
                className={`px-3 py-1 rounded-lg transition-all font-medium ${
                  activeNav === "services" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                Components
              </button>
            </div>
          </div>

          {/* Render based on activeNav */}
          {activeNav === "overview" && (
            <>
              {/* Row 1: Real Top KPI Metric Cards */}
              <StatsCards metrics={telemetry.metrics} />

              {/* Row 2: Duration & Latency Filters */}
              <DurationFilterBar
                minDurationMs={minDurationMs}
                maxDurationMs={maxDurationMs}
                onChangeDurationRange={handleDurationRangeChange}
                timeRangeLabel={timeRange}
                matchingTracesCount={telemetry.metrics.totalTraces}
                matchingSpansCount={telemetry.metrics.totalSpans}
              />

              {/* Row 3: 2 Side-by-Side Timeline Charts (Traffic + End-to-End p50 / Avg / p95) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RequestTrafficChart data={telemetry.timeline} />
                <LatencyChart data={telemetry.timeline} />
              </div>

              {/* Row 4: Agent Latencies (p50, Avg, p95) & Error Rates */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/25">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Agent Latency &amp; Error Rate</h2>
                      <p className="text-[11px] text-slate-400">
                        Execution duration (p50, Average, p95) and failure rates for each pipeline agent
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <BreakdownLatencyChart
                    title="Agent Latencies (p50 · Avg · p95)"
                    subtitle="End-to-end execution latency per agent"
                    items={agentStats}
                  />
                  <BreakdownErrorChart
                    title="Agent Error Rates"
                    subtitle="Percentage of failed invocations per agent"
                    items={agentStats}
                  />
                </div>
              </section>

              {/* Row 5: LLM Calls Latencies (p50, Avg, p95) & Error Rates */}
              <section className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">LLM Call Latency &amp; Error Rate</h2>
                      <p className="text-[11px] text-slate-400">
                        All LLM calls broken down across Orchestrator, Tabular, Document, Database, and Hypothesis
                      </p>
                    </div>
                  </div>
                  {llmModeSwitcher}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <BreakdownLatencyChart
                    title={
                      llmViewMode === "caller"
                        ? "LLM Latencies by Caller (p50 · Avg · p95)"
                        : "LLM Latencies by Provider (p50 · Avg · p95)"
                    }
                    subtitle={
                      llmViewMode === "caller"
                        ? "Orchestrator, Tabular, Document, Database & Hypothesis LLM calls"
                        : "Latency distribution per LLM provider"
                    }
                    items={activeLlmStats}
                  />
                  <BreakdownErrorChart
                    title={
                      llmViewMode === "caller"
                        ? "LLM Error Rates by Caller"
                        : "LLM Error Rates by Provider"
                    }
                    subtitle={
                      llmViewMode === "caller"
                        ? "Failed LLM calls per pipeline role"
                        : "Failed LLM calls per provider"
                    }
                    items={activeLlmStats}
                  />
                </div>
              </section>

              {/* Row 6: Tool Calls Latencies (p50, Avg, p95) & Error Rates */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Tool Call Latency &amp; Error Rate</h2>
                      <p className="text-[11px] text-slate-400">
                        Individual SQL, Python sandbox, RAG retrieval, reranker, and visualization tool invocations
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <BreakdownLatencyChart
                    title="Tool Call Latencies (p50 · Avg · p95)"
                    subtitle="Duration breakdown for every traced tool call"
                    items={toolStats}
                  />
                  <BreakdownErrorChart
                    title="Tool Call Error Rates"
                    subtitle="Failure percentage and error counts per tool"
                    items={toolStats}
                  />
                </div>
              </section>

              {/* Row 7: Split Layout (Left: Real Component Aggregations | Right: Recent Traces) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-6">
                  <ComponentStats stats={componentStats} />
                </div>
                <div className="lg:col-span-6">
                  <RecentTracesTable
                    traces={traces}
                    selectedTraceId={selectedTraceId}
                    onSelectTrace={handleSelectTrace}
                    isLoading={isLoading}
                    limit={10}
                    onViewAll={() => router.push("/requests")}
                    title="Recent Requests (Latest 10)"
                    onDeleteRequests={handleDeleteRequests}
                  />
                </div>
              </div>

              {/* Row 8: Bottlenecks Table */}
              <div className="mt-6">
                <BottlenecksTable
                  slowestSpans={slowestSpans}
                  onSelectTrace={handleSelectTrace}
                  limit={5}
                  onViewAll={() => router.push("/bottlenecks")}
                />
              </div>
            </>
          )}

          {activeNav === "requests" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">All Recorded User Requests</h2>
                  <p className="text-slate-400 mt-0.5">
                    Click any request to open the chronological execution path with full token metrics, collapsed steps, and markdown inputs/outputs
                  </p>
                </div>
                <button
                  onClick={() => router.push("/requests")}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/30 transition-colors"
                >
                  Open Dedicated Requests Page →
                </button>
              </div>

              <RecentTracesTable
                traces={traces}
                selectedTraceId={selectedTraceId}
                onSelectTrace={handleSelectTrace}
                isLoading={isLoading}
                scrollable={true}
                onDeleteRequests={handleDeleteRequests}
              />
            </div>
          )}

          {activeNav === "bottlenecks" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Top Execution Bottlenecks</h2>
                  <p className="text-slate-400 mt-0.5">
                    Operations causing highest latency across all multi-agent investigations and tool calls
                  </p>
                </div>
                <button
                  onClick={() => router.push("/bottlenecks")}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
                >
                  Open Dedicated Bottlenecks Page →
                </button>
              </div>

              <BottlenecksTable
                slowestSpans={slowestSpans}
                onSelectTrace={handleSelectTrace}
                scrollable={true}
              />
            </div>
          )}

          {activeNav === "models" && (
            <div className="space-y-6">
              <DurationFilterBar
                minDurationMs={minDurationMs}
                maxDurationMs={maxDurationMs}
                onChangeDurationRange={handleDurationRangeChange}
                timeRangeLabel={timeRange}
                matchingTracesCount={telemetry.metrics.totalTraces}
                matchingSpansCount={telemetry.metrics.totalSpans}
              />

              {/* Live LLM Provider Cards */}
              {llmStatsByProvider.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {llmStatsByProvider.map((prov) => (
                    <div
                      key={prov.key}
                      className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white">{prov.label}</h3>
                            <p className="text-[11px] text-slate-400 font-mono">{prov.subtitle || prov.key}</p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            prov.error_rate_pct > 5
                              ? "bg-rose-950/60 text-rose-400 border-rose-700/60"
                              : "bg-emerald-950/60 text-emerald-400 border-emerald-700/60"
                          }`}
                        >
                          {prov.error_rate_pct.toFixed(1)}% err
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#1E293B] text-center">
                        <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                          <span className="text-[10px] text-slate-400 block">Calls</span>
                          <span className="text-xs font-bold font-mono text-cyan-400">
                            {prov.total_calls.toLocaleString()}
                          </span>
                        </div>
                        <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                          <span className="text-[10px] text-slate-400 block">p50</span>
                          <span className="text-xs font-bold font-mono text-white">
                            {formatDuration(prov.p50_duration_ms)}
                          </span>
                        </div>
                        <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                          <span className="text-[10px] text-slate-400 block">p95</span>
                          <span className="text-xs font-bold font-mono text-amber-400">
                            {formatDuration(prov.p95_duration_ms)}
                          </span>
                        </div>
                        <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                          <span className="text-[10px] text-slate-400 block">Tokens</span>
                          <span className="text-xs font-bold font-mono text-emerald-400">
                            {formatTokens(prov.total_tokens)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-8 text-center text-xs text-slate-500">
                  No LLM calls recorded for the selected duration &amp; time filters.
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BreakdownLatencyChart
                  title="LLM Latencies by Caller (p50 · Avg · p95)"
                  subtitle="Orchestrator, Tabular, Document, Database & Hypothesis"
                  items={llmStatsByCaller}
                />
                <BreakdownErrorChart
                  title="LLM Error Rates by Caller"
                  subtitle="Failure rates per pipeline role"
                  items={llmStatsByCaller}
                />
              </div>

              {/* Slowest Operations */}
              <BottlenecksTable slowestSpans={slowestSpans} onSelectTrace={handleSelectTrace} />
            </div>
          )}

          {activeNav === "retrieval" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                    <Search className="h-4 w-4 text-cyan-400" />
                    <span>Vector DB Store</span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-white">Chroma Vector DB</h3>
                  <p className="mt-1 text-xs text-slate-400">Document chunk embeddings and vector similarity queries</p>
                  <div className="mt-4 pt-3 border-t border-[#1E293B] flex justify-between text-xs">
                    <span className="text-slate-400">Total Queries Traced</span>
                    <span className="font-mono text-cyan-400 font-bold">{chromaStat?.total_calls ?? 0} calls</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-slate-400">Average Duration</span>
                    <span className="font-mono text-white font-bold">
                      {chromaStat ? formatDuration(chromaStat.avg_duration_ms) : "—"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                    <Layers className="h-4 w-4 text-purple-400" />
                    <span>Cross-Encoder Reranker</span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-white">BAAI / BGE Reranker</h3>
                  <p className="mt-1 text-xs text-slate-400">Reranks candidate chunks by contextual semantic relevance</p>
                  <div className="mt-4 pt-3 border-t border-[#1E293B] flex justify-between text-xs">
                    <span className="text-slate-400">Total Rerank Invocations</span>
                    <span className="font-mono text-purple-400 font-bold">{rerankerStat?.total_calls ?? 0} calls</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-slate-400">Average Duration</span>
                    <span className="font-mono text-white font-bold">
                      {rerankerStat ? formatDuration(rerankerStat.avg_duration_ms) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Real RAG & Pipeline Breakdown */}
              <ComponentStats stats={componentStats} />
            </div>
          )}

          {activeNav === "services" && (
            <div className="space-y-6">
              <DurationFilterBar
                minDurationMs={minDurationMs}
                maxDurationMs={maxDurationMs}
                onChangeDurationRange={handleDurationRangeChange}
                timeRangeLabel={timeRange}
                matchingTracesCount={telemetry.metrics.totalTraces}
                matchingSpansCount={telemetry.metrics.totalSpans}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BreakdownLatencyChart
                  title="Tool Call Latencies (p50 · Avg · p95)"
                  subtitle="All tool calls in selected window"
                  items={toolStats}
                />
                <BreakdownErrorChart
                  title="Tool Call Error Rates"
                  subtitle="Failure rates per tool"
                  items={toolStats}
                />
              </div>
              <ComponentStats stats={componentStats} />
              <BottlenecksTable slowestSpans={slowestSpans} onSelectTrace={handleSelectTrace} />
            </div>
          )}

          {activeNav === "alerts" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Recorded Request Failures & Errors</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real failures captured in requests with error details and stack traces
                    </p>
                  </div>
                  <span className="font-mono text-rose-400 text-xs font-semibold bg-rose-950/40 border border-rose-800/40 px-2.5 py-1 rounded-lg">
                    {failedTraces.length} Failed Requests
                  </span>
                </div>

                <div className="space-y-2 mt-3">
                  {failedTraces.slice(0, 10).map((t) => (
                    <div
                      key={t.trace_id}
                      onClick={() => handleSelectTrace(t.trace_id)}
                      className="cursor-pointer flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3.5 text-xs text-rose-200 hover:bg-rose-950/30 transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-rose-300 font-mono">{t.trace_id}</span>
                          <span className="text-[10px] text-rose-400/80 font-mono">{t.created_at?.slice(0, 19)}</span>
                        </div>
                        <p className="mt-1 text-slate-300 truncate">
                          {t.query || "Failed execution step"}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-slate-400">
                          <span>Route: {t.route}</span>
                          <span>•</span>
                          <span>Duration: {t.latency_s}s</span>
                          <span>•</span>
                          <span className="text-rose-400 font-semibold">{t.error_count} error spans</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeNav === "settings" && (
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-6 space-y-6 max-w-3xl">
              <div>
                <h2 className="text-base font-semibold text-white">Quarry Observability Configuration</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Active telemetry configuration and data store connection.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between py-3 border-b border-[#1E293B]">
                  <div>
                    <span className="font-medium text-white block">Backend API Endpoint</span>
                    <span className="text-slate-400 text-[11px]">Where monitoring endpoints are queried</span>
                  </div>
                  <span className="font-mono text-cyan-400 bg-[#070C19] px-3 py-1 rounded-lg border border-[#1E293B]">
                    http://localhost:8000/api/monitoring
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-[#1E293B]">
                  <div>
                    <span className="font-medium text-white block">Trace Sampling Rate</span>
                    <span className="text-slate-400 text-[11px]">Percentage of requests fully traced</span>
                  </div>
                  <span className="font-mono text-emerald-400 bg-[#070C19] px-3 py-1 rounded-lg border border-[#1E293B]">
                    100% (Production)
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-[#1E293B]">
                  <div>
                    <span className="font-medium text-white block">Trace Storage Database</span>
                    <span className="text-slate-400 text-[11px]">WAL SQLite storage with Celery multi-worker safety</span>
                  </div>
                  <span className="font-mono text-slate-300 bg-[#070C19] px-3 py-1 rounded-lg border border-[#1E293B]">
                    Server/traces/traces.db
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-[#1E293B]">
                  <div>
                    <span className="font-medium text-white block">Active Database Statistics</span>
                    <span className="text-slate-400 text-[11px]">Total spans and traces in data store</span>
                  </div>
                  <span className="font-mono text-cyan-400 bg-[#070C19] px-3 py-1 rounded-lg border border-[#1E293B]">
                    {telemetry.metrics.totalTraces} traces • {telemetry.metrics.totalSpans} spans
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. Deep Trace Inspector Modal */}
      {selectedTraceTree && (
        <TraceInspectorModal
          tree={selectedTraceTree}
          onClose={() => {
            setSelectedTraceTree(null);
            setSelectedTraceId(null);
          }}
        />
      )}
    </div>
  );
}
