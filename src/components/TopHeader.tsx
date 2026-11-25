"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Clock, Download, RefreshCw } from "lucide-react";

export const TIME_RANGE_OPTIONS: Array<{ label: string; sinceHours: number | null }> = [
  { label: "All Time (Recorded Traces)", sinceHours: null },
  { label: "Last 1 Hour", sinceHours: 1 },
  { label: "Last 6 Hours", sinceHours: 6 },
  { label: "Last 24 Hours", sinceHours: 24 },
  { label: "Last 7 Days", sinceHours: 24 * 7 },
  { label: "Last 30 Days", sinceHours: 24 * 30 },
];

export function timeRangeToHours(label: string): number | null {
  const found = TIME_RANGE_OPTIONS.find((o) => o.label === label);
  return found ? found.sinceHours : null;
}

const REFRESH_OPTIONS: Array<{ label: string; ms: number }> = [
  { label: "Refresh 10s", ms: 10000 },
  { label: "Refresh 30s", ms: 30000 },
  { label: "Refresh 60s", ms: 60000 },
  { label: "Manual only", ms: 0 },
];

interface TopHeaderProps {
  timeRange: string;
  setTimeRange: (val: string) => void;
  refreshInterval: number;
  setRefreshInterval: (val: number) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdatedText: string;
  onExport?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  timeRange,
  setTimeRange,
  refreshInterval,
  setRefreshInterval,
  onRefresh,
  isRefreshing,
  lastUpdatedText,
  onExport,
}) => {
  const [openMenu, setOpenMenu] = useState<"time" | "refresh" | null>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeRefreshLabel =
    REFRESH_OPTIONS.find((r) => r.ms === refreshInterval)?.label ||
    (refreshInterval > 0 ? `Refresh ${Math.round(refreshInterval / 1000)}s` : "Manual only");

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-[#1E293B] bg-[#070C19]/95 px-6 backdrop-blur-md">
      {/* Left Breadcrumb & Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center text-xs text-slate-400 font-medium">
          <span className="hover:text-slate-200 cursor-pointer">Quarry Data Engine</span>
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-slate-200 font-semibold">Observability</span>
        </div>

        {/* Badges */}
        <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
          Production
        </span>

        <span className="inline-flex items-center rounded-md border border-cyan-700/60 bg-[#0F172A] px-2 py-0.5 text-[10px] font-medium text-cyan-300 uppercase tracking-wider">
          Multi-Agent Pipeline
        </span>
      </div>

      {/* Right Controls */}
      <div ref={controlsRef} className="flex items-center gap-2.5">
        {/* Time Window Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu((m) => (m === "time" ? null : "time"))}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 transition-colors"
          >
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            <span>{timeRange}</span>
            <ChevronDown className="h-3 w-3 text-slate-500 ml-0.5" />
          </button>

          {openMenu === "time" && (
            <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-[#1E293B] bg-[#0F172A] p-1.5 shadow-2xl z-30">
              {TIME_RANGE_OPTIONS.map((opt) => {
                const selected = opt.label === timeRange;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setTimeRange(opt.label);
                      setOpenMenu(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      selected
                        ? "bg-cyan-500/15 text-cyan-300 font-semibold"
                        : "text-slate-300 hover:bg-[#17233D] hover:text-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Refresh Now + Interval Dropdown */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh telemetry now"
            className="flex items-center gap-1.5 rounded-l-lg border border-[#1E293B] bg-[#0F172A] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-400 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span>{activeRefreshLabel}</span>
          </button>
          <button
            type="button"
            onClick={() => setOpenMenu((m) => (m === "refresh" ? null : "refresh"))}
            aria-label="Select refresh interval"
            className="flex items-center rounded-r-lg border border-l-0 border-[#1E293B] bg-[#0F172A] px-2 py-1.5 text-xs text-slate-400 hover:border-slate-700 hover:text-white transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {openMenu === "refresh" && (
            <div className="absolute right-0 top-full mt-1.5 w-40 rounded-xl border border-[#1E293B] bg-[#0F172A] p-1.5 shadow-2xl z-30">
              {REFRESH_OPTIONS.map((opt) => {
                const selected = opt.ms === refreshInterval;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setRefreshInterval(opt.ms);
                      setOpenMenu(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      selected
                        ? "bg-cyan-500/15 text-cyan-300 font-semibold"
                        : "text-slate-300 hover:bg-[#17233D] hover:text-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selected && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Export Button */}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>Export JSON</span>
          </button>
        )}

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
