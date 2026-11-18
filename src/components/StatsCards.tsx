"use client";

import React from "react";
import type { TraceSummary } from "@/lib/types";

interface StatsCardsProps {
  traces?: TraceSummary[];
  customMetrics?: {
    totalRequests?: number;
    requestsChangePct?: number;
    requestRate?: number;
    peakRequestRate?: number;
    p95LatencySec?: number;
    targetLatencySec?: number;
    errorRatePct?: number;
    failedRequestsCount?: number;
    totalTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    llmSpendUsd?: number;
  };
}

// Helper to generate smooth SVG path for sparklines
function createSparklinePath(data: number[], width = 120, height = 32): { line: string; area: string } {
  if (data.length === 0) return { line: "", area: "" };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return { x, y };
  });

  // Build curved SVG path
  let line = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    line += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return { line, area };
}

export const StatsCards: React.FC<StatsCardsProps> = ({ traces = [], customMetrics }) => {
  // If traces are passed, calculate dynamic values or fallback to screenshot values
  const totalRequests = customMetrics?.totalRequests ?? 18240;
  const requestsChangePct = customMetrics?.requestsChangePct ?? 12.4;
  const requestRate = customMetrics?.requestRate ?? 5.1;
  const peakRequestRate = customMetrics?.peakRequestRate ?? 9.8;
  const p95LatencySec = customMetrics?.p95LatencySec ?? 2.8;
  const targetLatencySec = customMetrics?.targetLatencySec ?? 3.0;
  const errorRatePct = customMetrics?.errorRatePct ?? 0.8;
  const failedRequestsCount = customMetrics?.failedRequestsCount ?? 146;
  const totalTokens = customMetrics?.totalTokens ?? 17500000;
  const inputTokens = customMetrics?.inputTokens ?? 14200000;
  const outputTokens = customMetrics?.outputTokens ?? 3300000;
  const llmSpendUsd = customMetrics?.llmSpendUsd ?? 38.64;

  // Sparkline data series
  const sparkRequests = [12, 14, 15, 13, 17, 19, 18, 22, 20, 25, 28, 24, 26, 30, 27, 29];
  const sparkRate = [3.2, 3.8, 4.1, 3.9, 4.5, 5.2, 4.8, 6.1, 5.4, 7.8, 9.8, 6.2, 5.1, 5.5];
  const sparkLatency = [2.2, 2.3, 2.1, 2.4, 2.3, 2.5, 2.2, 2.8, 3.8, 2.9, 2.6, 2.8, 2.7];
  const sparkErrors = [0.2, 0.4, 0.3, 0.5, 0.2, 0.8, 1.2, 0.7, 0.9, 0.6, 0.8, 0.7];
  const sparkTokens = [10, 11, 12, 13, 13.5, 14.2, 15, 15.8, 16.2, 16.9, 17.5];
  const sparkSpend = [22, 24, 26, 28, 29.5, 31, 33.2, 35.0, 36.8, 38.64];

  const cards = [
    {
      title: "Requests",
      value: totalRequests.toLocaleString(),
      subtext: `+${requestsChangePct}% vs previous hour`,
      subtextColor: "text-emerald-400",
      sparkline: sparkRequests,
      color: "#38BDF8",
    },
    {
      title: "Request rate",
      value: `${requestRate} /s`,
      subtext: `Peak ${peakRequestRate} /s`,
      subtextColor: "text-slate-400",
      sparkline: sparkRate,
      color: "#38BDF8",
    },
    {
      title: "p95 latency",
      value: `${p95LatencySec} s`,
      subtext: `Target < ${targetLatencySec.toFixed(1)} s`,
      subtextColor: "text-slate-400",
      sparkline: sparkLatency,
      color: "#38BDF8",
    },
    {
      title: "Error rate",
      value: `${errorRatePct.toFixed(2)}%`,
      subtext: `${failedRequestsCount} failed requests`,
      subtextColor: "text-slate-400",
      sparkline: sparkErrors,
      color: "#38BDF8",
    },
    {
      title: "Tokens",
      value: `${(totalTokens / 1_000_000).toFixed(1)} M`,
      subtext: `Input ${(inputTokens / 1_000_000).toFixed(1)} M • Output ${(outputTokens / 1_000_000).toFixed(1)} M`,
      subtextColor: "text-slate-400",
      sparkline: sparkTokens,
      color: "#38BDF8",
    },
    {
      title: "LLM spend",
      value: `$${llmSpendUsd.toFixed(2)}`,
      subtext: "This time window",
      subtextColor: "text-slate-400",
      sparkline: sparkSpend,
      color: "#38BDF8",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c, idx) => {
        const { line, area } = createSparklinePath(c.sparkline, 100, 28);
        return (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 transition-all hover:border-slate-700 hover:shadow-md"
          >
            <div>
              <span className="text-xs font-medium text-slate-400 block">{c.title}</span>
              <div className="mt-1.5 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                  {c.value}
                </span>
              </div>
              <p className={`mt-1 text-[11px] font-medium truncate ${c.subtextColor}`}>
                {c.subtext}
              </p>
            </div>

            {/* Sparkline Graphic */}
            <div className="mt-3 h-7 w-full overflow-hidden">
              <svg viewBox="0 0 100 28" className="h-full w-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`grad-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={area} fill={`url(#grad-${idx})`} />
                <path
                  d={line}
                  fill="none"
                  stroke={c.color}
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
};
