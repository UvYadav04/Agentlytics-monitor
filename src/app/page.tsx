"use client";

import React, { useEffect, useState } from "react";
import { LatencyChart } from "@/components/LatencyChart";
import { RecentTracesTable } from "@/components/RecentTracesTable";
import { RequestTrafficChart } from "@/components/RequestTrafficChart";
import { ServiceHealthCard } from "@/components/ServiceHealthCard";
import { Sidebar } from "@/components/Sidebar";
import { StatsCards } from "@/components/StatsCards";
import { TopHeader } from "@/components/TopHeader";
import { TraceInspectorModal } from "@/components/TraceInspectorModal";
import { fetchTraces, fetchTraceTree } from "@/lib/api";
import { mockDashboardData } from "@/lib/mockTelemetry";
import type { TraceSummary, TraceTree } from "@/lib/types";

export default function MonitoringDashboard() {
  const [activeNav, setActiveNav] = useState<string>("overview");
  const [timeRange, setTimeRange] = useState<string>("Last 60 minutes");
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("Updated just now");

  const [traces, setTraces] = useState<TraceSummary[]>(mockDashboardData.recentTraces);
  const [selectedTraceTree, setSelectedTraceTree] = useState<TraceTree | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load telemetry traces
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchTraces(50, 0);
      if (data && data.length > 0) {
        setTraces(data);
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
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
              Chatbot observability
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Requests, model performance, retrieval and dependencies
            </p>
          </div>

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
        </main>
      </div>

      {/* 3. Deep Trace Inspector Modal (Shows every agent, tool, input, output, failure, and latency) */}
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
