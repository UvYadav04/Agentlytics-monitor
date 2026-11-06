"use client";

import React, { useState } from "react";
import { ChevronRight, Filter, Search, XCircle } from "lucide-react";
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
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-card">
      {/* Controls & Search */}
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between bg-bg-subtle/50">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-subtle" />
          <input
            type="text"
            placeholder="Search by Investigation / Trace ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg-card py-2 pl-9 pr-3 text-xs text-text placeholder-text-subtle focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-text-muted">Status:</span>
          {(["all", "success", "error"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                statusFilter === filter
                  ? "bg-bg-card text-accent border border-border shadow-sm"
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
          <thead className="bg-bg-subtle text-text-muted uppercase text-[10px] tracking-wider border-b border-border font-semibold">
            <tr>
              <th className="px-5 py-3.5">Investigation / Trace ID</th>
              <th className="px-5 py-3.5">Recorded At</th>
              <th className="px-5 py-3.5 text-right">Spans</th>
              <th className="px-5 py-3.5 text-right">Total Duration</th>
              <th className="px-5 py-3.5 text-right">Tokens Used</th>
              <th className="px-5 py-3.5 text-center">Status</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-text-muted font-medium">
                  Loading investigation traces...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-text-muted font-medium">
                  No traces found matching your criteria.
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
                        ? "bg-accent/10 border-l-4 border-l-accent"
                        : "hover:bg-bg-subtle/70"
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono font-medium text-text">
                      <div className="flex items-center space-x-2">
                        <span className="truncate max-w-[200px]">{t.trace_id}</span>
                        {isSelected && (
                          <span className="rounded bg-accent/20 px-1.5 py-0.2 text-[10px] text-accent font-sans font-semibold">
                            Viewing
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-text-muted">{formatTimestamp(t.created_at)}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-text">
                      {t.total_spans}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-accent">
                      {formatDuration(t.total_duration_ms)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-text-muted">
                      {t.total_tokens > 0 ? formatTokens(t.total_tokens) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                          hasError
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {hasError ? "Error" : "Success"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform">
                        Inspect Flow
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </span>
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
