"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Search,
  Server,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { BottlenecksTable } from "@/components/BottlenecksTable";
import { ComponentStats } from "@/components/ComponentStats";
import { LatencyChart } from "@/components/LatencyChart";
import { RecentTracesTable } from "@/components/RecentTracesTable";
import { RequestTrafficChart } from "@/components/RequestTrafficChart";
import { ServiceHealthCard } from "@/components/ServiceHealthCard";
import { Sidebar } from "@/components/Sidebar";
import { StatsCards } from "@/components/StatsCards";
import { TopHeader } from "@/components/TopHeader";
import { TraceInspectorModal } from "@/components/TraceInspectorModal";
import {
  fetchComponentStats,
  fetchSlowestSpans,
  fetchTraces,
  fetchTraceTree,
} from "@/lib/api";
import { mockDashboardData } from "@/lib/mockTelemetry";
import type { ComponentStat, SpanRecord, TraceSummary, TraceTree } from "@/lib/types";

export default function MonitoringDashboard() {
  const [activeNav, setActiveNav] = useState<string>("overview");
  const [timeRange, setTimeRange] = useState<string>("Last 60 minutes");
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("Updated just now");

  const [traces, setTraces] = useState<TraceSummary[]>(mockDashboardData.recentTraces);
  const [componentStats, setComponentStats] = useState<ComponentStat[]>([]);
  const [slowestSpans, setSlowestSpans] = useState<SpanRecord[]>([]);
  const [selectedTraceTree, setSelectedTraceTree] = useState<TraceTree | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load telemetry traces & stats
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [tracesData, statsData, slowData] = await Promise.all([
        fetchTraces(50, 0),
        fetchComponentStats(24),
        fetchSlowestSpans(15),
      ]);

      if (tracesData && tracesData.length > 0) {
        setTraces(tracesData);
      }
      if (statsData && statsData.length > 0) {
        setComponentStats(statsData);
      }
      if (slowData && slowData.length > 0) {
        setSlowestSpans(slowData);
      }
      setLastUpdatedText("Updated just now");
    } catch (err) {
      console.warn("Could not fetch remote traces, using synthetic telemetry:", err);
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
                  Live
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Autonomous data investigation, tabular analysis, SQL database agents, and document RAG pipelines
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
                Engines
              </button>
            </div>
          </div>

          {/* Render based on activeNav */}
          {activeNav === "overview" && (
            <>
              {/* Row 1: 6 Top KPI Metric Cards with Sparklines */}
              <StatsCards traces={traces} customMetrics={mockDashboardData.metrics} />

              {/* Row 2: 2 Side-by-Side Charts (Request Traffic & End-to-End Latency) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <RequestTrafficChart data={mockDashboardData.trafficSeries} />
                <LatencyChart data={mockDashboardData.latencySeries} />
              </div>

              {/* Row 3: Split Layout (Left: Service Health & Retrieval Quality | Right: Recent Request Traces) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left Column (Service Health + Retrieval Quality) */}
                <div className="lg:col-span-5">
                  <ServiceHealthCard
                    services={mockDashboardData.services}
                    alertBanner={mockDashboardData.alertBanner}
                    retrievalQuality={mockDashboardData.retrievalQuality}
                  />
                </div>

                {/* Right Column (Recent Request Traces Table) */}
                <div className="lg:col-span-7">
                  <RecentTracesTable
                    traces={traces}
                    selectedTraceId={selectedTraceId}
                    onSelectTrace={handleSelectTrace}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </>
          )}

          {activeNav === "requests" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 text-xs text-slate-300 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">All Request & Investigation Traces</h2>
                  <p className="text-slate-400 mt-0.5">
                    Click any trace to open the hierarchical waterfall view with full token metrics and tool execution outputs
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-semibold">{traces.length}</span>
                  <span className="text-slate-500">recorded traces</span>
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
                {/* DeepInfra Model Card */}
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">DeepInfra / OpenAI OSS 120B</h3>
                        <p className="text-[11px] text-slate-400 font-mono">openai/gpt-oss-120b</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-700/60 px-2 py-0.5 text-[10px] font-semibold">
                      Primary SQL & Tabular
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1E293B] text-center">
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Avg TTFT</span>
                      <span className="text-sm font-bold font-mono text-cyan-400">285 ms</span>
                    </div>
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">p95 Latency</span>
                      <span className="text-sm font-bold font-mono text-white">2.20 s</span>
                    </div>
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Total Tokens</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">14.0 M</span>
                    </div>
                  </div>
                </div>

                {/* Groq Model Card */}
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                        <Zap className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Groq / Llama 3.3 70B</h3>
                        <p className="text-[11px] text-slate-400 font-mono">llama-3.3-70b-versatile</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-700/60 px-2 py-0.5 text-[10px] font-semibold">
                      Fast Document RAG
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1E293B] text-center">
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Avg TTFT</span>
                      <span className="text-sm font-bold font-mono text-cyan-400">190 ms</span>
                    </div>
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">p95 Latency</span>
                      <span className="text-sm font-bold font-mono text-white">0.95 s</span>
                    </div>
                    <div className="bg-[#070C19] p-2 rounded-lg border border-[#1E293B]">
                      <span className="text-[10px] text-slate-400 block">Total Tokens</span>
                      <span className="text-sm font-bold font-mono text-emerald-400">3.5 M</span>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                    <Search className="h-4 w-4 text-cyan-400" />
                    <span>Vector DB Store</span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-white">Chroma Vector DB</h3>
                  <p className="mt-1 text-xs text-slate-400">Embeddings indexed for financial filings & docs</p>
                  <div className="mt-4 pt-3 border-t border-[#1E293B] flex justify-between text-xs">
                    <span className="text-slate-400">p95 Search Latency</span>
                    <span className="font-mono text-cyan-400 font-bold">320 ms</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                    <Layers className="h-4 w-4 text-purple-400" />
                    <span>Cross-Encoder Reranker</span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-white">BAAI / BGE Reranker v2</h3>
                  <p className="mt-1 text-xs text-slate-400">Filters 24 candidate chunks down to top 8</p>
                  <div className="mt-4 pt-3 border-t border-[#1E293B] flex justify-between text-xs">
                    <span className="text-slate-400">Average Rerank Latency</span>
                    <span className="font-mono text-purple-400 font-bold">430 ms</span>
                  </div>
                </div>

                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Citation Verification</span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-white">99.2% Groundedness</h3>
                  <p className="mt-1 text-xs text-slate-400">Strict claim-to-chunk verification passes</p>
                  <div className="mt-4 pt-3 border-t border-[#1E293B] flex justify-between text-xs">
                    <span className="text-slate-400">Empty Result Rate</span>
                    <span className="font-mono text-emerald-400 font-bold">1.8%</span>
                  </div>
                </div>
              </div>

              {/* RAG Component Breakdown */}
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
                <h2 className="text-sm font-semibold text-white">System Alerts & SLO Breaches</h2>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-amber-300">Transient Latency Spike (deepinfra.create)</span>
                      <p className="mt-0.5 text-amber-200/90">
                        At 10:42 UTC, P95 latency peaked at 3.78s (target SLO: 3.0s) due to upstream queue depth. Automated fallback triggered and recovered at 10:45 UTC.
                      </p>
                      <span className="mt-2 inline-block text-[10px] font-mono text-amber-400/80">Status: Recovered • Duration: 3m</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3.5 text-xs text-rose-200">
                    <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-rose-300">Sandbox Execution Timeout in Reconciliation</span>
                      <p className="mt-0.5 text-rose-200/90">
                        Trace <code className="font-mono text-rose-300">trc_orch_6299d4e1</code> exceeded the 5000ms wall-clock safety cutoff during an unindexed outer cross-join.
                      </p>
                      <span className="mt-2 inline-block text-[10px] font-mono text-rose-400/80">Status: Captured in Trace Inspector • Traceback Available</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === "settings" && (
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-6 space-y-6 max-w-3xl">
              <div>
                <h2 className="text-base font-semibold text-white">Quarry Observability Configuration</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage backend telemetry collection endpoints, sampling rates, and privacy redaction.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between py-3 border-b border-[#1E293B]">
                  <div>
                    <span className="font-medium text-white block">Backend API Endpoint</span>
                    <span className="text-slate-400 text-[11px]">Where trace collectors post span batches</span>
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
                    <span className="font-medium text-white block">Sensitive Content Redaction</span>
                    <span className="text-slate-400 text-[11px]">Automatic masking of API keys, passwords, and PII</span>
                  </div>
                  <span className="font-mono text-cyan-400 bg-[#070C19] px-3 py-1 rounded-lg border border-[#1E293B]">
                    Enabled (Regex Masking)
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
