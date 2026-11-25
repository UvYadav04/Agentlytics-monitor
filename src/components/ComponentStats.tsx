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
      <div className="rounded-2xl border border-border bg-bg-card p-12 text-center text-text-muted shadow-card font-medium">
        No component execution data recorded in the selected window.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-card">
      <div className="border-b border-border px-6 py-5 bg-bg-subtle/50">
        <h2 className="text-base font-semibold text-text">Component & Pipeline Latency Aggregation</h2>
        <p className="text-xs text-text-muted">Aggregated p50, p95, average latency, and error rates across recorded steps</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-bg-subtle text-text-muted uppercase text-[10px] tracking-wider border-b border-border font-semibold">
            <tr>
              <th className="px-4 py-3.5">Component</th>
              <th className="px-4 py-3.5">Type</th>
              <th className="px-4 py-3.5 text-right">Calls</th>
              <th className="px-4 py-3.5 text-right">p50</th>
              <th className="px-4 py-3.5 text-right">Avg</th>
              <th className="px-4 py-3.5 text-right">p95</th>
              <th className="px-4 py-3.5 text-right">Min / Max</th>
              <th className="px-4 py-3.5 text-right">Tokens</th>
              <th className="px-4 py-3.5 text-right">Error Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {stats.map((s, idx) => {
              const badge = getStepTypeBadgeColor(s.step_type);
              const totalTokens = (s.total_prompt_tokens || 0) + (s.total_completion_tokens || 0);

              return (
                <tr key={`${s.component}-${s.step_type}-${idx}`} className="hover:bg-bg-subtle/60 transition-colors">
                  <td className="px-4 py-3.5 font-mono font-medium text-text">{s.component}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {s.step_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-text-muted">{s.total_calls.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-right font-mono text-cyan-400">
                    {formatDuration(s.p50_duration_ms ?? s.avg_duration_ms)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-semibold text-emerald-400">
                    {formatDuration(s.avg_duration_ms)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-amber-400">
                    {formatDuration(s.p95_duration_ms ?? s.max_duration_ms)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-text-subtle whitespace-nowrap">
                    {formatDuration(s.min_duration_ms)} / {formatDuration(s.max_duration_ms)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono text-text-muted">
                    {totalTokens > 0 ? formatTokens(totalTokens) : "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className={`font-semibold ${
                        s.error_rate_pct > 0 ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {s.error_rate_pct.toFixed(1)}%
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
