"use client";

import React from "react";
import { AlertTriangle, Clock, Coins, Layers } from "lucide-react";
import type { TraceSummary } from "@/lib/types";
import { formatDuration, formatTokens } from "@/lib/formatters";

interface StatsCardsProps {
  traces: TraceSummary[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ traces }) => {
  const totalTraces = traces.length;
  const totalErrors = traces.reduce((acc, t) => acc + (t.error_count > 0 ? 1 : 0), 0);
  const errorRate = totalTraces > 0 ? ((totalErrors / totalTraces) * 100).toFixed(1) : "0.0";

  const totalTokens = traces.reduce((acc, t) => acc + (t.total_tokens || 0), 0);
  const promptTokens = traces.reduce((acc, t) => acc + (t.total_prompt_tokens || 0), 0);
  const completionTokens = traces.reduce((acc, t) => acc + (t.total_completion_tokens || 0), 0);

  const avgDuration =
    totalTraces > 0
      ? traces.reduce((acc, t) => acc + (t.total_duration_ms || 0), 0) / totalTraces
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Investigations */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-card hover:shadow-cardHover transition-shadow">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Investigations
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-text">{totalTraces}</span>
          <span className="text-xs text-text-subtle">recorded traces</span>
        </div>
      </div>

      {/* Average Latency */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-card hover:shadow-cardHover transition-shadow">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Avg Latency
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 border border-amber-200 text-amber-600">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-text">
            {formatDuration(avgDuration)}
          </span>
          <span className="text-xs text-text-subtle">per investigation</span>
        </div>
      </div>

      {/* Total Tokens */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-card hover:shadow-cardHover transition-shadow">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Token Usage
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 border border-purple-200 text-purple-600">
            <Coins className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-text">
            {formatTokens(totalTokens)}
          </span>
          <span className="text-xs text-text-subtle font-mono">
            ({formatTokens(promptTokens)} in / {formatTokens(completionTokens)} out)
          </span>
        </div>
      </div>

      {/* Error Rate */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-card hover:shadow-cardHover transition-shadow">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Pipeline Health
          </span>
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
              Number(errorRate) > 0
                ? "bg-red-50 border-red-200 text-red-600"
                : "bg-emerald-50 border-emerald-200 text-emerald-600"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-text">
            {Number(errorRate) > 0 ? `${errorRate}% errors` : "100% healthy"}
          </span>
          <span className="text-xs text-text-subtle">
            {totalErrors} {totalErrors === 1 ? "failure" : "failures"}
          </span>
        </div>
      </div>
    </div>
  );
};
