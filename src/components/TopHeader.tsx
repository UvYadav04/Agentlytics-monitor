"use client";

import React from "react";
import { ChevronDown, Clock, Download, RefreshCw } from "lucide-react";

interface TopHeaderProps {
  timeRange: string;
  setTimeRange: (val: string) => void;
  refreshInterval: number;
  setRefreshInterval: (val: number) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdatedText: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  timeRange,
  setTimeRange,
  refreshInterval,
  setRefreshInterval,
  onRefresh,
  isRefreshing,
  lastUpdatedText,
}) => {
  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#1E293B] bg-[#070C19]/95 px-6 backdrop-blur-md">
      {/* Left Breadcrumb & Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center text-xs text-slate-400 font-medium">
          <span className="hover:text-slate-200 cursor-pointer">Shopping assistant</span>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-200 font-semibold">Observability</span>
        </div>

        {/* Badges */}
        <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
          Production
        </span>

        <span className="inline-flex items-center rounded-md border border-slate-700/60 bg-[#0F172A] px-2 py-0.5 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
          DEMO • synthetic telemetry
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Time Window Dropdown */}
        <div className="relative">
          <button className="flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 transition-colors">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{timeRange}</span>
            <ChevronDown className="h-3 w-3 text-slate-500 ml-0.5" />
          </button>
        </div>

        {/* Refresh Interval Dropdown */}
        <div className="relative">
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh 30s</span>
            <ChevronDown className="h-3 w-3 text-slate-500 ml-0.5" />
          </button>
        </div>

        {/* Export Button */}
        <div className="relative">
          <button className="flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 transition-colors">
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>Export</span>
            <ChevronDown className="h-3 w-3 text-slate-500 ml-0.5" />
          </button>
        </div>

        {/* Live Update Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 pl-2 text-xs font-medium text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] text-slate-300">{lastUpdatedText}</span>
        </div>
      </div>
    </header>
  );
};
