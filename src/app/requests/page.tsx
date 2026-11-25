"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, RefreshCw } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { TIME_RANGE_OPTIONS, TopHeader, timeRangeToHours } from "@/components/TopHeader";
import { RecentTracesTable } from "@/components/RecentTracesTable";
import { TraceInspectorModal } from "@/components/TraceInspectorModal";
import { fetchDashboardOverview, fetchTraceTree, fetchTraces } from "@/lib/api";
import { emptyTelemetryData } from "@/lib/emptyTelemetry";
import type { DashboardTelemetry, TraceSummary, TraceTree } from "@/lib/types";

export default function RequestsPage() {
  const router = useRouter();
  const [activeNav] = useState<string>("requests");
  const [timeRange, setTimeRange] = useState<string>(TIME_RANGE_OPTIONS[0].label);
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("Updated just now");

  const [telemetry, setTelemetry] = useState<DashboardTelemetry>(emptyTelemetryData);
  const [allRequests, setAllRequests] = useState<TraceSummary[]>([]);
  const [selectedTraceTree, setSelectedTraceTree] = useState<TraceTree | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const sinceHours = timeRangeToHours(timeRange);
      const [overviewData, tracesData] = await Promise.all([
        fetchDashboardOverview({ sinceHours }),
        fetchTraces(100, 0),
      ]);

      if (overviewData && overviewData.metrics) {
        setTelemetry(overviewData);
      }
      if (sinceHours !== null && overviewData?.recentTraces) {
        setAllRequests(overviewData.recentTraces);
      } else if (tracesData && Array.isArray(tracesData)) {
        setAllRequests(tracesData);
      } else if (overviewData && overviewData.recentTraces) {
        setAllRequests(overviewData.recentTraces);
      }
      setLastUpdatedText("Updated just now");
    } catch (err) {
      console.warn("Could not fetch remote requests data:", err);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }, [timeRange]);

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

  const handleDeleteRequests = (deletedIds: string[]) => {
    setAllRequests((prev) => prev.filter((r) => !deletedIds.includes(r.trace_id)));
    loadData();
  };

  const totalCount = allRequests.length || telemetry.metrics.totalTraces;
  const errorCount = allRequests.filter((t) => t.status === "Error" || t.error_count > 0).length;
  const successCount = Math.max(0, totalCount - errorCount);
  const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : "100";
  const avgLatency = telemetry.metrics.avgLatencySec || 0;

  return (
    <div className="min-h-screen bg-[#070C19] text-slate-100 flex">
      {/* 1. Left Sidebar */}
      <Sidebar
        activeNav={activeNav}
        onSelectNav={(nav) => {
          if (nav === "overview") router.push("/");
          else if (nav === "analytics") router.push("/analytics");
          else if (nav === "bottlenecks") router.push("/bottlenecks");
          else if (nav === "requests") {
            // Already on requests
          } else {
            router.push(`/?tab=${nav}`);
          }
        }}
      />

      {/* 2. Main Container */}
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
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
                    <span>User Requests</span>
                    <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
                      {totalCount} Total
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Multi-agent investigations, SQL database queries, and document pipelines initiated by users
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-all self-start sm:self-auto"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 shadow-card">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total User Requests</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-white">{totalCount.toLocaleString()}</span>
                <span className="text-xs text-cyan-400">traced</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 shadow-card">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Success Rate</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-emerald-400">{successRate}%</span>
                <span className="text-xs text-slate-500">{successCount} successful</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 shadow-card">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Average Duration</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold font-mono text-cyan-400">{avgLatency.toFixed(2)} s</span>
                <span className="text-xs text-slate-500">per request</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 shadow-card">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Failed Requests</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-bold font-mono ${errorCount > 0 ? "text-rose-400" : "text-slate-400"}`}>
                  {errorCount}
                </span>
                <span className="text-xs text-slate-500">errors</span>
              </div>
            </div>
          </div>

          {/* Full Scrollable Table */}
          <div className="flex-1 flex flex-col min-h-0">
            <RecentTracesTable
              traces={allRequests}
              selectedTraceId={selectedTraceId}
              onSelectTrace={handleSelectTrace}
              isLoading={isLoading}
              scrollable={true}
              title="All Recorded User Requests"
              onDeleteRequests={handleDeleteRequests}
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
