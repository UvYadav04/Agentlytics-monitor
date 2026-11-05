"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Code,
  Cpu,
  Database,
  FileText,
  Filter,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import type { SpanRecord, TraceTree } from "@/lib/types";
import { formatDuration, formatTokens, getStepTypeBadgeColor } from "@/lib/formatters";

interface WaterfallViewProps {
  tree: TraceTree;
  selectedSpan: SpanRecord | null;
  onSelectSpan: (span: SpanRecord) => void;
  onClose: () => void;
}

export const WaterfallView: React.FC<WaterfallViewProps> = ({
  tree,
  selectedSpan,
  onSelectSpan,
  onClose,
}) => {
  const [collapsedSpans, setCollapsedSpans] = useState<Record<string, boolean>>({});

  const toggleCollapse = (spanId: string) => {
    setCollapsedSpans((prev) => ({ ...prev, [spanId]: !prev[spanId] }));
  };

  // Determine trace total duration & min start time
  const allSpans = tree.spans || [];
  const minStart = allSpans.length > 0 ? Math.min(...allSpans.map((s) => s.start_time)) : 0;
  const maxEnd = allSpans.length > 0 ? Math.max(...allSpans.map((s) => s.end_time)) : 1;
  const traceDuration = Math.max(0.001, (maxEnd - minStart) * 1000);

  const getStepIcon = (type: string) => {
    switch (type) {
      case "llm":
        return <Sparkles className="h-3.5 w-3.5 text-indigo-400" />;
      case "retriever":
        return <Database className="h-3.5 w-3.5 text-emerald-400" />;
      case "reranker":
        return <Filter className="h-3.5 w-3.5 text-pink-400" />;
      case "sandbox":
        return <Code className="h-3.5 w-3.5 text-amber-400" />;
      case "agent":
        return <Cpu className="h-3.5 w-3.5 text-purple-400" />;
      case "tool":
        return <Wrench className="h-3.5 w-3.5 text-teal-400" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-slate-400" />;
    }
  };

  const renderSpanRow = (span: SpanRecord, depth: number = 0) => {
    const isSelected = selectedSpan?.span_id === span.span_id;
    const isCollapsed = !!collapsedSpans[span.span_id];
    const hasChildren = span.children && span.children.length > 0;
    const badge = getStepTypeBadgeColor(span.step_type);

    // Timing bar calculations
    const startOffsetMs = Math.max(0, (span.start_time - minStart) * 1000);
    const leftPct = Math.min(99, Math.max(0, (startOffsetMs / traceDuration) * 100));
    const widthPct = Math.min(100 - leftPct, Math.max(1, (span.duration_ms / traceDuration) * 100));

    return (
      <React.Fragment key={span.span_id}>
        <div
          onClick={() => onSelectSpan(span)}
          className={`group flex items-center border-b border-border/40 py-2.5 px-4 text-xs transition-colors cursor-pointer ${
            isSelected
              ? "bg-accent/15 border-l-2 border-l-accent"
              : "hover:bg-bg-subtle/60"
          }`}
        >
          {/* Tree indentation & hierarchy */}
          <div
            className="flex items-center min-w-0 flex-1 pr-4"
            style={{ paddingLeft: `${depth * 20}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                aria-label={isCollapsed ? `Expand ${span.step_name}` : `Collapse ${span.step_name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCollapse(span.span_id);
                }}
                className="mr-1.5 p-0.5 text-text-subtle hover:text-text"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-5" />
            )}

            <div className="mr-2 flex items-center">{getStepIcon(span.step_type)}</div>

            <div className="flex items-center space-x-2 truncate">
              <span className="font-medium text-text truncate">{span.step_name}</span>
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {span.step_type}
              </span>
              <span className="text-[11px] text-text-subtle truncate hidden md:inline">
                {span.component}
              </span>
            </div>
          </div>

          {/* Tokens / Metadata preview */}
          <div className="hidden lg:flex items-center space-x-2 text-[11px] text-text-muted w-36 justify-end pr-4">
            {span.total_tokens > 0 && (
              <span className="rounded bg-bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-text-muted border border-border">
                {formatTokens(span.total_tokens)} toks
              </span>
            )}
            {span.ttft_ms && (
              <span className="rounded bg-bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-accent-amber border border-border">
                ttft: {formatDuration(span.ttft_ms)}
              </span>
            )}
            {span.status === "error" && (
              <span className="rounded bg-accent-rose/20 text-accent-rose px-1.5 py-0.5 text-[10px] font-medium border border-accent-rose/30">
                error
              </span>
            )}
          </div>

          {/* Duration Badge */}
          <div className="w-20 text-right font-mono font-medium text-text-muted pr-4">
            {formatDuration(span.duration_ms)}
          </div>

          {/* Visual Gantt Bar */}
          <div className="relative w-48 sm:w-64 h-4 bg-bg-subtle rounded overflow-hidden border border-border/60">
            <div
              className={`absolute top-0 bottom-0 rounded transition-all ${
                span.status === "error"
                  ? "bg-accent-rose"
                  : span.step_type === "llm"
                  ? "bg-indigo-500"
                  : span.step_type === "retriever"
                  ? "bg-emerald-500"
                  : span.step_type === "reranker"
                  ? "bg-pink-500"
                  : span.step_type === "sandbox"
                  ? "bg-amber-500"
                  : "bg-accent"
              }`}
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
              }}
              title={`${span.step_name}: ${formatDuration(span.duration_ms)}`}
            />
          </div>
        </div>

        {/* Recursive child spans */}
        {hasChildren && !isCollapsed && span.children?.map((child) => renderSpanRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-semibold text-text">Investigation Waterfall Timeline</h2>
            <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-mono text-accent">
              {tree.trace_id}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Total spans: {tree.total_spans} | Total duration: {formatDuration(traceDuration)}
          </p>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-text-muted hover:bg-bg-subtle hover:text-text transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Waterfall Table Header */}
      <div className="flex items-center justify-between bg-bg-subtle px-4 py-2 text-[10px] uppercase tracking-wider text-text-muted border-b border-border">
        <span>Step Name / Execution Hierarchy</span>
        <div className="flex items-center space-x-8">
          <span className="hidden lg:inline">Tokens / Meta</span>
          <span className="w-16 text-right">Duration</span>
          <span className="w-48 sm:w-64 text-center">Timeline (Gantt)</span>
        </div>
      </div>

      {/* Spans List */}
      <div className="divide-y divide-border/20 max-h-[600px] overflow-y-auto">
        {tree.roots && tree.roots.length > 0 ? (
          tree.roots.map((root) => renderSpanRow(root, 0))
        ) : (
          <div className="p-8 text-center text-text-muted">No spans recorded for this trace.</div>
        )}
      </div>
    </div>
  );
};

