"use client";

import React from "react";
import { Activity, Clock, RefreshCw, Zap } from "lucide-react";

interface NavbarProps {
  activeTab: "traces" | "stats" | "bottlenecks";
  setActiveTab: (tab: "traces" | "stats" | "bottlenecks") => void;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (interval: number) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  autoRefreshInterval,
  setAutoRefreshInterval,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent border border-accent/30 shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold tracking-tight text-text">DataAnalyzer</span>
              <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[11px] font-medium text-accent">
                Observability
              </span>
            </div>
            <p className="text-[11px] text-text-subtle">Real-time LLM & RAG Tracing</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 rounded-lg bg-bg-card p-1 border border-border">
          <button
            onClick={() => setActiveTab("traces")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "traces"
                ? "bg-accent/20 text-accent font-semibold"
                : "text-text-muted hover:text-text"
            }`}
          >
            Traces & Waterfalls
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "stats"
                ? "bg-accent/20 text-accent font-semibold"
                : "text-text-muted hover:text-text"
            }`}
          >
            Component Latency
          </button>
          <button
            onClick={() => setActiveTab("bottlenecks")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "bottlenecks"
                ? "bg-accent/20 text-accent font-semibold"
                : "text-text-muted hover:text-text"
            }`}
          >
            Bottlenecks
          </button>
        </nav>

        {/* Actions & Refresh */}
        <div className="flex items-center space-x-3">
          {/* Auto Refresh Select */}
          <div className="flex items-center space-x-1.5 text-xs text-text-muted">
            <Clock className="h-3.5 w-3.5 text-text-subtle" />
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              aria-label="Auto refresh interval"
              className="rounded border border-border bg-bg-card px-2 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value={0}>Manual</option>
              <option value={5000}>Auto (5s)</option>
              <option value={15000}>Auto (15s)</option>
              <option value={30000}>Auto (30s)</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs font-medium text-text transition-colors hover:bg-bg-subtle disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-accent" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};

