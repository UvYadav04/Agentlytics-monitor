"use client";

import React, { useState } from "react";
import { ChevronRight, Search, XCircle } from "lucide-react";
import type { TraceSummary } from "@/lib/types";
import { formatDuration, formatTimestamp, formatTokens } from "@/lib/formatters";

interface TracesTableProps {
  traces: TraceSummary[];
  selectedTraceId: string | null;
  onSelectTrace: (traceId: string) => void;
  isLoading: boolean;
}

export const TracesTable: React.FC<TracesTableProps> = ({
  traces,
  selectedTraceId,
  onSelectTrace,
  isLoading,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all");

  const filtered = traces.filter((t) => {
    const matchesSearch = t.trace_id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "error"
        ? t.error_count > 0
        : t.error_count === 0;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card shadow-sm">
      {/* Controls & Search */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-subtle" />
          <input
            type="text"
            placeholder="Search by Investigation / Trace ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-subtle py-1.5 pl-9 pr-3 text-xs text-text placeholder-text-subtle focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-text-muted">Status:</span>
          {(["all", "success", "error"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded px-2.5 py-1 text-xs capitalize transition-colors ${
                statusFilter === filter
                  ? "bg-accent/20 font-medium text-accent border border-accent/30"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-bg-subtle text-text-muted uppercase text-[10px] tracking-wider border-b border-border">
            <tr>
              <th className="px-5 py-3 font-medium">Trace ID</th>
              <th className="px-5 py-3 font-medium">Recorded At</th>
              <th className="px-5 py-3 font-medium text-right">Spans</th>
              <th className="px-5 py-3 font-medium text-right">Duration</th>
              <th className="px-5 py-3 font-medium text-right">Tokens</th>
              <th className="px-5 py-3 font-medium text-center">Status</th>
              <th className="px-5 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-text-muted">
                  Loading traces...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-text-muted">
                  No traces found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const isSelected = selectedTraceId === t.trace_id;
                const hasError = t.error_count > 0;

                return (
                  <tr
                    key={t.trace_id}
                    onClick={() => onSelectTrace(t.trace_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-accent/10 border-l-2 border-l-accent"
                        : "hover:bg-bg-subtle/50"
                    }`}
                  >
                    <td className="px-5 py-3 font-mono font-medium text-text">
                      <span className="truncate block max-w-xs">{t.trace_id}</span>
                    </td>
                    <td className="px-5 py-3 text-text-muted">{formatTimestamp(t.created_at)}</td>
                    <td className="px-5 py-3 text-right text-text-muted">{t.total_spans}</td>
                    <td className="px-5 py-3 text-right font-medium text-accent">
                      {formatDuration(t.total_duration_ms)}
                    </td>
                    <td className="px-5 py-3 text-right text-text-subtle">
                      {t.total_tokens > 0 ? (
                        <span>
                          {formatTokens(t.total_tokens)}{" "}
                          <span className="text-[10px] text-text-muted">
                            ({formatTokens(t.total_prompt_tokens)} / {formatTokens(t.total_completion_tokens)})
                          </span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          hasError
                            ? "bg-accent-rose/10 text-accent-rose border border-accent-rose/30"
                            : "bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/30"
                        }`}
                      >
                        {hasError ? `${t.error_count} error` : "success"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrace(t.trace_id);
                        }}
                        className="inline-flex items-center space-x-1 text-xs font-medium text-accent hover:underline"
                      >
                        <span>Waterfall</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

