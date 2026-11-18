"use client";

import React from "react";
import type { OverviewMetrics } from "@/lib/types";

interface StatsCardsProps {
  metrics?: OverviewMetrics;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ metrics }) => {
  const totalTraces = metrics?.totalTraces ?? 1137;
  const totalSpans = metrics?.totalSpans ?? 3312;
  const p50LatencySec = metrics?.p50LatencySec ?? 3.58;
  const p95LatencySec = metrics?.p95LatencySec ?? 31.64;
  const avgLatencySec = metrics?.avgLatencySec ?? 15.01;
  const errorRatePct = metrics?.errorRatePct ?? 4.05;
  const failedTracesCount = metrics?.failedTracesCount ?? 46;
  const totalTokens = metrics?.totalTokens ?? 5389577;
  const inputTokens = metrics?.inputTokens ?? 5115744;
  const outputTokens = metrics?.outputTokens ?? 273833;
  const llmCallsCount = metrics?.llmCallsCount ?? 1567;
  const databaseCallsCount = metrics?.databaseCallsCount ?? 740;

  const cards = [
    {
      title: "Investigations",
      value: totalTraces.toLocaleString(),
      subtext: `${totalSpans.toLocaleString()} total spans traced`,
      subtextColor: "text-cyan-400",
    },
    {
      title: "p95 Latency",
      value: `${p95LatencySec.toFixed(1)} s`,
      subtext: `p50: ${p50LatencySec.toFixed(1)} s • avg: ${avgLatencySec.toFixed(1)} s`,
      subtextColor: "text-slate-400",
    },
    {
      title: "Error Rate",
      value: `${errorRatePct.toFixed(2)}%`,
      subtext: `${failedTracesCount} failed investigations`,
      subtextColor: errorRatePct > 5 ? "text-amber-400" : "text-emerald-400",
    },
    {
      title: "Tokens",
      value: `${(totalTokens / 1_000_000).toFixed(2)} M`,
      subtext: `In ${(inputTokens / 1_000_000).toFixed(2)} M • Out ${(outputTokens / 1_000_000).toFixed(2)} M`,
      subtextColor: "text-slate-400",
    },
    {
      title: "LLM Invocations",
      value: llmCallsCount.toLocaleString(),
      subtext: "DeepInfra & Groq calls",
      subtextColor: "text-indigo-400",
    },
    {
      title: "Database Queries",
      value: databaseCallsCount.toLocaleString(),
      subtext: "PostgreSQL & DuckDB",
      subtextColor: "text-cyan-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c, idx) => (
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
            <p className={`mt-1.5 text-[11px] font-medium truncate ${c.subtextColor}`}>
              {c.subtext}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
