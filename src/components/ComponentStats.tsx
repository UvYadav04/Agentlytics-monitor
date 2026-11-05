"use client";

import React from "react";
import type { ComponentStat } from "@/lib/types";
import { formatDuration, formatTokens, getStepTypeBadgeColor } from "@/lib/formatters";

interface ComponentStatsProps {
  stats: ComponentStat[];
}

export const ComponentStats: React.FC<ComponentStatsProps> = ({ stats }) => {
  if (!stats || stats.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-text-muted">
        No component execution data recorded in the selected window.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text">Component & Pipeline Latency Aggregation</h2>
        <p className="text-xs text-text-muted">Aggregated performance across AI steps over the last 24 hours</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-bg-subtle text-text-muted uppercase text-[10px] tracking-wider border-b border-border">
            <tr>
              <th className="px-5 py-3 font-medium">Component</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium text-right">Invocations</th>
              <th className="px-5 py-3 font-medium text-right">Avg Latency</th>
              <th className="px-5 py-3 font-medium text-right">Min / Max</th>
              <th className="px-5 py-3 font-medium text-right">Avg TTFT</th>
              <th className="px-5 py-3 font-medium text-right">Tokens</th>
              <th className="px-5 py-3 font-medium text-right">Error Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {stats.map((s, idx) => {
              const badge = getStepTypeBadgeColor(s.step_type);
              const totalTokens = (s.total_prompt_tokens || 0) + (s.total_completion_tokens || 0);

              return (
                <tr key={`${s.component}-${s.step_type}-${idx}`} className="hover:bg-bg-subtle/50 transition-colors">
                  <td className="px-5 py-3 font-mono font-medium text-text">{s.component}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {s.step_type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-text-muted">{s.total_calls.toLocaleString()}</td>
                  <td className="px-5 py-3 text-right font-semibold text-accent">
                    {formatDuration(s.avg_duration_ms)}
                  </td>
                  <td className="px-5 py-3 text-right text-text-subtle">
                    {formatDuration(s.min_duration_ms)} / {formatDuration(s.max_duration_ms)}
                  </td>
                  <td className="px-5 py-3 text-right text-text-muted">
                    {s.avg_ttft_ms ? formatDuration(s.avg_ttft_ms) : "-"}
                  </td>
                  <td className="px-5 py-3 text-right text-text-muted">
                    {totalTokens > 0 ? formatTokens(totalTokens) : "-"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={`font-medium ${
                        s.error_count > 0 ? "text-accent-rose" : "text-accent-emerald"
                      }`}
                    >
                      {s.error_rate_pct}% ({s.error_count})
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

