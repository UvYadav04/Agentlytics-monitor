"use client";

import React, { useState } from "react";
import { ArrowRight, ChevronRight, Filter, Search, Zap } from "lucide-react";
import type { SpanRecord } from "@/lib/types";
import { formatDuration, formatTimestamp, getStepTypeBadgeColor } from "@/lib/formatters";

interface BottlenecksTableProps {
  slowestSpans: SpanRecord[];
  onSelectTrace: (traceId: string) => void;
  limit?: number;
  onViewAll?: () => void;
  scrollable?: boolean;
}

export const BottlenecksTable: React.FC<BottlenecksTableProps> = ({
  slowestSpans,
  onSelectTrace,
  limit,
  onViewAll,
  scrollable = false,
}) => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const filtered = (slowestSpans || []).filter((span) => {
    const q = search.toLowerCase();
    const matchesSearch =
      span.step_name.toLowerCase().includes(q) ||
      span.component.toLowerCase().includes(q) ||
      span.trace_id.toLowerCase().includes(q);

    let matchesFilter = true;
    if (filterType !== "all") {
      matchesFilter = span.step_type.toLowerCase() === filterType.toLowerCase();
    }

    return matchesSearch && matchesFilter;
  });

  const displaySpans = limit ? filtered.slice(0, limit) : filtered;
  const maxDuration = Math.max(...(slowestSpans || []).map((s) => s.duration_ms), 1);

  if (!slowestSpans || slowestSpans.length === 0) {
    return (
      <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-8 text-center text-slate-500 shadow-card font-medium text-xs">
        No execution bottlenecks identified yet. Bottlenecks will appear as queries execute.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/20 text-amber-400">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-white">Top Execution Bottlenecks</h3>
            <span className="rounded-full bg-amber-950/80 border border-amber-800/50 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              {limit && slowestSpans.length > limit
                ? `Top ${displaySpans.length} of ${slowestSpans.length}`
                : `${slowestSpans.length} identified`}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Operations causing highest latency across all multi-agent investigations and tool calls
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search bottlenecks by step or component..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 rounded-lg border border-[#1E293B] bg-[#070C19] py-1 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-52 sm:w-64"
            />
          </div>

          {/* Type Filter Buttons */}
          <div className="hidden md:flex items-center gap-1 bg-[#070C19] border border-[#1E293B] p-0.5 rounded-lg text-[10px]">
            {["all", "llm", "database", "tool", "retriever"].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-2 py-1 uppercase font-semibold rounded ${
                  filterType === t
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* View All Button if on homepage */}
          {onViewAll && limit && slowestSpans.length > limit && (
            <button
              onClick={onViewAll}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium ml-1"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className={`mt-2 flex-1 overflow-x-auto ${scrollable ? "max-h-[640px] overflow-y-auto" : ""}`}>
        <table className="w-full text-left text-xs">
          <thead className={scrollable ? "sticky top-0 bg-[#0F172A] z-10 shadow-sm" : ""}>
            <tr className="border-b border-[#1E293B] text-[11px] font-medium text-slate-400">
              <th className="pb-2.5 pt-1 font-medium pl-1">Operation / Step</th>
              <th className="pb-2.5 pt-1 font-medium">Component</th>
              <th className="pb-2.5 pt-1 font-medium">Type</th>
              <th className="pb-2.5 pt-1 font-medium">Duration & Share</th>
              <th className="pb-2.5 pt-1 font-medium">TTFT / Tokens</th>
              <th className="pb-2.5 pt-1 font-medium">Parent Request</th>
              <th className="pb-2.5 pt-1 font-medium text-right pr-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B]/40">
            {displaySpans.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No bottleneck operations matching filter.
                </td>
              </tr>
            ) : (
              displaySpans.map((span) => {
                const badge = getStepTypeBadgeColor(span.step_type);
                const isVerySlow = span.duration_ms > 10000;
                const isSlow = span.duration_ms > 3000;
                const pct = Math.min(100, Math.max(5, (span.duration_ms / maxDuration) * 100));

                return (
                  <tr
                    key={span.span_id}
                    onClick={() => onSelectTrace(span.trace_id)}
                    className="cursor-pointer transition-colors hover:bg-[#131F37]/60 group"
                  >
                    {/* 1. Step name */}
                    <td className="py-3 pl-1 max-w-xs pr-3">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                          {span.step_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 truncate">
                          id: {span.span_id}
                        </span>
                      </div>
                    </td>

                    {/* 2. Component */}
                    <td className="py-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {span.component}
                    </td>

                    {/* 3. Type badge */}
                    <td className="py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}
                      >
                        {span.step_type}
                      </span>
                    </td>

                    {/* 4. Duration & Bar */}
                    <td className="py-3 font-mono whitespace-nowrap min-w-[150px]">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`font-bold text-xs ${
                            isVerySlow
                              ? "text-rose-400"
                              : isSlow
                              ? "text-amber-400"
                              : "text-cyan-400"
                          }`}
                        >
                          {formatDuration(span.duration_ms)}
                        </span>
                        <div className="h-1.5 w-full bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              isVerySlow
                                ? "bg-rose-500"
                                : isSlow
                                ? "bg-amber-400"
                                : "bg-cyan-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 5. TTFT / Tokens */}
                    <td className="py-3 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                      {span.ttft_ms ? (
                        <div className="flex flex-col">
                          <span className="text-amber-300">TTFT: {span.ttft_ms.toFixed(0)} ms</span>
                          {span.total_tokens > 0 && (
                            <span className="text-[10px] text-slate-500">
                              {span.total_tokens.toLocaleString()} toks
                            </span>
                          )}
                        </div>
                      ) : span.total_tokens > 0 ? (
                        <span>{span.total_tokens.toLocaleString()} tokens</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* 6. Parent Request ID */}
                    <td className="py-3 font-mono text-[11px] text-cyan-400 max-w-[140px] truncate">
                      <span className="underline underline-offset-2 decoration-cyan-400/40 group-hover:decoration-cyan-400">
                        #{span.trace_id}
                      </span>
                    </td>

                    {/* 7. Action */}
                    <td className="py-3 pr-2 text-right whitespace-nowrap">
                      <span className="inline-flex items-center text-[11px] font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors">
                        <span>Inspect</span>
                        <ChevronRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer View All Link if limited on homepage */}
      {onViewAll && limit && slowestSpans.length > limit && (
        <div className="pt-3 border-t border-[#1E293B] mt-2 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Showing top {limit} slowest operations
          </span>
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            <span>View all {slowestSpans.length} execution bottlenecks</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
