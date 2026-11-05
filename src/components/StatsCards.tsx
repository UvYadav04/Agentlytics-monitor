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
      <div className="rounded-xl border border-border bg-bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-medium uppercase tracking-wider">Investigations</span>
          <Layers className="h-4 w-4 text-accent" />
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-text">{totalTraces}</span>
          <span className="text-xs text-text-subtle">recorded traces</span>
        </div>
      </div>

      {/* Average End-to-End Latency */}
      <div className="rounded-xl border border-border bg-bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-medium uppercase tracking-wider">Avg Latency</span>
          <Clock className="h-4 w-4 text-accent-amber" />
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-text">
            {formatDuration(avgDuration)}
          </span>
          <span className="text-xs text-text-subtle">per pipeline run</span>
        </div>
      </div>

      {/* Total Tokens */}
      <div className="rounded-xl border border-border bg-bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-medium uppercase tracking-wider">Token Usage</span>
          <Coins className="h-4 w-4 text-accent-purple" />
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-text">
            {formatTokens(totalTokens)}
          </span>
          <span className="text-xs text-text-subtle">
            in: {formatTokens(promptTokens)} / out: {formatTokens(completionTokens)}
          </span>
        </div>
      </div>

      {/* Error Rate */}
      <div className="rounded-xl border border-border bg-bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between text-text-muted">
          <span className="text-xs font-medium uppercase tracking-wider">Error Rate</span>
          <AlertTriangle className={`h-4 w-4 ${Number(errorRate) > 0 ? "text-accent-rose" : "text-accent-emerald"}`} />
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold tracking-tight text-text">{errorRate}%</span>
          <span className="text-xs text-text-subtle">
            {totalErrors} {totalErrors === 1 ? "failure" : "failures"}
          </span>
        </div>
      </div>
    </div>
  );
};

