"use client";

import React, { useState } from "react";
import { Filter, Search } from "lucide-react";
import type { TraceSummary } from "@/lib/types";
import { formatDuration, formatTokens } from "@/lib/formatters";

interface RecentTracesTableProps {
  traces: TraceSummary[];
  selectedTraceId: string | null;
  onSelectTrace: (traceId: string) => void;
  isLoading?: boolean;
}

export const RecentTracesTable: React.FC<RecentTracesTableProps> = ({
  traces,
  selectedTraceId,
  onSelectTrace,
  isLoading = false,
}) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filtered = traces.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      t.trace_id.toLowerCase().includes(q) ||
      (t.intent && t.intent.toLowerCase().includes(q)) ||
      (t.query && t.query.toLowerCase().includes(q));

    let matchesFilter = true;
    if (filterStatus === "ok") {
      matchesFilter = t.status === "OK" || (t.error_count === 0 && t.status !== "Timeout");
    } else if (filterStatus === "timeout") {
      matchesFilter = t.status === "Timeout";
    } else if (filterStatus === "error") {
      matchesFilter = t.status === "Error" || t.error_count > 0;
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
      {/* Header with Title and Search/Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#1E293B]">
        <div>
          <h3 className="text-sm font-semibold text-white">Recent request traces</h3>
          <p className="text-xs text-slate-400 mt-0.5">Click a trace to inspect the full request path</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search traces..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg border border-[#1E293B] bg-[#070C19] py-1 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-44 sm:w-56"
            />
          </div>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
              showFilters || filterStatus !== "all"
                ? "border-cyan-500/60 bg-cyan-950/40 text-cyan-400"
                : "border-[#1E293B] bg-[#070C19] text-slate-400 hover:text-slate-200"
            }`}
            title="Filter by status"
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Row if Active */}
      {showFilters && (
        <div className="flex items-center gap-2 py-2 border-b border-[#1E293B] text-xs">
          <span className="text-slate-400 font-medium">Status:</span>
          {["all", "ok", "timeout", "error"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`rounded-md px-2.5 py-1 uppercase text-[10px] font-semibold transition-all ${
                filterStatus === f
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 bg-[#070C19]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="mt-2 flex-1 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#1E293B] text-[11px] font-medium text-slate-400">
              <th className="pb-2.5 font-medium">Time ↓</th>
              <th className="pb-2.5 font-medium">Trace</th>
              <th className="pb-2.5 font-medium">Intent</th>
              <th className="pb-2.5 font-medium">Latency</th>
              <th className="pb-2.5 font-medium">Tokens</th>
              <th className="pb-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/40">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Loading traces...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  {traces.length === 0
                    ? "No investigation traces recorded yet. Traces will appear here once requests run through Quarry Engine."
                    : "No request traces found matching filter."}
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const isSelected = selectedTraceId === t.trace_id;
                const isTimeout = t.status === "Timeout";
                const isError = t.status === "Error" || t.error_count > 0;
                const isOk = !isTimeout && !isError;

                const latencyStr =
                  t.latency_s !== undefined
                    ? `${t.latency_s.toFixed(2)} s`
                    : formatDuration(t.total_duration_ms);

                const tokensStr =
                  t.total_tokens !== undefined ? t.total_tokens.toLocaleString() : "—";

                return (
                  <tr
                    key={t.trace_id}
                    onClick={() => onSelectTrace(t.trace_id)}
                    className={`cursor-pointer transition-colors group ${
                      isSelected
                        ? "bg-cyan-950/30 border-l-2 border-cyan-400"
                        : "hover:bg-[#131F37]/60"
                    }`}
                  >
                    <td className="py-3 font-mono text-slate-400 text-[11px]">
                      {t.time_display ||
                        new Date(t.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                    </td>

                    <td className="py-3 font-mono">
                      <span className="text-cyan-400 underline underline-offset-4 decoration-cyan-400/40 group-hover:decoration-cyan-400 font-medium">
                        {t.trace_id}
                      </span>
                    </td>

                    <td className="py-3 text-slate-200 font-medium">
                      {t.intent || "Direct query"}
                    </td>

                    <td className="py-3 font-mono text-slate-300">
                      {latencyStr}
                    </td>

                    <td className="py-3 font-mono text-slate-300">
                      {tokensStr}
                    </td>

                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isOk ? "bg-emerald-400" : isTimeout ? "bg-rose-500" : "bg-rose-500"
                          }`}
                        />
                        <span
                          className={
                            isOk ? "text-emerald-400" : isTimeout ? "text-rose-400" : "text-rose-400"
                          }
                        >
                          {isOk ? "OK" : isTimeout ? "Timeout" : "Error"}
                        </span>
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
