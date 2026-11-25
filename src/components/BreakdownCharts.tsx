"use client";

import React, { useMemo, useState } from "react";
import type { BreakdownStat } from "@/lib/types";
import { formatDuration, formatTokens } from "@/lib/formatters";

type LatencyMetricFilter = "all" | "p95" | "p50" | "avg";
type SortByMode = "default" | "p95" | "p50" | "avg" | "calls";

interface BreakdownLatencyChartProps {
  title: string;
  subtitle: string;
  items: BreakdownStat[];
  headerRight?: React.ReactNode;
  emptyMessage?: string;
  maxHeightClass?: string;
}

export const BreakdownLatencyChart: React.FC<BreakdownLatencyChartProps> = ({
  title,
  subtitle,
  items,
  headerRight,
  emptyMessage = "No execution spans recorded for the active duration filter.",
  maxHeightClass = "max-h-[380px]",
}) => {
  const [metricMode, setMetricMode] = useState<LatencyMetricFilter>("all");
  const [sortBy, setSortBy] = useState<SortByMode>("default");
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const sortedItems = useMemo(() => {
    const copy = [...(items || [])];
    if (sortBy === "p95") return copy.sort((a, b) => b.p95_duration_ms - a.p95_duration_ms);
    if (sortBy === "p50") return copy.sort((a, b) => b.p50_duration_ms - a.p50_duration_ms);
    if (sortBy === "avg") return copy.sort((a, b) => b.avg_duration_ms - a.avg_duration_ms);
    if (sortBy === "calls") return copy.sort((a, b) => b.total_calls - a.total_calls);
    return copy;
  }, [items, sortBy]);

  const maxLatencyMs = useMemo(() => {
    let max = 1;
    for (const item of sortedItems) {
      if (metricMode === "all" || metricMode === "p95") max = Math.max(max, item.p95_duration_ms || 0);
      if (metricMode === "all" || metricMode === "avg") max = Math.max(max, item.avg_duration_ms || 0);
      if (metricMode === "all" || metricMode === "p50") max = Math.max(max, item.p50_duration_ms || 0);
    }
    return max;
  }, [sortedItems, metricMode]);

  const showP50 = metricMode === "all" || metricMode === "p50";
  const showAvg = metricMode === "all" || metricMode === "avg";
  const showP95 = metricMode === "all" || metricMode === "p95";

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
      {/* Header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between border-b border-[#1E293B] pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {headerRight}

          {/* Latency Metric Toggle */}
          <div className="flex items-center rounded-lg border border-[#1E293B] bg-[#070C19] p-0.5 text-[10px]">
            {(
              [
                { id: "all", label: "All" },
                { id: "p50", label: "p50" },
                { id: "avg", label: "Avg" },
                { id: "p95", label: "p95" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetricMode(m.id)}
                className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                  metricMode === m.id
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortByMode)}
            aria-label="Sort latency chart"
            className="rounded-lg border border-[#1E293B] bg-[#070C19] px-2 py-1 text-[10px] font-medium text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="default">Default Order</option>
            <option value="p95">Sort: p95</option>
            <option value="avg">Sort: Avg</option>
            <option value="p50">Sort: p50</option>
            <option value="calls">Sort: Calls</option>
          </select>
        </div>
      </div>

      {/* Chart Rows */}
      {sortedItems.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 my-auto">{emptyMessage}</div>
      ) : (
        <div className={`mt-3 space-y-2.5 overflow-y-auto pr-1 ${maxHeightClass}`}>
          {sortedItems.map((item) => {
            const p50Pct = item.total_calls > 0 ? Math.max(2, (item.p50_duration_ms / maxLatencyMs) * 100) : 0;
            const avgPct = item.total_calls > 0 ? Math.max(2, (item.avg_duration_ms / maxLatencyMs) * 100) : 0;
            const p95Pct = item.total_calls > 0 ? Math.max(2, (item.p95_duration_ms / maxLatencyMs) * 100) : 0;
            const isHovered = hoveredKey === item.key;

            return (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`relative rounded-lg border p-2.5 transition-colors ${
                  isHovered
                    ? "border-slate-700 bg-[#131F37]/80"
                    : "border-[#1E293B]/70 bg-[#070C19]/60"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-white truncate">{item.label}</span>
                    {item.subtitle && (
                      <span className="hidden sm:inline font-mono text-[10px] text-slate-500 truncate">
                        {item.subtitle}
                      </span>
                    )}
                    <span className="rounded bg-[#0F172A] border border-[#1E293B] px-1.5 py-0.5 font-mono text-[10px] text-slate-300 shrink-0">
                      {item.total_calls.toLocaleString()} {item.total_calls === 1 ? "call" : "calls"}
                    </span>
                  </div>

                  {/* Numeric summary on right */}
                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    {item.total_calls === 0 ? (
                      <span className="text-slate-600 text-[10px]">No recorded calls</span>
                    ) : (
                      <>
                        {showP50 && (
                          <span className="text-cyan-400">
                            <span className="text-slate-500 text-[9px] mr-0.5">p50</span>
                            {formatDuration(item.p50_duration_ms)}
                          </span>
                        )}
                        {showAvg && (
                          <span className="text-emerald-400">
                            <span className="text-slate-500 text-[9px] mr-0.5">avg</span>
                            {formatDuration(item.avg_duration_ms)}
                          </span>
                        )}
                        {showP95 && (
                          <span className="text-amber-400 font-semibold">
                            <span className="text-slate-500 text-[9px] mr-0.5 font-normal">p95</span>
                            {formatDuration(item.p95_duration_ms)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Multi-series horizontal bars */}
                <div className="space-y-1">
                  {showP50 && (
                    <div className="flex items-center gap-2">
                      <span className="w-7 text-[9px] font-mono text-cyan-400/90 text-right shrink-0">p50</span>
                      <div className="h-2 flex-1 rounded-full bg-[#1E293B]/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                          style={{ width: `${p50Pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {showAvg && (
                    <div className="flex items-center gap-2">
                      <span className="w-7 text-[9px] font-mono text-emerald-400/90 text-right shrink-0">avg</span>
                      <div className="h-2 flex-1 rounded-full bg-[#1E293B]/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                          style={{ width: `${avgPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {showP95 && (
                    <div className="flex items-center gap-2">
                      <span className="w-7 text-[9px] font-mono text-amber-400/90 text-right shrink-0">p95</span>
                      <div className="h-2 flex-1 rounded-full bg-[#1E293B]/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-300"
                          style={{ width: `${p95Pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Rich Hover Detail Bar */}
                {isHovered && item.total_calls > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
                    <span>
                      Min: <strong className="text-slate-200">{formatDuration(item.min_duration_ms)}</strong> • Max:{" "}
                      <strong className="text-slate-200">{formatDuration(item.max_duration_ms)}</strong>
                    </span>
                    <div className="flex items-center gap-3">
                      {item.avg_ttft_ms !== null && item.avg_ttft_ms !== undefined && (
                        <span>
                          Avg TTFT: <strong className="text-amber-300">{formatDuration(item.avg_ttft_ms)}</strong>
                        </span>
                      )}
                      {item.total_tokens > 0 && (
                        <span>
                          Tokens: <strong className="text-indigo-300">{formatTokens(item.total_tokens)}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 border-t border-[#1E293B]/60 pt-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-medium text-slate-400">p50 (Median)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-medium text-slate-400">Average</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-[11px] font-medium text-slate-400">p95 (Tail)</span>
        </div>
      </div>
    </div>
  );
};

interface BreakdownErrorChartProps {
  title: string;
  subtitle: string;
  items: BreakdownStat[];
  headerRight?: React.ReactNode;
  emptyMessage?: string;
  maxHeightClass?: string;
}

export const BreakdownErrorChart: React.FC<BreakdownErrorChartProps> = ({
  title,
  subtitle,
  items,
  headerRight,
  emptyMessage = "No execution spans recorded for the active duration filter.",
  maxHeightClass = "max-h-[380px]",
}) => {
  const [sortBy, setSortBy] = useState<"default" | "error_rate" | "errors" | "calls">("default");
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const sortedItems = useMemo(() => {
    const copy = [...(items || [])];
    if (sortBy === "error_rate") return copy.sort((a, b) => b.error_rate_pct - a.error_rate_pct);
    if (sortBy === "errors") return copy.sort((a, b) => b.error_count - a.error_count);
    if (sortBy === "calls") return copy.sort((a, b) => b.total_calls - a.total_calls);
    return copy;
  }, [items, sortBy]);

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
      {/* Header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between border-b border-[#1E293B] pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {headerRight}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            aria-label="Sort error rate chart"
            className="rounded-lg border border-[#1E293B] bg-[#070C19] px-2 py-1 text-[10px] font-medium text-slate-300 focus:border-cyan-500 focus:outline-none"
          >
            <option value="default">Default Order</option>
            <option value="error_rate">Sort: Error Rate</option>
            <option value="errors">Sort: Errors</option>
            <option value="calls">Sort: Calls</option>
          </select>
        </div>
      </div>

      {/* Chart Rows */}
      {sortedItems.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 my-auto">{emptyMessage}</div>
      ) : (
        <div className={`mt-3 space-y-2.5 overflow-y-auto pr-1 ${maxHeightClass}`}>
          {sortedItems.map((item) => {
            const hasCalls = item.total_calls > 0;
            const errRate = item.error_rate_pct || 0;
            const barWidthPct = !hasCalls ? 0 : errRate > 0 ? Math.max(3, Math.min(100, errRate)) : 0;
            const isCritical = errRate > 5;
            const isWarn = errRate > 0 && errRate <= 5;
            const isHovered = hoveredKey === item.key;
            const successCount = Math.max(0, item.total_calls - item.error_count);

            return (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                className={`rounded-lg border p-2.5 transition-colors ${
                  isHovered
                    ? "border-slate-700 bg-[#131F37]/80"
                    : "border-[#1E293B]/70 bg-[#070C19]/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-white truncate">{item.label}</span>
                    {item.subtitle && (
                      <span className="hidden sm:inline font-mono text-[10px] text-slate-500 truncate">
                        {item.subtitle}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px] shrink-0">
                    {!hasCalls ? (
                      <span className="text-slate-600 text-[10px]">0 calls</span>
                    ) : (
                      <>
                        <span className="text-[10px] text-slate-400">
                          {item.error_count}/{item.total_calls} err
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                            isCritical
                              ? "bg-rose-950/70 text-rose-300 border-rose-700/60"
                              : isWarn
                              ? "bg-amber-950/70 text-amber-300 border-amber-700/60"
                              : "bg-emerald-950/60 text-emerald-300 border-emerald-700/50"
                          }`}
                        >
                          {errRate.toFixed(1)}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Error Rate Progress Track */}
                <div className="h-2.5 w-full rounded-full bg-[#1E293B]/80 overflow-hidden relative">
                  {hasCalls && errRate === 0 && (
                    <div className="h-full w-full bg-emerald-500/15" />
                  )}
                  {barWidthPct > 0 && (
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCritical ? "bg-rose-500" : isWarn ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${barWidthPct}%` }}
                    />
                  )}
                </div>

                {/* Hover breakdown */}
                {isHovered && hasCalls && (
                  <div className="mt-2 pt-1.5 border-t border-[#1E293B] flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>
                      Success: <strong className="text-emerald-400">{successCount}</strong> ({(100 - errRate).toFixed(1)}%)
                    </span>
                    <span>
                      Failed: <strong className={item.error_count > 0 ? "text-rose-400" : "text-slate-300"}>{item.error_count}</strong> ({errRate.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 border-t border-[#1E293B]/60 pt-2.5 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-medium text-slate-400">0% (Healthy)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-[11px] font-medium text-slate-400">&le; 5% Warning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="text-[11px] font-medium text-slate-400">&gt; 5% Critical</span>
        </div>
      </div>
    </div>
  );
};
