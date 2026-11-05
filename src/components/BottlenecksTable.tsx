"use client";

import React from "react";
import type { SpanRecord } from "@/lib/types";
import { formatDuration, formatTimestamp, getStepTypeBadgeColor } from "@/lib/formatters";

interface BottlenecksTableProps {
  slowestSpans: SpanRecord[];
  onSelectTrace: (traceId: string) => void;
}

export const BottlenecksTable: React.FC<BottlenecksTableProps> = ({
  slowestSpans,
  onSelectTrace,
}) => {
  if (!slowestSpans || slowestSpans.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-8 text-center text-text-muted">
        No performance bottlenecks identified yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-text">Top Execution Bottlenecks</h2>
        <p className="text-xs text-text-muted">Operations causing highest latency across all investigations</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-bg-subtle text-text-muted uppercase text-[10px] tracking-wider border-b border-border">
            <tr>
              <th className="px-5 py-3 font-medium">Step</th>
              <th className="px-5 py-3 font-medium">Component</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium text-right">Duration</th>
              <th className="px-5 py-3 font-medium">Trace ID</th>
              <th className="px-5 py-3 font-medium text-right">Recorded At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {slowestSpans.map((span) => {
              const badge = getStepTypeBadgeColor(span.step_type);
              return (
                <tr key={span.span_id} className="hover:bg-bg-subtle/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-text">{span.step_name}</td>
                  <td className="px-5 py-3 font-mono text-text-subtle">{span.component}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {span.step_type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-accent-amber">
                    {formatDuration(span.duration_ms)}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs">
                    <button
                      onClick={() => onSelectTrace(span.trace_id)}
                      className="text-accent hover:underline truncate max-w-xs block text-left"
                    >
                      {span.trace_id}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right text-text-muted">
                    {formatTimestamp(span.created_at)}
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

