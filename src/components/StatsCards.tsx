"use client";

import React from "react";
import type { OverviewMetrics } from "@/lib/types";

interface StatsCardsProps {
  metrics?: OverviewMetrics;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ metrics }) => {
  const totalTraces = metrics?.totalTraces ?? 0;
  const totalSpans = metrics?.totalSpans ?? 0;
  const p50LatencySec = metrics?.p50LatencySec ?? 0;
  const p95LatencySec = metrics?.p95LatencySec ?? 0;
  const avgLatencySec = metrics?.avgLatencySec ?? 0;
  const errorRatePct = metrics?.errorRatePct ?? 0;
  const failedTracesCount = metrics?.failedTracesCount ?? 0;
  const totalTokens = metrics?.totalTokens ?? 0;
  const inputTokens = metrics?.inputTokens ?? 0;
  const outputTokens = metrics?.outputTokens ?? 0;
  const llmCallsCount = metrics?.llmCallsCount ?? 0;
  const databaseCallsCount = metrics?.databaseCallsCount ?? 0;

  const cards = [
    {
      title: "Requests",
      value: totalTraces.toLocaleString(),
      subtext: `${totalSpans.toLocaleString()} execution steps traced`,
      subtextColor: totalTraces > 0 ? "text-cyan-400" : "text-slate-500",
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
      subtext: `${failedTracesCount} failed requests`,
      subtextColor: errorRatePct > 5 ? "text-amber-400" : errorRatePct > 0 ? "text-emerald-400" : "text-slate-500",
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
      subtext: llmCallsCount > 0 ? "DeepInfra & Groq calls" : "0 LLM calls",
      subtextColor: llmCallsCount > 0 ? "text-indigo-400" : "text-slate-500",
    },
    {
      title: "Database Queries",
      value: databaseCallsCount.toLocaleString(),
      subtext: databaseCallsCount > 0 ? "PostgreSQL & DuckDB" : "0 database calls",
      subtextColor: databaseCallsCount > 0 ? "text-cyan-400" : "text-slate-500",
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
