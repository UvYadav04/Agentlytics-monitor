"use client";

import React, { useState } from "react";
import { ArrowRight, Filter, Layers, Search, Sparkles, Terminal } from "lucide-react";
import { isRealUserRequest, type TraceSummary } from "@/lib/types";
import { formatDuration } from "@/lib/formatters";

interface RecentTracesTableProps {
  traces: TraceSummary[];
  selectedTraceId: string | null;
  onSelectTrace: (traceId: string) => void;
  isLoading?: boolean;
  limit?: number;
  onViewAll?: () => void;
  scrollable?: boolean;
  title?: string;
}

export const RecentTracesTable: React.FC<RecentTracesTableProps> = ({
  traces,
  selectedTraceId,
  onSelectTrace,
  isLoading = false,
  limit,
  onViewAll,
  scrollable = false,
  title = "Recent Requests",
}) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const userRequests = traces.filter(isRealUserRequest);

  const filtered = userRequests.filter((t) => {
    const q = search.toLowerCase();
    const matchesSearch =
      t.trace_id.toLowerCase().includes(q) ||
      (t.intent && t.intent.toLowerCase().includes(q)) ||
      (t.route && t.route.toLowerCase().includes(q)) ||
      (t.query && t.query.toLowerCase().includes(q)) ||
      (t.user_id && t.user_id.toLowerCase().includes(q));

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

  const displayTraces = limit ? filtered.slice(0, limit) : filtered;

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
      {/* Header with Title and Search/Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <span className="rounded-full bg-cyan-950/80 border border-cyan-800/50 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
              {limit && userRequests.length > limit
                ? `Showing ${displayTraces.length} of ${userRequests.length}`
                : `${userRequests.length} ${userRequests.length === 1 ? "request" : "requests"}`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Click a request to inspect its multi-step execution path</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search requests by query, intent, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg border border-[#1E293B] bg-[#070C19] py-1 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-52 sm:w-64"
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

          {/* View All Button if in limited homepage mode */}
          {onViewAll && limit && userRequests.length > limit && (
            <button
              onClick={onViewAll}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium ml-1"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
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

      {/* Table Container */}
      <div className={`mt-2 flex-1 overflow-x-auto ${scrollable ? "max-h-[640px] overflow-y-auto" : ""}`}>
        <table className="w-full text-left text-xs">
          <thead className={scrollable ? "sticky top-0 bg-[#0F172A] z-10 shadow-sm" : ""}>
            <tr className="border-b border-[#1E293B] text-[11px] font-medium text-slate-400">
              <th className="pb-2.5 pt-1 font-medium pl-1">Request / Query</th>
              <th className="pb-2.5 pt-1 font-medium">Steps</th>
              <th className="pb-2.5 pt-1 font-medium">Intent / Route</th>
              <th className="pb-2.5 pt-1 font-medium">Latency</th>
              <th className="pb-2.5 pt-1 font-medium">Tokens</th>
              <th className="pb-2.5 pt-1 font-medium">Status</th>
              <th className="pb-2.5 pt-1 font-medium text-right pr-2">Time ↓</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/40">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Loading requests...
                </td>
              </tr>
            ) : displayTraces.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  {traces.length === 0
                    ? "No user requests recorded yet. Requests will appear here once queries run through Quarry Engine."
                    : "No requests found matching filter."}
                </td>
              </tr>
            ) : (
              displayTraces.map((t) => {
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

                const stepCount = t.total_spans || 1;

                const timeStr =
                  t.time_display ||
                  (t.created_at
                    ? new Date(t.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "—");

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
                    {/* 1. Request / Query */}
                    <td className="py-3 pl-1 max-w-md pr-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-slate-100 text-xs sm:text-[13px] font-medium line-clamp-1 group-hover:text-cyan-300 transition-colors">
                          {t.query || "Data Investigation Request"}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                          <span className="text-cyan-400/80 hover:text-cyan-300 font-mono">
                            #{t.trace_id}
                          </span>
                          {t.user_id && (
                            <span className="text-slate-400">· {t.user_id}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Steps badge */}
                    <td className="py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[#131F37] border border-[#1E293B] px-2 py-0.5 text-[11px] font-mono font-medium text-cyan-300">
                        <Layers className="h-3 w-3 text-cyan-400" />
                        {stepCount} {stepCount === 1 ? "step" : "steps"}
                      </span>
                    </td>

                    {/* 3. Intent & Route */}
                    <td className="py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-slate-200 font-medium text-xs">
                          {t.intent || "Direct query"}
                        </span>
                        {t.route && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {t.route}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 4. Latency */}
                    <td className="py-3 font-mono text-slate-300 whitespace-nowrap">
                      {latencyStr}
                    </td>

                    {/* 5. Tokens */}
                    <td className="py-3 font-mono text-slate-300 whitespace-nowrap">
                      {tokensStr}
                    </td>

                    {/* 6. Status */}
                    <td className="py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isOk ? "bg-emerald-400" : isTimeout ? "bg-amber-400" : "bg-rose-500"
                          }`}
                        />
                        <span
                          className={
                            isOk ? "text-emerald-400" : isTimeout ? "text-amber-400" : "text-rose-400"
                          }
                        >
                          {isOk ? "OK" : isTimeout ? "Timeout" : "Error"}
                        </span>
                      </span>
                    </td>

                    {/* 7. Time */}
                    <td className="py-3 pr-2 text-right font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {timeStr}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer View All Link if limited on homepage */}
      {onViewAll && limit && filtered.length > limit && (
        <div className="pt-3 border-t border-[#1E293B] mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Showing latest {limit} requests
          </span>
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            <span>View all {filtered.length} requests in full table</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
