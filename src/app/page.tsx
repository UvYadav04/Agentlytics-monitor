"use client";

import React, { useEffect, useState } from "react";
import { BottlenecksTable } from "@/components/BottlenecksTable";
import { ComponentStats } from "@/components/ComponentStats";
import { Navbar } from "@/components/Navbar";
import { SpanDrawer } from "@/components/SpanDrawer";
import { StatsCards } from "@/components/StatsCards";
import { TracesTable } from "@/components/TracesTable";
import { WaterfallView } from "@/components/WaterfallView";
import {
  fetchComponentStats,
  fetchSlowestSpans,
  fetchTraces,
  fetchTraceTree,
} from "@/lib/api";
import type { ComponentStat, SpanRecord, TraceSummary, TraceTree } from "@/lib/types";

export default function MonitoringDashboard() {
  const [activeTab, setActiveTab] = useState<"traces" | "stats" | "bottlenecks">("traces");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(15000);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [stats, setStats] = useState<ComponentStat[]>([]);
  const [slowestSpans, setSlowestSpans] = useState<SpanRecord[]>([]);

  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [selectedTraceTree, setSelectedTraceTree] = useState<TraceTree | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<SpanRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [tracesData, statsData, slowestData] = await Promise.allSettled([
        fetchTraces(100, 0),
        fetchComponentStats(24),
        fetchSlowestSpans(25),
      ]);

      if (tracesData.status === "fulfilled") {
        setTraces(tracesData.value);
        setErrorMessage(null);
      } else {
        const msg = (tracesData.reason as Error)?.message || "Failed to load traces";
        setErrorMessage(msg);
      }

      if (statsData.status === "fulfilled") setStats(statsData.value);
      if (slowestData.status === "fulfilled") setSlowestSpans(slowestData.value);

      // If a trace is currently open, refresh its tree as well
      if (selectedTraceId) {
        try {
          const tree = await fetchTraceTree(selectedTraceId);
          setSelectedTraceTree(tree);
        } catch {}
      }
    } catch (err: any) {
      console.error("Failed to load monitoring data:", err);
      setErrorMessage(err?.message || "An unexpected error occurred while loading monitoring data.");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      loadData();
    }, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, selectedTraceId]);

  const handleSelectTrace = async (traceId: string) => {
    setSelectedTraceId(traceId);
    setActiveTab("traces");
    try {
      const tree = await fetchTraceTree(traceId);
      setSelectedTraceTree(tree);
    } catch (err) {
      console.error(`Failed to load trace ${traceId}:`, err);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        autoRefreshInterval={autoRefreshInterval}
        setAutoRefreshInterval={setAutoRefreshInterval}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Error / Auth Notice Banner */}
        {errorMessage && (
          <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-400 shadow-sm">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Notice:</span>
              <span>{errorMessage}</span>
            </div>
            {errorMessage.includes("401") && (
              <a
                href="/login"
                className="ml-4 rounded-md bg-accent px-3 py-1 font-medium text-white transition hover:opacity-90"
              >
                Log In
              </a>
            )}
          </div>
        )}

        {/* KPI Cards Overview */}
        <StatsCards traces={traces} />

        {/* Tab 1: Traces & Waterfall View */}
        {activeTab === "traces" && (
          <div className="space-y-6">
            {selectedTraceTree && (
              <WaterfallView
                tree={selectedTraceTree}
                selectedSpan={selectedSpan}
                onSelectSpan={setSelectedSpan}
                onClose={() => {
                  setSelectedTraceTree(null);
                  setSelectedTraceId(null);
                  setSelectedSpan(null);
                }}
              />
            )}

            <TracesTable
              traces={traces}
              selectedTraceId={selectedTraceId}
              onSelectTrace={handleSelectTrace}
              isLoading={isLoading}
            />
          </div>
        )}

        {/* Tab 2: Component Latency Aggregation */}
        {activeTab === "stats" && <ComponentStats stats={stats} />}

        {/* Tab 3: Performance Bottlenecks */}
        {activeTab === "bottlenecks" && (
          <BottlenecksTable slowestSpans={slowestSpans} onSelectTrace={handleSelectTrace} />
        )}
      </main>

      {/* Slide-over Span Details Drawer */}
      <SpanDrawer span={selectedSpan} onClose={() => setSelectedSpan(null)} />
    </div>
  );
}

