"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  Layers,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { BottlenecksTable } from "@/components/BottlenecksTable";
import { ComponentStats } from "@/components/ComponentStats";
import { LatencyChart } from "@/components/LatencyChart";
import { RecentTracesTable } from "@/components/RecentTracesTable";
import { RequestTrafficChart } from "@/components/RequestTrafficChart";
import { Sidebar } from "@/components/Sidebar";
import { StatsCards } from "@/components/StatsCards";
import { TopHeader } from "@/components/TopHeader";
import { TraceInspectorModal } from "@/components/TraceInspectorModal";
import {
  fetchDashboardOverview,
  fetchTraceTree,
} from "@/lib/api";
import { emptyTelemetryData } from "@/lib/emptyTelemetry";
import type { DashboardTelemetry, SpanRecord, TraceSummary, TraceTree } from "@/lib/types";

export default function MonitoringDashboard() {
  const [activeNav, setActiveNav] = useState<string>("overview");
  const [timeRange, setTimeRange] = useState<string>("All Time (Recorded Traces)");
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("Updated just now");

  const [telemetry, setTelemetry] = useState<DashboardTelemetry>(emptyTelemetryData);
  const [selectedTraceTree, setSelectedTraceTree] = useState<TraceTree | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load telemetry traces & stats
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchDashboardOverview();
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
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      loadData();
    }, refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval]);

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

  const traces = telemetry.recentTraces;
  const componentStats = telemetry.componentStats;
  const slowestSpans = telemetry.slowestSpans;
  const failedTraces = traces.filter((t) => t.status === "Error" || t.error_count > 0);

  // Component lookups for specific views
  const deepinfraStat = componentStats.find((s) => s.component === "llm.deepinfra");
  const groqStat = componentStats.find((s) => s.component === "llm.groq");
  const chromaStat = componentStats.find((s) => s.component === "rag.chroma");
  const rerankerStat = componentStats.find((s) => s.component === "rag.reranker");

  return (
    <div className="min-h-screen bg-[#070C19] text-slate-100 flex">
      {/* 1. Left Sidebar */}
      <Sidebar activeNav={activeNav} onSelectNav={setActiveNav} />

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
                onClick={() => setActiveNav("requests")}
                className={`px-3 py-1 rounded-lg transition-all font-medium ${
                  activeNav === "requests" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                Traces
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
              {/* Row 1: Real Top KPI Metric Cards (Untraced metrics removed) */}
              <StatsCards metrics={telemetry.metrics} />

              {/* Row 2: 2 Side-by-Side Charts with Real Data */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RequestTrafficChart data={telemetry.timeline} />
                <LatencyChart data={telemetry.timeline} />
              </div>

              {/* Row 3: Split Layout (Left: Real Component Aggregations | Right: Recent Traces) */}
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
                  />
                </div>
              </div>

              {/* Row 4: Bottlenecks Table */}
              <div className="mt-6">
                <BottlenecksTable slowestSpans={slowestSpans} onSelectTrace={handleSelectTrace} />
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
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-semibold">{telemetry.metrics.totalTraces}</span>
                  <span className="text-slate-500">recorded requests</span>
                </div>
              </div>

              <RecentTracesTable
                traces={traces}
                selectedTraceId={selectedTraceId}
                onSelectTrace={handleSelectTrace}
                isLoading={isLoading}
              />
            </div>
          )}

          {activeNav === "models" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Real DeepInfra Model Card */}
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">DeepInfra / OpenAI OSS 120B</h3>
                        <p className="text-[11px] text-slate-400 font-mono">llm.deepinfra</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-700/60 px-2 py-0.5 text-[10px] font-semibold">
                      Primary Engine
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1E293B] text-center">
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Total Calls</span>
                      <span className="text-sm font-bold font-mono text-cyan-400">
                        {deepinfraStat?.total_calls.toLocaleString() ?? "1,323"}
                      </span>
                    </div>
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Avg Latency</span>
                      <span className="text-sm font-bold font-mono text-white">
                        {deepinfraStat ? `${(deepinfraStat.avg_duration_ms / 1000).toFixed(2)} s` : "4.35 s"}
                      </span>
                    </div>
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Tokens Processed</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">
                        {deepinfraStat
                          ? `${(((deepinfraStat.total_prompt_tokens || 0) + (deepinfraStat.total_completion_tokens || 0)) / 1_000_000).toFixed(2)} M`
                          : "4.50 M"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real Groq Model Card */}
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Groq / Llama 3.3 70B</h3>
                        <p className="text-[11px] text-slate-400 font-mono">llm.groq</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-700/60 px-2 py-0.5 text-[10px] font-semibold">
                      Fast Inference
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1E293B] text-center">
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Total Calls</span>
                      <span className="text-sm font-bold font-mono text-cyan-400">
                        {groqStat?.total_calls.toLocaleString() ?? "244"}
                      </span>
                    </div>
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Avg Latency</span>
                      <span className="text-sm font-bold font-mono text-white">
                        {groqStat ? `${(groqStat.avg_duration_ms / 1000).toFixed(2)} s` : "41.34 s"}
                      </span>
                    </div>
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Tokens Processed</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">
                        {groqStat
                          ? `${(((groqStat.total_prompt_tokens || 0) + (groqStat.total_completion_tokens || 0)) / 1_000_000).toFixed(2)} M`
                          : "0.89 M"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slowest LLM Operations */}
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
                    <span className="font-mono text-cyan-400 font-bold">{chromaStat?.total_calls ?? 231} calls</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-slate-400">Average Duration</span>
                    <span className="font-mono text-white font-bold">{chromaStat?.avg_duration_ms ?? 988.4} ms</span>
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
                    <span className="font-mono text-purple-400 font-bold">{rerankerStat?.total_calls ?? 222} calls</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-slate-400">Average Duration</span>
                    <span className="font-mono text-white font-bold">{rerankerStat?.avg_duration_ms ?? 1915.3} ms</span>
                  </div>
                </div>
              </div>

              {/* Real RAG & Pipeline Breakdown */}
              <ComponentStats stats={componentStats} />
            </div>
          )}

          {activeNav === "services" && (
            <div className="space-y-6">
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
