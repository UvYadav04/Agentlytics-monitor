"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { TIME_RANGE_OPTIONS, TopHeader, timeRangeToHours } from "@/components/TopHeader";
import { BottlenecksTable } from "@/components/BottlenecksTable";
import { DurationFilterBar } from "@/components/DurationFilterBar";
import { TraceInspectorModal } from "@/components/TraceInspectorModal";
import { fetchDashboardOverview, fetchTraceTree } from "@/lib/api";
import { emptyTelemetryData } from "@/lib/emptyTelemetry";
import type { DashboardTelemetry, TraceTree } from "@/lib/types";
import { formatDuration } from "@/lib/formatters";

export default function BottlenecksPage() {
  const router = useRouter();
  const [activeNav] = useState<string>("bottlenecks");
  const [timeRange, setTimeRange] = useState<string>(TIME_RANGE_OPTIONS[0].label);
  const [minDurationMs, setMinDurationMs] = useState<number | null>(null);
  const [maxDurationMs, setMaxDurationMs] = useState<number | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("Updated just now");

  const [telemetry, setTelemetry] = useState<DashboardTelemetry>(emptyTelemetryData);
  const [selectedTraceTree, setSelectedTraceTree] = useState<TraceTree | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const overviewData = await fetchDashboardOverview({
        sinceHours: timeRangeToHours(timeRange),
        minDurationMs,
        maxDurationMs,
      });
      if (overviewData && overviewData.metrics) {
        setTelemetry(overviewData);
      }
      setLastUpdatedText("Updated just now");
    } catch (err) {
      console.warn("Could not fetch bottlenecks overview:", err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
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

  const handleSelectTrace = async (traceId: string) => {
    setSelectedTraceId(traceId);
    try {
      const tree = await fetchTraceTree(traceId);
      setSelectedTraceTree(tree);
    } catch (err) {
      console.error(`Failed to load request tree for ${traceId}:`, err);
    }
  };

  const slowestSpans = telemetry.slowestSpans || [];
  const maxDuration = slowestSpans.length > 0 ? Math.max(...slowestSpans.map((s) => s.duration_ms)) : 0;
  const highLatencyCount = slowestSpans.filter((s) => s.duration_ms >= 3000).length;

  const slowestComponent = telemetry.componentStats.length > 0
    ? [...telemetry.componentStats].sort((a, b) => b.avg_duration_ms - a.avg_duration_ms)[0]
    : null;

  return (
    <div className="min-h-screen bg-[#070C19] text-slate-100 flex">
      {/* 1. Left Sidebar */}
      <Sidebar
        activeNav={activeNav}
        onSelectNav={(nav) => {
          if (nav === "overview") router.push("/");
          else if (nav === "analytics") router.push("/analytics");
          else if (nav === "requests") router.push("/requests");
          else if (nav === "bottlenecks") {
            // Already on bottlenecks
          } else {
            router.push(`/?tab=${nav}`);
          }
        }}
      />

      {/* 2. Main Dashboard Area */}
      <div className="flex-1 pl-60 flex flex-col min-w-0">
        <TopHeader
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          refreshInterval={refreshInterval}
          setRefreshInterval={setRefreshInterval}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
          lastUpdatedText={lastUpdatedText}
        />

        <main className="p-6 space-y-6 flex-1 flex flex-col">
          {/* Header Title & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
                    <span>Execution Bottlenecks</span>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
                      {slowestSpans.length} Detected
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Operations causing highest latency, time-to-first-token delays, and multi-agent pipeline stalls
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-all self-start sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-amber-400 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 shadow-card">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Slowest Operation</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-amber-400">
                  {maxDuration > 0 ? formatDuration(maxDuration) : "0 ms"}
                </span>
                <span className="text-xs text-slate-500">max latency</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 shadow-card">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">High Latency Spans</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-rose-400">{highLatencyCount}</span>
                <span className="text-xs text-slate-500">&gt; 3.0s threshold</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 shadow-card">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Slowest Component</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-base font-bold font-mono text-white truncate max-w-[150px]">
                  {slowestComponent?.component ?? "N/A"}
                </span>
                <span className="text-xs text-amber-400">
                  {slowestComponent ? `${(slowestComponent.avg_duration_ms / 1000).toFixed(2)}s avg` : ""}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 shadow-card">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total Bottlenecks</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-cyan-400">{slowestSpans.length}</span>
                <span className="text-xs text-slate-500">spans recorded</span>
              </div>
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

          {/* Full Scrollable Bottlenecks Table */}
          <div className="flex-1 flex flex-col min-h-0">
            <BottlenecksTable
              slowestSpans={slowestSpans}
              onSelectTrace={handleSelectTrace}
              scrollable={true}
            />
          </div>
        </main>
      </div>

      {/* Trace Inspector Modal */}
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
