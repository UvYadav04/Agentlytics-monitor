"use client";

import React, { useState } from "react";
import type { BreakdownStat } from "@/lib/types";
import { formatDuration, formatTokens } from "@/lib/formatters";

interface StepChartProps {
  stat: BreakdownStat;
  titlePrefix?: string;
}

export const StepLatencyChartCard: React.FC<StepChartProps> = ({ stat, titlePrefix }) => {
  const timeline = stat.timeline || [];
  const histogram = stat.histogram || [];
  const [viewMode, setViewMode] = useState<"trend" | "distribution">(
    timeline.length >= 2 ? "trend" : "distribution"
  );
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [visibleSeries, setVisibleSeries] = useState({ p50: true, avg: true, p95: true });

  const displayTitle = titlePrefix ? `${titlePrefix} — Latency` : `${stat.label} Latency`;
  const hasCalls = stat.total_calls > 0;

  const toggleSeries = (k: "p50" | "avg" | "p95") => {
    setVisibleSeries((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      if (!next.p50 && !next.avg && !next.p95) return prev;
      return next;
    });
  };

  // Trend SVG geometry
  const chartWidth = 460;
  const chartHeight = 150;
  const padL = 46;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const innerW = chartWidth - padL - padR;
  const innerH = chartHeight - padT - padB;

  const rawMaxMs = Math.max(
    ...timeline.map((pt) =>
      Math.max(
        visibleSeries.p95 ? pt.p95_ms : 0,
        visibleSeries.avg ? pt.avg_ms : 0,
        visibleSeries.p50 ? pt.p50_ms : 0
      )
    ),
    100
  );
  const maxMs = rawMaxMs >= 1000 ? Math.ceil(rawMaxMs / 1000) * 1000 : Math.ceil(rawMaxMs / 100) * 100;

  const points = timeline.map((pt, i) => {
    const x = timeline.length === 1 ? padL + innerW / 2 : padL + (i / Math.max(1, timeline.length - 1)) * innerW;
    const y50 = padT + innerH - (Math.min(maxMs, pt.p50_ms) / maxMs) * innerH;
    const yAvg = padT + innerH - (Math.min(maxMs, pt.avg_ms) / maxMs) * innerH;
    const y95 = padT + innerH - (Math.min(maxMs, pt.p95_ms) / maxMs) * innerH;
    return { ...pt, x, y50, yAvg, y95 };
  });

  const buildPath = (getY: (p: (typeof points)[number]) => number) => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${getY(points[0])}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      d += ` C ${cx} ${getY(prev)}, ${cx} ${getY(curr)}, ${curr.x} ${getY(curr)}`;
    }
    return d;
  };

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;
  const yTicks = [maxMs, maxMs / 2, 0];
  const maxHistCount = Math.max(...histogram.map((b) => b.count), 1);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 shadow-card">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#1E293B] pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{displayTitle}</h4>
            <span className="rounded bg-[#070C19] border border-[#1E293B] px-1.5 py-0.5 font-mono text-[10px] text-cyan-400 shrink-0">
              {stat.total_calls.toLocaleString()} {stat.total_calls === 1 ? "call" : "calls"}
            </span>
          </div>
          {stat.subtitle && (
            <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{stat.subtitle}</p>
          )}
        </div>

        {/* Trend vs Distribution toggle */}
        <div className="flex items-center rounded-lg border border-[#1E293B] bg-[#070C19] p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setViewMode("trend")}
            className={`px-2 py-0.5 rounded font-semibold transition-colors ${
              viewMode === "trend" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"
            }`}
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode("distribution")}
            className={`px-2 py-0.5 rounded font-semibold transition-colors ${
              viewMode === "distribution" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-white"
            }`}
          >
            Distribution
          </button>
        </div>
      </div>

      {/* Percentile KPI strip */}
      <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center font-mono">
        <div className="rounded-lg border border-[#1E293B] bg-[#070C19] px-2 py-1.5">
          <span className="text-[9px] uppercase text-slate-500 block">p50</span>
          <span className="text-xs font-bold text-cyan-400">
            {hasCalls ? formatDuration(stat.p50_duration_ms) : "—"}
          </span>
        </div>
        <div className="rounded-lg border border-[#1E293B] bg-[#070C19] px-2 py-1.5">
          <span className="text-[9px] uppercase text-slate-500 block">Average</span>
          <span className="text-xs font-bold text-emerald-400">
            {hasCalls ? formatDuration(stat.avg_duration_ms) : "—"}
          </span>
        </div>
        <div className="rounded-lg border border-[#1E293B] bg-[#070C19] px-2 py-1.5">
          <span className="text-[9px] uppercase text-slate-500 block">p95</span>
          <span className="text-xs font-bold text-amber-400">
            {hasCalls ? formatDuration(stat.p95_duration_ms) : "—"}
          </span>
        </div>
        <div className="rounded-lg border border-[#1E293B] bg-[#070C19] px-2 py-1.5">
          <span className="text-[9px] uppercase text-slate-500 block">Min / Max</span>
          <span className="text-[10px] font-semibold text-slate-300 truncate block mt-0.5">
            {hasCalls
              ? `${formatDuration(stat.min_duration_ms)} / ${formatDuration(stat.max_duration_ms)}`
              : "—"}
          </span>
        </div>
      </div>

      {/* Chart Area */}
      {!hasCalls ? (
        <div className="py-8 text-center text-xs text-slate-500 my-auto">
          No calls recorded for {stat.label} in current filter window
        </div>
      ) : viewMode === "trend" ? (
        <div className="relative mt-2 w-full">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-36 overflow-visible"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {yTicks.map((val, idx) => {
              const y = padT + innerH - (val / maxMs) * innerH;
              return (
                <g key={`${val}-${idx}`}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={chartWidth - padR}
                    y2={y}
                    stroke="#1E293B"
                    strokeWidth="1"
                    strokeDasharray={val === 0 ? "none" : "2 2"}
                  />
                  <text
                    x={padL - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9px] fill-slate-500 font-mono select-none"
                  >
                    {formatDuration(val)}
                  </text>
                </g>
              );
            })}

            {visibleSeries.p50 && (
              <>
                <path d={buildPath((p) => p.y50)} fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
                {points.map((p, idx) => (
                  <circle key={`p50-${idx}`} cx={p.x} cy={p.y50} r={points.length === 1 ? 4.5 : 2.5} fill="#38BDF8" />
                ))}
              </>
            )}
            {visibleSeries.avg && (
              <>
                <path
                  d={buildPath((p) => p.yAvg)}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                />
                {points.map((p, idx) => (
                  <circle key={`avg-${idx}`} cx={p.x} cy={p.yAvg} r={points.length === 1 ? 4.5 : 2.2} fill="#10B981" />
                ))}
              </>
            )}
            {visibleSeries.p95 && (
              <>
                <path d={buildPath((p) => p.y95)} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                {points.map((p, idx) => (
                  <circle key={`p95-${idx}`} cx={p.x} cy={p.y95} r={points.length === 1 ? 4.5 : 2.5} fill="#F59E0B" />
                ))}
              </>
            )}

            {points.map((p, idx) => {
              const showTick =
                points.length <= 7 || idx === 0 || idx === points.length - 1 || idx % Math.ceil(points.length / 5) === 0;
              return showTick ? (
                <text
                  key={`x-${idx}`}
                  x={p.x}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className="text-[9px] fill-slate-400 font-mono select-none"
                >
                  {p.time}
                </text>
              ) : null;
            })}

            {points.map((p, idx) => (
              <rect
                key={`hit-${idx}`}
                x={p.x - innerW / Math.max(1, points.length) / 2}
                y={padT}
                width={innerW / Math.max(1, points.length)}
                height={innerH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
              />
            ))}

            {hoveredPoint && (
              <line
                x1={hoveredPoint.x}
                y1={padT}
                x2={hoveredPoint.x}
                y2={padT + innerH}
                stroke="#64748B"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}
          </svg>

          {hoveredPoint && (
            <div
              className="pointer-events-none absolute z-10 rounded-md border border-slate-700 bg-slate-900/95 px-2.5 py-1.5 text-[11px] text-white shadow-xl backdrop-blur-sm -translate-x-1/2 -translate-y-full whitespace-nowrap"
              style={{
                left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                top: `${(Math.min(hoveredPoint.y50, hoveredPoint.yAvg, hoveredPoint.y95) / chartHeight) * 100 - 6}%`,
              }}
            >
              <div className="font-mono text-[10px] text-slate-400 mb-0.5">
                {hoveredPoint.date} ({hoveredPoint.count} calls)
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-cyan-400 font-bold">p50: {formatDuration(hoveredPoint.p50_ms)}</span>
                <span className="text-emerald-400 font-bold">avg: {formatDuration(hoveredPoint.avg_ms)}</span>
                <span className="text-amber-400 font-bold">p95: {formatDuration(hoveredPoint.p95_ms)}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Latency Bucket Histogram */
        <div className="mt-3 space-y-2 py-1">
          {histogram.map((b) => {
            const pct = stat.total_calls > 0 ? (b.count / maxHistCount) * 100 : 0;
            const share = stat.total_calls > 0 ? (b.count / stat.total_calls) * 100 : 0;
            return (
              <div key={b.label} className="flex items-center gap-2.5 text-xs font-mono">
                <span className="w-14 text-[10px] text-slate-400 text-right shrink-0">{b.label}</span>
                <div className="h-3 flex-1 rounded-full bg-[#1E293B]/80 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-400 transition-all duration-300"
                    style={{ width: `${b.count > 0 ? Math.max(4, pct) : 0}%` }}
                  />
                </div>
                <span className="w-20 text-[10px] text-slate-300 text-right shrink-0">
                  {b.count} ({share.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Legend & Tokens */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#1E293B]/60 pt-2 text-[10px]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => toggleSeries("p50")}
            className={`flex items-center gap-1 transition-opacity ${visibleSeries.p50 ? "opacity-100" : "opacity-40"}`}
          >
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-slate-300">p50</span>
          </button>
          <button
            type="button"
            onClick={() => toggleSeries("avg")}
            className={`flex items-center gap-1 transition-opacity ${visibleSeries.avg ? "opacity-100" : "opacity-40"}`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Average</span>
          </button>
          <button
            type="button"
            onClick={() => toggleSeries("p95")}
            className={`flex items-center gap-1 transition-opacity ${visibleSeries.p95 ? "opacity-100" : "opacity-40"}`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-slate-300">p95</span>
          </button>
        </div>

        <div className="font-mono text-slate-400 flex items-center gap-2">
          {stat.avg_ttft_ms !== null && stat.avg_ttft_ms !== undefined && (
            <span>TTFT: <strong className="text-amber-300">{formatDuration(stat.avg_ttft_ms)}</strong></span>
          )}
          {stat.total_tokens > 0 && (
            <span>Tokens: <strong className="text-indigo-300">{formatTokens(stat.total_tokens)}</strong></span>
          )}
        </div>
      </div>
    </div>
  );
};

export const StepErrorRateChartCard: React.FC<StepChartProps> = ({ stat, titlePrefix }) => {
  const timeline = stat.timeline || [];
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const displayTitle = titlePrefix ? `${titlePrefix} — Error Rate` : `${stat.label} Error Rate`;
  const hasCalls = stat.total_calls > 0;
  const errRate = stat.error_rate_pct || 0;
  const okCount = Math.max(0, stat.total_calls - stat.error_count);
  const okPct = hasCalls ? 100 - errRate : 0;

  const isCritical = errRate > 5;
  const isWarn = errRate > 0 && errRate <= 5;

  const chartWidth = 460;
  const chartHeight = 150;
  const padL = 38;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const innerW = chartWidth - padL - padR;
  const innerH = chartHeight - padT - padB;

  const maxY = 100;
  const slotW = innerW / Math.max(1, timeline.length);
  const barW = Math.min(34, Math.max(10, slotW * 0.55));
  const hoveredPoint = hoveredIdx !== null ? timeline[hoveredIdx] : null;

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 shadow-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-[#1E293B] pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{displayTitle}</h4>
          </div>
          {stat.subtitle && (
            <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{stat.subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono shrink-0">
          {!hasCalls ? (
            <span className="rounded bg-[#070C19] border border-[#1E293B] px-2 py-0.5 text-[10px] text-slate-500">
              0 calls
            </span>
          ) : (
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-bold border ${
                isCritical
                  ? "bg-rose-950/70 text-rose-300 border-rose-700/60"
                  : isWarn
                  ? "bg-amber-950/70 text-amber-300 border-amber-700/60"
                  : "bg-emerald-950/60 text-emerald-300 border-emerald-700/50"
              }`}
            >
              {errRate.toFixed(1)}% ({stat.error_count}/{stat.total_calls})
            </span>
          )}
        </div>
      </div>

      {/* Status Summary Strip */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-center font-mono">
        <div className="rounded-lg border border-[#1E293B] bg-[#070C19] px-2 py-1.5">
          <span className="text-[9px] uppercase text-slate-500 block">Error Rate</span>
          <span
            className={`text-xs font-bold ${
              !hasCalls ? "text-slate-500" : isCritical ? "text-rose-400" : isWarn ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {hasCalls ? `${errRate.toFixed(2)}%` : "—"}
          </span>
        </div>
        <div className="rounded-lg border border-[#1E293B] bg-[#070C19] px-2 py-1.5">
          <span className="text-[9px] uppercase text-slate-500 block">Success</span>
          <span className="text-xs font-bold text-emerald-400">{hasCalls ? okCount.toLocaleString() : "—"}</span>
        </div>
        <div className="rounded-lg border border-[#1E293B] bg-[#070C19] px-2 py-1.5">
          <span className="text-[9px] uppercase text-slate-500 block">Failed</span>
          <span className={`text-xs font-bold ${stat.error_count > 0 ? "text-rose-400" : "text-slate-300"}`}>
            {hasCalls ? stat.error_count.toLocaleString() : "—"}
          </span>
        </div>
      </div>

      {/* Error Rate Timeline Chart */}
      {!hasCalls ? (
        <div className="py-8 text-center text-xs text-slate-500 my-auto">
          No calls recorded for {stat.label} in current filter window
        </div>
      ) : (
        <div className="relative mt-2 w-full">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-36 overflow-visible"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {[100, 50, 0].map((val) => {
              const y = padT + innerH - (val / maxY) * innerH;
              return (
                <g key={val}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={chartWidth - padR}
                    y2={y}
                    stroke="#1E293B"
                    strokeWidth="1"
                    strokeDasharray={val === 0 ? "none" : "2 2"}
                  />
                  <text
                    x={padL - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9px] fill-slate-500 font-mono select-none"
                  >
                    {val}%
                  </text>
                </g>
              );
            })}

            {timeline.map((pt, idx) => {
              const cx = padL + slotW * idx + slotW / 2;
              const x = cx - barW / 2;
              const barH = pt.error_rate_pct > 0 ? Math.max(4, (pt.error_rate_pct / maxY) * innerH) : 3;
              const y = padT + innerH - barH;
              const fillColor =
                pt.error_rate_pct > 5 ? "#EF4444" : pt.error_rate_pct > 0 ? "#F59E0B" : "#10B981";
              const isHov = hoveredIdx === idx;

              return (
                <g
                  key={pt.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                >
                  {/* Full height hover slot */}
                  <rect x={padL + slotW * idx} y={padT} width={slotW} height={innerH} fill="transparent" />
                  {/* Subtle background track */}
                  <rect
                    x={x}
                    y={padT}
                    width={barW}
                    height={innerH}
                    rx="3"
                    fill="#1E293B"
                    opacity={isHov ? 0.55 : 0.25}
                  />
                  {/* Error rate bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={barH}
                    rx="3"
                    fill={fillColor}
                    opacity={pt.error_rate_pct === 0 ? 0.55 : isHov ? 1 : 0.85}
                  />
                  {/* Value label above bar if errors > 0 */}
                  {pt.error_rate_pct > 0 && (
                    <text
                      x={cx}
                      y={Math.max(padT + 8, y - 4)}
                      textAnchor="middle"
                      className="text-[9px] font-mono font-semibold fill-slate-200 select-none"
                    >
                      {pt.error_rate_pct.toFixed(0)}%
                    </text>
                  )}
                  {(timeline.length <= 7 || idx === 0 || idx === timeline.length - 1 || idx % Math.ceil(timeline.length / 5) === 0) && (
                    <text
                      x={cx}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      className="text-[9px] fill-slate-400 font-mono select-none"
                    >
                      {pt.time}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {hoveredPoint && hoveredIdx !== null && (
            <div
              className="pointer-events-none absolute z-10 rounded-md border border-slate-700 bg-slate-900/95 px-2.5 py-1.5 text-[11px] text-white shadow-xl backdrop-blur-sm -translate-x-1/2 -translate-y-full whitespace-nowrap"
              style={{
                left: `${((padL + slotW * hoveredIdx + slotW / 2) / chartWidth) * 100}%`,
                top: `14%`,
              }}
            >
              <div className="font-mono text-[10px] text-slate-400 mb-0.5">{hoveredPoint.date}</div>
              <div className="font-mono">
                <span className={hoveredPoint.error_rate_pct > 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                  {hoveredPoint.error_rate_pct.toFixed(1)}% error
                </span>{" "}
                <span className="text-slate-400">
                  ({hoveredPoint.error_count}/{hoveredPoint.count} failed)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success vs Error Stacked Ratio Bar */}
      <div className="mt-2 border-t border-[#1E293B]/60 pt-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
          <span className="text-emerald-400">OK {hasCalls ? `${okPct.toFixed(1)}%` : "0%"}</span>
          <span className={stat.error_count > 0 ? "text-rose-400" : "text-slate-500"}>
            Error {hasCalls ? `${errRate.toFixed(1)}%` : "0%"}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-[#1E293B] overflow-hidden flex">
          {hasCalls && (
            <>
              <div className="h-full bg-emerald-500/80 transition-all duration-300" style={{ width: `${okPct}%` }} />
              <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${errRate}%` }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const StepAnalyticsPair: React.FC<StepChartProps> = ({ stat, titlePrefix }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <StepLatencyChartCard stat={stat} titlePrefix={titlePrefix} />
      <StepErrorRateChartCard stat={stat} titlePrefix={titlePrefix} />
    </div>
  );
};
