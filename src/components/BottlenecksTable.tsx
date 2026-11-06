"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
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
      <div className="rounded-2xl border border-border bg-bg-card p-12 text-center text-text-muted shadow-card font-medium">
        No performance bottlenecks identified yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-card">
      <div className="border-b border-border px-6 py-5 bg-bg-subtle/50">
        <h2 className="text-base font-semibold text-text">Top Execution Bottlenecks</h2>
        <p className="text-xs text-text-muted">Operations causing highest latency across all investigations</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-bg-subtle text-text-muted uppercase text-[10px] tracking-wider border-b border-border font-semibold">
            <tr>
              <th className="px-5 py-3.5">Step</th>
              <th className="px-5 py-3.5">Component</th>
              <th className="px-5 py-3.5">Type</th>
              <th className="px-5 py-3.5 text-right">Duration</th>
              <th className="px-5 py-3.5">Trace ID</th>
              <th className="px-5 py-3.5 text-right">Recorded At</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {slowestSpans.map((span) => {
              const badge = getStepTypeBadgeColor(span.step_type);
              const isVerySlow = span.duration_ms > 15000;

              return (
                <tr
                  key={span.span_id}
                  onClick={() => onSelectTrace(span.trace_id)}
                  className="hover:bg-bg-subtle/60 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3.5 font-medium text-text">{span.step_name}</td>
                  <td className="px-5 py-3.5 font-mono text-text-muted">{span.component}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {span.step_type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-mono font-bold">
                    <span className={isVerySlow ? "text-red-600" : "text-amber-600"}>
                      {formatDuration(span.duration_ms)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-text-muted truncate max-w-[140px]">
                    {span.trace_id}
                  </td>
                  <td className="px-5 py-3.5 text-right text-text-muted">
                    {formatTimestamp(span.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-flex items-center text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform">
                      View Trace
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
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
