"use client";

import React, { useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Layers,
  Search,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { TracebackViewer } from "@/components/TracebackViewer";
import { formatDuration, formatTokens, getStepTypeBadgeColor } from "@/lib/formatters";
import { formatPayloadToMarkdown } from "@/lib/markdownFormatter";
import type { SpanRecord, TraceTree } from "@/lib/types";

interface TraceInspectorModalProps {
  tree: TraceTree | null;
  onClose: () => void;
}

export const TraceInspectorModal: React.FC<TraceInspectorModalProps> = ({ tree, onClose }) => {
  const [viewMode, setViewMode] = useState<"flow" | "waterfall" | "raw" | "error">("flow");
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  // All steps start collapsed by default as requested
  const [expandedSpans, setExpandedSpans] = useState<Record<string, boolean>>({});
  // Inline traceback collapsed by default to preserve maximum space for execution traces
  const [showInlineTraceback, setShowInlineTraceback] = useState(false);

  if (!tree) return null;

  const allSpans = tree.spans || [];

  // Sort spans chronologically from first to latest
  const sortedSpans = [...allSpans].sort((a, b) => {
    const startA = a.start_time ?? 0;
    const startB = b.start_time ?? 0;
    if (startA !== startB) return startA - startB;
    return (a.created_at || "").localeCompare(b.created_at || "");
  });

  const minStart = sortedSpans.length > 0 ? Math.min(...sortedSpans.map((s) => s.start_time ?? 0)) : 0;
  const maxEnd = sortedSpans.length > 0 ? Math.max(...sortedSpans.map((s) => s.end_time ?? 0)) : 1;
  const totalDurationMs = Math.max(1, (maxEnd - minStart) * 1000);

  // Check for error
  const failedSpan = sortedSpans.find((s) => s.status === "error" || s.error);
  const hasError = !!failedSpan;

  // Extract meta and user query
  let queryText = "";
  let userEmail = "";
  let route = "";
  let userId = "";

  for (const s of sortedSpans) {
    if (!queryText) {
      if (s.inputs?.objective) queryText = String(s.inputs.objective);
      else if (s.inputs?.query) queryText = String(s.inputs.query);
      else if (s.inputs?.question) queryText = String(s.inputs.question);
      else if (s.inputs?.prompt) queryText = String(s.inputs.prompt);
      else if (Array.isArray(s.inputs?.messages) && s.inputs.messages.length > 0) {
        const userMsg = s.inputs.messages.find(
          (m: any) =>
            m.role === "user" ||
            m.type === "HumanMessage" ||
            m.role === "HumanMessage"
        );
        if (userMsg?.content) queryText = String(userMsg.content);
        else if (s.inputs.messages[0]?.content) {
          queryText = String(s.inputs.messages[0].content);
        }
      }
    }
    if (s.tags?.user_email && !userEmail) userEmail = String(s.tags.user_email);
    if (s.tags?.route && !route) route = String(s.tags.route);
    if (s.tags?.user_id && !userId) userId = String(s.tags.user_id);
    if (s.inputs?.user_id && !userId) userId = String(s.inputs.user_id);
  }

  // Query fallback
  if (!queryText) {
    queryText = "Execution of data investigation pipeline";
  }

  const totalTokens = sortedSpans.reduce((acc, s) => acc + (s.total_tokens || 0), 0);
  const promptTokens = sortedSpans.reduce((acc, s) => acc + (s.prompt_tokens || 0), 0);
  const completionTokens = sortedSpans.reduce((acc, s) => acc + (s.completion_tokens || 0), 0);

  const toggleSpan = (spanId: string) => {
    setExpandedSpans((prev) => ({ ...prev, [spanId]: !prev[spanId] }));
  };

  const expandAll = () => {
    const allOpen: Record<string, boolean> = {};
    sortedSpans.forEach((s) => {
      allOpen[s.span_id] = true;
    });
    setExpandedSpans(allOpen);
  };

  const collapseAll = () => {
    setExpandedSpans({});
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const jumpToSpan = (spanId: string) => {
    setViewMode("flow");
    setExpandedSpans((prev) => ({ ...prev, [spanId]: true }));
    setTimeout(() => {
      const el = document.getElementById(`span-${spanId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="flex h-full max-h-[94vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700/80 bg-[#0B1120] text-slate-100 shadow-2xl overflow-hidden">
        {/* 1. Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-[#1E293B] bg-[#0F172A] px-6 py-4 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Pill */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                hasError
                  ? "bg-rose-950/60 text-rose-300 border border-rose-700/60"
                  : "bg-emerald-950/60 text-emerald-300 border border-emerald-700/60"
              }`}
            >
              {hasError ? (
                <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span>{hasError ? "Failed / Error" : "OK (Success)"}</span>
            </span>

            {/* Trace ID */}
            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-300 bg-[#070C19] border border-[#1E293B] px-3 py-1 rounded-lg">
              <span className="text-slate-500 font-sans">Trace:</span>
              <span className="font-semibold text-cyan-400">{tree.trace_id}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tree.trace_id);
                  setCopiedTrace(true);
                  setTimeout(() => setCopiedTrace(false), 2000);
                }}
                className="ml-1 text-slate-400 hover:text-white"
                title="Copy Trace ID"
              >
                {copiedTrace ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>

            {/* Route */}
            {route && (
              <span className="rounded-lg bg-indigo-950/50 border border-indigo-700/40 px-2.5 py-1 text-[11px] font-medium text-indigo-300 uppercase tracking-wider">
                {route}
              </span>
            )}

            {/* User */}
            {(userEmail || userId) && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 bg-[#070C19] border border-[#1E293B] px-2.5 py-1 rounded-lg">
                <User className="h-3 w-3 text-slate-500" />
                <span className="truncate max-w-[150px]">{userEmail || userId}</span>
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="rounded-lg border border-[#1E293B] bg-[#070C19] p-1.5 text-slate-400 hover:bg-[#1E293B] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 2. Executive Metrics Strip & Prominent User Query at the Top (max-h constrained so traces below always have space) */}
        <div className="border-b border-[#1E293B] bg-[#0C1425] p-4 sm:p-5 space-y-3 sm:space-y-4 max-h-[44vh] overflow-y-auto shrink-0">
          {/* USER QUERY VISIBLE AT TOP */}
          <div className="rounded-xl border border-cyan-500/30 bg-[#071329] p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-cyan-400" />
                User Query / Request Objective
              </span>
              {queryText && (
                <button
                  onClick={() => copyToClipboard(queryText, "user_query")}
                  className="text-[11px] text-slate-400 hover:text-cyan-400 font-mono inline-flex items-center gap-1 bg-[#0B1528] px-2 py-0.5 rounded border border-[#1E293B]"
                >
                  {copiedSection === "user_query" ? "Copied!" : "Copy Query"}
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed font-sans">
              {queryText || "Investigation Pipeline Execution"}
            </p>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-2 sm:p-2.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Total Latency</span>
              <span className="text-sm sm:text-base font-bold font-mono text-cyan-400">
                {formatDuration(totalDurationMs)}
              </span>
            </div>

            <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-2 sm:p-2.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Total Tokens</span>
              <div className="flex items-baseline gap-1">
                <span className="text-sm sm:text-base font-bold font-mono text-white">
                  {totalTokens.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ({promptTokens} in / {completionTokens} out)
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-2 sm:p-2.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Execution Steps</span>
              <span className="text-sm sm:text-base font-bold font-mono text-white">
                {sortedSpans.length} steps recorded
              </span>
            </div>

            <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-2 sm:p-2.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Execution Status</span>
              <span
                className={`text-sm sm:text-base font-bold font-mono ${
                  hasError ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {hasError ? "1 Failed Step" : "Completed Successfully"}
              </span>
            </div>
          </div>

          {/* Failure Alert Box - Sleek, compact and informative with collapsible/expandable traceback */}
          {hasError && failedSpan?.error && (
            <div className="rounded-xl border border-rose-600/50 bg-rose-950/25 p-3.5 sm:p-4 space-y-2.5 shadow-lg shadow-rose-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-900/60 border border-rose-700/60 text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-rose-300">
                    Pipeline Execution Failure:{" "}
                    <span className="text-white font-mono">{failedSpan.error.type || "Error"}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Step Pill & Quick Jump to Step */}
                  <button
                    onClick={() => jumpToSpan(failedSpan.span_id)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-900/40 hover:bg-rose-900/70 text-rose-200 border border-rose-700/50 transition-colors"
                    title="Jump to this step in the flow"
                  >
                    <span>Step: <strong className="text-white">{failedSpan.step_name}</strong></span>
                    <ArrowDownRight className="h-3 w-3 text-rose-400" />
                  </button>

                  {/* Copy Error Message */}
                  <button
                    onClick={() => copyToClipboard(failedSpan.error!.message, "err_msg")}
                    className="text-[10px] text-rose-300 hover:text-white font-mono px-2 py-0.5 rounded bg-black/40 border border-rose-800/40 transition-colors"
                  >
                    {copiedSection === "err_msg" ? "Copied!" : "Copy Error"}
                  </button>

                  {/* Inline Traceback Toggle Button */}
                  {failedSpan.error.traceback && (
                    <button
                      onClick={() => setShowInlineTraceback((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[10px] text-rose-200 hover:text-white font-mono px-2.5 py-0.5 rounded bg-rose-900/50 hover:bg-rose-800/60 border border-rose-700/60 transition-colors font-semibold"
                    >
                      {showInlineTraceback ? (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          <span>Hide Traceback</span>
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-3 w-3" />
                          <span>View Traceback</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Open in Dedicated Tab */}
                  {failedSpan.error.traceback && (
                    <button
                      onClick={() => setViewMode("error")}
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-100 font-mono px-2 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-700/40 transition-colors"
                      title="Inspect full traceback view"
                    >
                      <span>Full Inspector</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Error Message Box */}
              <div className="text-xs text-rose-200 font-mono bg-black/40 p-2.5 rounded-lg border border-rose-900/40 break-words leading-relaxed max-h-24 overflow-y-auto">
                {failedSpan.error.message}
              </div>

              {/* Inline Collapsible Traceback */}
              {showInlineTraceback && failedSpan.error.traceback && (
                <div className="pt-1">
                  <TracebackViewer
                    traceback={failedSpan.error.traceback}
                    errorType={failedSpan.error.type}
                    errorMessage={failedSpan.error.message}
                    maxHeight="max-h-56"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Navigation View Switcher & Accordion Controls */}
        <div className="flex items-center justify-between border-b border-[#1E293B] bg-[#070C19] px-6 py-2.5 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-white">Execution Steps (First to Latest):</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={expandAll}
                className="text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded bg-[#0F172A] border border-[#1E293B] transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded bg-[#0F172A] border border-[#1E293B] transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="flex items-center rounded-lg bg-[#0F172A] p-0.5 border border-[#1E293B]">
            <button
              onClick={() => setViewMode("flow")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                viewMode === "flow"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Steps Flow
            </button>
            <button
              onClick={() => setViewMode("waterfall")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                viewMode === "waterfall"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Waterfall
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                viewMode === "raw"
                  ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Raw Payloads
            </button>
            {hasError && failedSpan?.error && (
              <button
                onClick={() => setViewMode("error")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === "error"
                    ? "bg-rose-950/80 text-rose-300 font-semibold border border-rose-700/60 shadow-sm"
                    : "text-rose-400 hover:text-rose-200 hover:bg-rose-950/30"
                }`}
              >
                <Bug className="h-3 w-3 text-rose-400" />
                <span>Error Traceback</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. Modal Body: Tool & Agent Detailed Steps (ALWAYS HAS AMPLE SPACE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
          {/* VIEW 1: TOOL & AGENT FLOW - CHRONOLOGICAL, COLLAPSED, VERTICAL FULL-WIDTH MARKDOWN */}
          {viewMode === "flow" && (
            <div className="space-y-3">
              {sortedSpans.map((span, idx) => {
                const badge = getStepTypeBadgeColor(span.step_type);
                // Each step is collapsed by default
                const isExpanded = !!expandedSpans[span.span_id];
                const isError = span.status === "error" || !!span.error;
                const pct = Math.min(100, Math.max(1, (span.duration_ms / totalDurationMs) * 100));

                const inputMarkdown = formatPayloadToMarkdown(span.inputs, true);
                const outputMarkdown = formatPayloadToMarkdown(
                  span.outputs || (span.error ? { error: span.error } : null),
                  false
                );

                return (
                  <div
                    key={span.span_id}
                    id={`span-${span.span_id}`}
                    className={`rounded-xl border transition-all ${
                      isError
                        ? "border-rose-600/70 bg-rose-950/15 shadow-md shadow-rose-950/20"
                        : isExpanded
                        ? "border-cyan-500/40 bg-[#0F172A] shadow-md"
                        : "border-[#1E293B] bg-[#0F172A] hover:border-slate-700"
                    }`}
                  >
                    {/* Step Card Header - Click to toggle collapse */}
                    <div
                      onClick={() => toggleSpan(span.span_id)}
                      className="flex flex-col gap-2 p-3.5 sm:flex-row sm:items-center sm:justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        {/* Chevron collapse indicator */}
                        <div className="text-slate-400 hover:text-white transition-transform">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-cyan-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>

                        {/* Step Number in Chronological Order (1 to N) */}
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-bold font-mono ${
                            isError
                              ? "bg-rose-950 border-rose-700 text-rose-400"
                              : "bg-[#070C19] border-[#1E293B] text-cyan-400"
                          }`}
                        >
                          {idx + 1}
                        </span>

                        {/* Step Type Badge */}
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {span.step_type}
                        </span>

                        {/* Failed Indicator Badge */}
                        {isError && (
                          <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-rose-950 text-rose-300 border border-rose-600/80 flex items-center gap-1 shadow-sm">
                            <AlertTriangle className="h-3 w-3 text-rose-400" />
                            Failed
                          </span>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white text-xs sm:text-sm">
                              {span.step_name}
                            </h4>
                            <span className="font-mono text-[11px] text-slate-500">
                              ({span.component})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Latency, Tokens & Share */}
                      <div className="flex items-center gap-3 font-mono text-xs justify-end">
                        {span.ttft_ms && (
                          <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                            TTFT: {span.ttft_ms} ms
                          </span>
                        )}

                        {span.total_tokens > 0 && (
                          <span className="text-slate-400">
                            {span.total_tokens.toLocaleString()} tokens
                          </span>
                        )}

                        <span
                          className={`font-bold ${
                            isError ? "text-rose-400" : "text-cyan-400"
                          }`}
                        >
                          {formatDuration(span.duration_ms)}
                        </span>

                        <span className="text-[11px] text-slate-500">
                          ({pct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Step Body: VERTICAL FULL-WIDTH LAYOUT WITH MARKDOWN RENDERING */}
                    {isExpanded && (
                      <div className="flex flex-col gap-4 w-full p-5 bg-[#070C19]/90 border-t border-[#1E293B]">
                        {/* Visual Duration Bar */}
                        <div className="h-1 w-full bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isError ? "bg-rose-500" : "bg-cyan-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Error Banner & Traceback if Span has Error */}
                        {isError && span.error && (
                          <div className="rounded-xl border border-rose-600/50 bg-rose-950/20 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-rose-300 text-xs sm:text-sm flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-rose-400" />
                                <span>Step Failed: {span.error.type || "Execution Error"}</span>
                              </div>
                              <button
                                onClick={() => copyToClipboard(span.error!.message, `errmsg_${span.span_id}`)}
                                className="text-[10px] text-rose-300 hover:text-white font-mono px-2 py-0.5 rounded bg-black/40 border border-rose-800/40 transition-colors"
                              >
                                {copiedSection === `errmsg_${span.span_id}` ? "Copied!" : "Copy Error"}
                              </button>
                            </div>
                            <p className="font-mono text-xs text-rose-200 bg-black/40 p-2.5 rounded-lg border border-rose-900/40 break-words leading-relaxed">
                              {span.error.message}
                            </p>
                            {span.error.traceback && (
                              <div className="pt-1">
                                <TracebackViewer
                                  traceback={span.error.traceback}
                                  errorType={span.error.type}
                                  errorMessage={span.error.message}
                                  maxHeight="max-h-72"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* VERTICAL FULL-WIDTH 1: INPUT IN MARKDOWN */}
                        <div className="w-full rounded-xl border border-[#1E293B] bg-[#0A101D] p-4 space-y-2">
                          <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5 text-cyan-400" />
                              Input
                            </span>
                            <button
                              onClick={() => copyToClipboard(inputMarkdown, `inp_${span.span_id}`)}
                              className="text-[10px] text-slate-400 hover:text-cyan-400 font-mono px-2 py-0.5 rounded bg-[#070C19] border border-[#1E293B] transition-colors"
                            >
                              {copiedSection === `inp_${span.span_id}` ? "Copied!" : "Copy Input"}
                            </button>
                          </div>
                          <div className="w-full pt-1">
                            <MarkdownViewer content={inputMarkdown} />
                          </div>
                        </div>

                        {/* VERTICAL FULL-WIDTH 2: OUTPUT IN MARKDOWN */}
                        <div className="w-full rounded-xl border border-[#1E293B] bg-[#0A101D] p-4 space-y-2">
                          <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                            <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                              Output
                            </span>
                            <button
                              onClick={() => copyToClipboard(outputMarkdown, `out_${span.span_id}`)}
                              className="text-[10px] text-slate-400 hover:text-purple-400 font-mono px-2 py-0.5 rounded bg-[#070C19] border border-[#1E293B] transition-colors"
                            >
                              {copiedSection === `out_${span.span_id}` ? "Copied!" : "Copy Output"}
                            </button>
                          </div>
                          <div className="w-full pt-1">
                            <MarkdownViewer content={outputMarkdown} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: WATERFALL (GANTT TIMELINE) */}
          {viewMode === "waterfall" && (
            <div className="overflow-x-auto rounded-xl border border-[#1E293B] bg-[#0F172A] p-4">
              <div className="min-w-[650px] space-y-2">
                <div className="grid grid-cols-12 gap-2 border-b border-[#1E293B] pb-2 text-[10px] font-bold uppercase text-slate-400 font-mono">
                  <div className="col-span-5">Step & Component</div>
                  <div className="col-span-2 text-right">Duration</div>
                  <div className="col-span-2 text-right">Tokens</div>
                  <div className="col-span-3 text-right">
                    Timeline (0 to {(totalDurationMs / 1000).toFixed(2)}s)
                  </div>
                </div>

                {sortedSpans.map((s) => {
                  const badge = getStepTypeBadgeColor(s.step_type);
                  const isErr = s.status === "error" || !!s.error;
                  const startOffset = Math.max(0, ((s.start_time ?? 0) - minStart) * 1000);
                  const leftPct = Math.min(99, Math.max(0, (startOffset / totalDurationMs) * 100));
                  const widthPct = Math.min(
                    100 - leftPct,
                    Math.max(1.5, (s.duration_ms / totalDurationMs) * 100)
                  );

                  return (
                    <div
                      key={s.span_id}
                      className={`grid grid-cols-12 gap-2 items-center py-2 text-xs border-b border-[#1E293B]/40 hover:bg-[#131F37]/50 transition-colors ${
                        isErr ? "bg-rose-950/15" : ""
                      }`}
                    >
                      <div className="col-span-5 flex items-center gap-2 truncate">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {s.step_type}
                        </span>
                        <span className="font-semibold text-white truncate">{s.step_name}</span>
                        {isErr && (
                          <span className="text-[9px] font-bold uppercase bg-rose-950 text-rose-400 px-1.5 py-0.2 rounded border border-rose-800">
                            Failed
                          </span>
                        )}
                      </div>

                      <div
                        className={`col-span-2 text-right font-mono font-medium ${
                          isErr ? "text-rose-400 font-bold" : "text-cyan-400"
                        }`}
                      >
                        {formatDuration(s.duration_ms)}
                      </div>

                      <div className="col-span-2 text-right font-mono text-slate-400">
                        {s.total_tokens > 0 ? s.total_tokens.toLocaleString() : "—"}
                      </div>

                      <div className="col-span-3 relative h-4 bg-[#070C19] rounded overflow-hidden">
                        <div
                          className={`absolute top-0 bottom-0 rounded shadow-sm ${
                            isErr ? "bg-rose-500 shadow-rose-950" : "bg-cyan-500 shadow-cyan-950"
                          }`}
                          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: RAW JSON */}
          {viewMode === "raw" && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button
                  onClick={() => copyToClipboard(JSON.stringify(tree, null, 2), "raw_full")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#1E293B] bg-[#0F172A] px-3 py-1.5 text-xs text-slate-300 hover:text-white font-mono"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copiedSection === "raw_full" ? "Copied!" : "Copy Full Trace JSON"}</span>
                </button>
              </div>
              <pre className="rounded-xl border border-[#1E293B] bg-[#070C19] p-4 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-[500px]">
                {JSON.stringify(tree, null, 2)}
              </pre>
            </div>
          )}

          {/* VIEW 4: DEDICATED ERROR & TRACEBACK INSPECTOR */}
          {viewMode === "error" && failedSpan?.error && (
            <div className="space-y-4">
              {/* Failed Step Summary Card */}
              <div className="rounded-xl border border-rose-600/50 bg-rose-950/20 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-900/60 border border-rose-700/60 text-rose-300">
                      <AlertOctagon className="h-5 w-5 text-rose-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">
                          {failedSpan.error.type || "Execution Error"}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900/50 text-rose-300 border border-rose-800/50">
                          Step: {failedSpan.step_name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Component: <span className="text-cyan-400 font-mono">{failedSpan.component}</span> • Duration:{" "}
                        <span className="text-rose-400 font-mono font-semibold">{formatDuration(failedSpan.duration_ms)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => jumpToSpan(failedSpan.span_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 hover:text-white transition-colors"
                    >
                      <span>Jump to Step in Flow</span>
                      <ArrowDownRight className="h-3.5 w-3.5 text-cyan-400" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(failedSpan.error!.message, "error_view_msg")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/60 text-rose-300 hover:text-white font-mono transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copiedSection === "error_view_msg" ? "Copied!" : "Copy Error Message"}</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-rose-200 font-mono bg-black/40 p-3 rounded-lg border border-rose-900/40 break-words leading-relaxed">
                  {failedSpan.error.message}
                </div>
              </div>

              {/* Full Traceback Component */}
              {failedSpan.error.traceback ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                      <Bug className="h-4 w-4 text-rose-400" />
                      Full Exception Stack Trace
                    </span>
                  </div>
                  <TracebackViewer
                    traceback={failedSpan.error.traceback}
                    errorType={failedSpan.error.type}
                    errorMessage={failedSpan.error.message}
                    maxHeight="max-h-[500px]"
                    initialWrap={true}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-6 text-center text-xs text-slate-400">
                  No Python stack trace string was recorded for this error.
                </div>
              )}

              {/* Step Input Context */}
              {failedSpan.inputs && Object.keys(failedSpan.inputs).length > 0 && (
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-cyan-400" />
                    Inputs Provided to Failed Step
                  </span>
                  <div className="pt-1">
                    <MarkdownViewer content={formatPayloadToMarkdown(failedSpan.inputs, true)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
