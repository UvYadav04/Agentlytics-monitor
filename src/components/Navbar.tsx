"use client";

import React from "react";
import { Activity, Clock, RefreshCw, Sparkles } from "lucide-react";

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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg-card/90 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm font-serif font-bold text-lg">
            Q
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-tight text-text text-base">Quarry</span>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent border border-accent/20">
                Observability
              </span>
            </div>
            <p className="text-[11px] text-text-muted">Agent & Pipeline Tracing</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 rounded-xl bg-bg-subtle p-1 border border-border">
          <button
            onClick={() => setActiveTab("traces")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "traces"
                ? "bg-bg-card text-accent shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            Traces & Execution Flow
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "stats"
                ? "bg-bg-card text-accent shadow-sm"
                : "text-text-muted hover:text-text"
            }`}
          >
            Component Latency
          </button>
          <button
            onClick={() => setActiveTab("bottlenecks")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "bottlenecks"
                ? "bg-bg-card text-accent shadow-sm"
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
              className="rounded-lg border border-border bg-bg-card px-2.5 py-1 text-xs text-text focus:outline-none focus:ring-1 focus:ring-accent"
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
            className="flex items-center space-x-1.5 rounded-lg border border-border bg-bg-card px-3.5 py-1.5 text-xs font-semibold text-text shadow-sm hover:bg-bg-subtle hover:border-dark transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-accent" : "text-text-muted"}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};
