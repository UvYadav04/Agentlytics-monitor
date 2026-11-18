"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Code,
  Coins,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Layers,
  Sparkles,
  Table,
  Terminal,
  User,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import type { SpanRecord, TraceTree } from "@/lib/types";
import { formatDuration, formatTokens, getStepTypeBadgeColor } from "@/lib/formatters";

interface TraceInspectorModalProps {
  tree: TraceTree | null;
  onClose: () => void;
}

export const TraceInspectorModal: React.FC<TraceInspectorModalProps> = ({ tree, onClose }) => {
  const [viewMode, setViewMode] = useState<"flow" | "waterfall" | "raw">("flow");
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Record<string, boolean>>({});

  if (!tree) return null;

  const allSpans = tree.spans || [];
  const minStart = allSpans.length > 0 ? Math.min(...allSpans.map((s) => s.start_time)) : 0;
  const maxEnd = allSpans.length > 0 ? Math.max(...allSpans.map((s) => s.end_time)) : 1;
  const totalDurationMs = Math.max(1, (maxEnd - minStart) * 1000);

  // Check for error
  const failedSpan = allSpans.find((s) => s.status === "error" || s.error);
  const hasError = !!failedSpan;

  // Extract meta
  let queryText = "";
  let userEmail = "";
  let route = "";
  let userId = "";

  for (const s of allSpans) {
    if (s.inputs?.query) queryText = String(s.inputs.query);
    else if (s.inputs?.objective) queryText = String(s.inputs.objective);
    if (s.tags?.user_email) userEmail = String(s.tags.user_email);
    if (s.tags?.route) route = String(s.tags.route);
    if (s.tags?.user_id) userId = String(s.tags.user_id);
    if (s.inputs?.user_id && !userId) userId = String(s.inputs.user_id);
  }

  const totalTokens = allSpans.reduce((acc, s) => acc + (s.total_tokens || 0), 0);
  const promptTokens = allSpans.reduce((acc, s) => acc + (s.prompt_tokens || 0), 0);
  const completionTokens = allSpans.reduce((acc, s) => acc + (s.completion_tokens || 0), 0);

  const toggleSpan = (spanId: string) => {
    setExpandedSpans((prev) => ({ ...prev, [spanId]: !prev[spanId] }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700/80 bg-[#0B1120] text-slate-100 shadow-2xl overflow-hidden">
        {/* 1. Modal Top Bar */}
        <div className="flex items-center justify-between border-b border-[#1E293B] bg-[#0F172A] px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Pill */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                hasError
                  ? "bg-rose-950/60 text-rose-300 border border-rose-700/60"
                  : "bg-emerald-950/60 text-emerald-300 border border-emerald-700/60"
              }`}
            >
              {hasError ? <AlertOctagon className="h-3.5 w-3.5 text-rose-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              <span>{hasError ? "Failed / Timeout" : "OK (Success)"}</span>
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
                {copiedTrace ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
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

        {/* 2. Executive Metrics Strip & User Query */}
        <div className="border-b border-[#1E293B] bg-[#0C1425] p-5 space-y-4">
          {/* User Query */}
          {queryText && (
            <div className="rounded-xl border border-[#1E293B] bg-[#070C19] p-3.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-cyan-400" />
                  User Input / Prompt Query
                </span>
                <button
                  onClick={() => copyToClipboard(queryText, "user_query")}
                  className="text-[10px] text-slate-400 hover:text-cyan-400 font-mono inline-flex items-center gap-1"
                >
                  {copiedSection === "user_query" ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed font-sans">
                {queryText}
              </p>
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-2.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Total Latency</span>
              <span className="text-base font-bold font-mono text-cyan-400">
                {formatDuration(totalDurationMs)}
              </span>
            </div>

            <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-2.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Total Tokens</span>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold font-mono text-white">{totalTokens.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-mono">({promptTokens} in / {completionTokens} out)</span>
              </div>
            </div>

            <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-2.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Steps & Tools Used</span>
              <span className="text-base font-bold font-mono text-white">{allSpans.length} spans</span>
            </div>

            <div className="rounded-lg border border-[#1E293B] bg-[#0F172A] p-2.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Estimated Cost</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                ${((totalTokens / 1_000_000) * 2.2).toFixed(4)}
              </span>
            </div>
          </div>

          {/* Failure Alert Box if Error present */}
          {hasError && failedSpan?.error && (
            <div className="rounded-xl border border-rose-600/40 bg-rose-950/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs sm:text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Pipeline Execution Failure: {failedSpan.error.type}</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900/40 text-rose-300 border border-rose-800/40">
                  Step: {failedSpan.step_name}
                </span>
              </div>

              <p className="text-xs text-rose-200 font-mono bg-black/30 p-2.5 rounded-lg border border-rose-800/30">
                {failedSpan.error.message}
              </p>

              {failedSpan.error.traceback && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-rose-400/80">Stack Trace / Exception Traceback:</span>
                    <button
                      onClick={() => copyToClipboard(failedSpan.error!.traceback!, "tb")}
                      className="text-[10px] text-rose-300 hover:text-white font-mono"
                    >
                      {copiedSection === "tb" ? "Copied!" : "Copy Traceback"}
                    </button>
                  </div>
                  <pre className="max-h-40 overflow-y-auto rounded-lg bg-black/60 p-3 text-[11px] font-mono text-rose-300/90 whitespace-pre border border-rose-900/40">
                    {failedSpan.error.traceback}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Navigation View Switcher */}
        <div className="flex items-center justify-between border-b border-[#1E293B] bg-[#070C19] px-6 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Execution Breakdown:</span>
            <span className="text-[11px] text-slate-500">Every tool, agent, input & output</span>
          </div>

          <div className="flex items-center rounded-lg bg-[#0F172A] p-0.5 border border-[#1E293B]">
            <button
              onClick={() => setViewMode("flow")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                viewMode === "flow" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tool & Agent Flow
            </button>
            <button
              onClick={() => setViewMode("waterfall")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                viewMode === "waterfall" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Waterfall Timeline
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                viewMode === "raw" ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Raw Payloads
            </button>
          </div>
        </div>

        {/* 4. Modal Body: Tool & Agent Detailed Steps */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* VIEW 1: TOOL & AGENT FLOW */}
          {viewMode === "flow" && (
            <div className="space-y-4">
              {allSpans.map((span, idx) => {
                const badge = getStepTypeBadgeColor(span.step_type);
                const isExpanded = expandedSpans[span.span_id] ?? true;
                const isError = span.status === "error" || !!span.error;
                const pct = Math.min(100, Math.max(1, (span.duration_ms / totalDurationMs) * 100));

                return (
                  <div
                    key={span.span_id}
                    className={`rounded-xl border transition-all ${
                      isError
                        ? "border-rose-600/50 bg-rose-950/10"
                        : "border-[#1E293B] bg-[#0F172A] hover:border-slate-700"
                    }`}
                  >
                    {/* Step Card Header */}
                    <div
                      onClick={() => toggleSpan(span.span_id)}
                      className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between cursor-pointer border-b border-[#1E293B]/60"
                    >
                      <div className="flex items-center gap-3">
                        {/* Step Number */}
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#070C19] border border-[#1E293B] text-[11px] font-bold font-mono text-cyan-400">
                          {idx + 1}
                        </span>

                        {/* Step Type Badge */}
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          {span.step_type}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white text-xs sm:text-sm">{span.step_name}</h4>
                            <span className="font-mono text-[11px] text-slate-500">({span.component})</span>
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
                            {span.total_tokens} tokens
                          </span>
                        )}

                        <span className={`font-bold ${isError ? "text-rose-400" : "text-cyan-400"}`}>
                          {formatDuration(span.duration_ms)}
                        </span>

                        <span className="text-[11px] text-slate-500">
                          ({pct.toFixed(1)}%)
                        </span>
                      </div>
                    </div>

                    {/* Step Body: Inputs & Outputs */}
                    {isExpanded && (
                      <div className="p-4 space-y-3 bg-[#070C19]/60">
                        {/* Visual Duration Bar */}
                        <div className="h-1 w-full bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isError ? "bg-rose-500" : "bg-cyan-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Grid for Inputs & Outputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Left: Input Payload */}
                          <div className="rounded-lg border border-[#1E293B] bg-[#0B1120] p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <FileText className="h-3 w-3 text-cyan-400" />
                                Inputs Received
                              </span>
                              <button
                                onClick={() => copyToClipboard(JSON.stringify(span.inputs, null, 2), `inp_${span.span_id}`)}
                                className="text-[10px] text-slate-400 hover:text-cyan-400 font-mono"
                              >
                                {copiedSection === `inp_${span.span_id}` ? "Copied!" : "Copy"}
                              </button>
                            </div>

                            <pre className="max-h-48 overflow-y-auto rounded bg-black/40 p-2 font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                              {span.inputs && Object.keys(span.inputs).length > 0
                                ? JSON.stringify(span.inputs, null, 2)
                                : "No explicit input recorded."}
                            </pre>
                          </div>

                          {/* Right: Output Payload or Error */}
                          <div className="rounded-lg border border-[#1E293B] bg-[#0B1120] p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-purple-400" />
                                Output Generated
                              </span>
                              <button
                                onClick={() =>
                                  copyToClipboard(
                                    JSON.stringify(span.outputs || span.error, null, 2),
                                    `out_${span.span_id}`
                                  )
                                }
                                className="text-[10px] text-slate-400 hover:text-cyan-400 font-mono"
                              >
                                {copiedSection === `out_${span.span_id}` ? "Copied!" : "Copy"}
                              </button>
                            </div>

                            {isError && span.error ? (
                              <div className="max-h-48 overflow-y-auto rounded bg-rose-950/40 p-2 font-mono text-[11px] text-rose-300 border border-rose-800/40">
                                <div className="font-bold mb-1">{span.error.type}:</div>
                                <div>{span.error.message}</div>
                              </div>
                            ) : (
                              <pre className="max-h-48 overflow-y-auto rounded bg-black/40 p-2 font-mono text-[11px] text-slate-300 whitespace-pre-wrap">
                                {span.outputs && Object.keys(span.outputs).length > 0
                                  ? JSON.stringify(span.outputs, null, 2)
                                  : "No output payload returned."}
                              </pre>
                            )}
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
                  <div className="col-span-3 text-right">Timeline (0 to {(totalDurationMs / 1000).toFixed(2)}s)</div>
                </div>

                {allSpans.map((s) => {
                  const badge = getStepTypeBadgeColor(s.step_type);
                  const startOffset = Math.max(0, (s.start_time - minStart) * 1000);
                  const leftPct = Math.min(99, Math.max(0, (startOffset / totalDurationMs) * 100));
                  const widthPct = Math.min(100 - leftPct, Math.max(1.5, (s.duration_ms / totalDurationMs) * 100));

                  return (
                    <div key={s.span_id} className="grid grid-cols-12 gap-2 items-center py-2 text-xs border-b border-[#1E293B]/40 hover:bg-[#131F37]/50 transition-colors">
                      <div className="col-span-5 flex items-center gap-2 truncate">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {s.step_type}
                        </span>
                        <span className="font-semibold text-white truncate">{s.step_name}</span>
                      </div>

                      <div className="col-span-2 text-right font-mono font-medium text-cyan-400">
                        {formatDuration(s.duration_ms)}
                      </div>

                      <div className="col-span-2 text-right font-mono text-slate-400">
                        {s.total_tokens > 0 ? s.total_tokens : "—"}
                      </div>

                      <div className="col-span-3 relative h-4 bg-[#070C19] rounded overflow-hidden">
                        <div
                          className="absolute top-0 bottom-0 rounded bg-cyan-500 shadow-sm"
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
        </div>
      </div>
    </div>
  );
};

