"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  Clock,
  Coins,
  Copy,
  Cpu,
  Database,
  FileCode,
  FileText,
  Sparkles,
  Table,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import type { SpanRecord } from "@/lib/types";
import { formatDuration, formatTokens, getStepTypeBadgeColor } from "@/lib/formatters";

interface SpanDrawerProps {
  span: SpanRecord | null;
  onClose: () => void;
}

export const SpanDrawer: React.FC<SpanDrawerProps> = ({ span, onClose }) => {
  const [activeTab, setActiveTab] = useState<"flow" | "inputs" | "outputs" | "metrics" | "raw">("flow");
  const [copied, setCopied] = useState(false);
  const [copiedInputs, setCopiedInputs] = useState(false);
  const [copiedOutputs, setCopiedOutputs] = useState(false);

  if (!span) return null;

  const badge = getStepTypeBadgeColor(span.step_type);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(span, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInputs = () => {
    navigator.clipboard.writeText(JSON.stringify(span.inputs || {}, null, 2));
    setCopiedInputs(true);
    setTimeout(() => setCopiedInputs(false), 2000);
  };

  const copyOutputs = () => {
    navigator.clipboard.writeText(JSON.stringify(span.outputs || {}, null, 2));
    setCopiedOutputs(true);
    setTimeout(() => setCopiedOutputs(false), 2000);
  };

  // Extract messages if this is an LLM call
  const messages: any[] = Array.isArray(span.inputs?.messages) ? span.inputs.messages : [];
  const modelName = span.tags?.model || span.inputs?.model || "";
  const provider = span.tags?.provider || span.component.replace("llm.", "");

  // Detect specific payload categories
  const isDbStep =
    span.step_type === "database" ||
    span.step_name.includes("database") ||
    span.step_name.includes("query");

  const isSandboxStep =
    span.step_type === "sandbox" ||
    span.step_name.includes("sandbox") ||
    span.step_name.includes("run_python");

  const isChartStep =
    span.step_name.includes("visualization") ||
    span.step_name.includes("chart");

  // Extract DB specifics
  const sqlStatement =
    span.inputs?.query?.statement ||
    (typeof span.inputs?.query === "string" ? span.inputs.query : null) ||
    span.inputs?.statement;
  const mongoPipeline = span.inputs?.query?.pipeline || span.inputs?.pipeline;
  const queryRows: any[] =
    span.outputs?.output?.rows ||
    span.outputs?.rows ||
    [];
  const rowCount = span.metrics?.row_count ?? span.outputs?.output?.row_count ?? (queryRows ? queryRows.length : undefined);
  const dbExecutionTime = span.metrics?.db_execution_time_ms ?? span.outputs?.output?.execution_time_ms;

  // Extract Sandbox specifics
  const pythonCode = span.inputs?.code || span.inputs?.script;
  const sandboxStdout = span.outputs?.output?.stdout || span.outputs?.stdout;
  const sandboxStderr = span.outputs?.output?.stderr || span.outputs?.stderr;
  const sandboxArtifacts = span.outputs?.output?.artifacts || span.outputs?.artifacts;

  // Extract Chart specifics
  const chartSpec = span.outputs?.output?.specification || span.outputs?.specification;

  // Extract general output text
  let outputText = "";
  if (span.outputs) {
    if (typeof span.outputs.content === "string") outputText = span.outputs.content;
    else if (typeof span.outputs.text === "string") outputText = span.outputs.text;
    else if (typeof span.outputs.reply === "string") outputText = span.outputs.reply;
    else if (typeof span.outputs.result === "string") outputText = span.outputs.result;
    else if (span.outputs.findings) outputText = JSON.stringify(span.outputs.findings, null, 2);
    else outputText = JSON.stringify(span.outputs, null, 2);
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col border-l border-border bg-bg-card shadow-drawer transition-transform">
      {/* 1. Header */}
      <div className="border-b border-border p-5 bg-gradient-to-r from-bg-subtle/50 to-bg-card">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {span.step_type}
              </span>
              <h3 className="font-semibold text-text text-base truncate">{span.step_name}</h3>
            </div>
            <p className="font-mono text-xs text-text-muted">{span.component}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyJson}
              title="Copy Full Span JSON"
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-card px-2.5 py-1 text-xs font-medium text-text-muted hover:border-dark hover:text-text transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? "Copied" : "JSON"}</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-border bg-bg-card p-1 text-text-muted hover:bg-bg-subtle hover:text-text transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Execution KPI Banner */}
        <div className="mt-4 grid grid-cols-4 gap-2 rounded-xl border border-border bg-bg p-3 text-xs">
          <div>
            <span className="text-[10px] font-semibold text-text-subtle uppercase block">Duration</span>
            <span className="font-mono font-bold text-accent">{formatDuration(span.duration_ms)}</span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-text-subtle uppercase block">Tokens</span>
            <span className="font-mono font-medium text-text">
              {span.total_tokens > 0 ? formatTokens(span.total_tokens) : "—"}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-text-subtle uppercase block">Status</span>
            <span
              className={`font-semibold capitalize ${
                span.status === "error" ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {span.status}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-text-subtle uppercase block">TTFT</span>
            <span className="font-mono text-text">
              {span.ttft_ms ? formatDuration(span.ttft_ms) : "—"}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mt-4 flex gap-1 border-b border-border/80 pb-px">
          {(["flow", "inputs", "outputs", "metrics", "raw"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-accent text-accent font-semibold"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {tab === "flow" ? "Execution Flow" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
        {/* TAB 1: EXECUTION FLOW (HOW INPUT CAME & FINAL OUTPUT) */}
        {activeTab === "flow" && (
          <div className="space-y-6">
            {/* Step Sequence Timeline */}
            <div className="rounded-xl border border-border bg-bg-card p-4 space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">
                Step Timing & Lifecycle
              </span>
              <div className="flex flex-col gap-2 font-mono text-xs">
                <div className="flex items-center gap-2 text-text">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-text-subtle">Start:</span>
                  <span>{new Date(span.start_time * 1000).toLocaleTimeString()}</span>
                  <span className="text-text-subtle">({new Date(span.start_time * 1000).toISOString()})</span>
                </div>
                <div className="ml-1 border-l-2 border-border/80 pl-4 py-1 text-text-muted">
                  <span className="font-sans text-xs">Processing duration: </span>
                  <span className="font-bold text-accent">{formatDuration(span.duration_ms)}</span>
                  {dbExecutionTime !== undefined && (
                    <span className="text-[11px] text-cyan-700 ml-2 font-mono">
                      (Engine time: {formatDuration(dbExecutionTime)})
                    </span>
                  )}
                  {span.ttft_ms && (
                    <span className="text-[11px] text-amber-700 ml-2">
                      (TTFT: {formatDuration(span.ttft_ms)})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-text">
                  <div className="h-2 w-2 rounded-full bg-indigo-500" />
                  <span className="text-text-subtle">Finish:</span>
                  <span>{new Date(span.end_time * 1000).toLocaleTimeString()}</span>
                  <span className="text-text-subtle">({new Date(span.end_time * 1000).toISOString()})</span>
                </div>
              </div>
            </div>

            {/* Input Received */}
            <div className="rounded-xl border border-border bg-bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-accent" />
                  Input Received
                </span>
                <button
                  onClick={copyInputs}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-accent transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedInputs ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* SQL Statement Display */}
              {sqlStatement && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 block">
                    Executed SQL Statement
                  </span>
                  <div className="rounded-lg bg-slate-900 text-slate-100 p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                    <code>{sqlStatement}</code>
                  </div>
                </div>
              )}

              {/* MongoDB Pipeline Display */}
              {mongoPipeline && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    MongoDB Aggregation Pipeline
                  </span>
                  <div className="rounded-lg bg-slate-900 text-slate-100 p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                    <code>{JSON.stringify(mongoPipeline, null, 2)}</code>
                  </div>
                </div>
              )}

              {/* Python Sandbox Code Display */}
              {pythonCode && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                    Python Sandbox Script
                  </span>
                  <div className="rounded-lg bg-slate-900 text-slate-100 p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-60">
                    <code>{pythonCode}</code>
                  </div>
                </div>
              )}

              {/* LLM Messages Display */}
              {messages.length > 0 && !sqlStatement && !pythonCode && (
                <div className="space-y-2">
                  {messages.map((m, idx) => (
                    <div key={idx} className="rounded-lg border border-border bg-bg-subtle p-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block mb-1">
                        {m.role || "Message"}
                      </span>
                      <p className="text-text text-xs whitespace-pre-wrap font-sans max-h-40 overflow-y-auto">
                        {typeof m.content === "string" ? m.content : JSON.stringify(m.content, null, 2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Fallback Input Display */}
              {!sqlStatement && !mongoPipeline && !pythonCode && messages.length === 0 && (
                <pre className="rounded-lg border border-border bg-bg-subtle p-3 font-mono text-[11px] text-text max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {span.inputs && Object.keys(span.inputs).length > 0
                    ? JSON.stringify(span.inputs, null, 2)
                    : "No structured input payload recorded."}
                </pre>
              )}
            </div>

            {/* Output Generated */}
            <div className="rounded-xl border border-border bg-bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  Final Output Generated
                </span>
                <button
                  onClick={copyOutputs}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-accent transition-colors"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedOutputs ? "Copied" : "Copy"}</span>
                </button>
              </div>

              {/* Query Result Rows Table Preview */}
              {queryRows && Array.isArray(queryRows) && queryRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 flex items-center gap-1">
                      <Table className="h-3 w-3" />
                      Result Rows ({rowCount ?? queryRows.length} returned)
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-bg-subtle border-b border-border text-text-muted font-semibold">
                        <tr>
                          {Object.keys(queryRows[0]).map((col) => (
                            <th key={col} className="p-2 truncate max-w-[150px]">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {queryRows.slice(0, 10).map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-bg-subtle/50">
                            {Object.values(row).map((val: any, vIdx) => (
                              <td key={vIdx} className="p-2 truncate max-w-[150px] text-text">
                                {typeof val === "object" ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {queryRows.length > 10 && (
                    <p className="text-[10px] text-text-muted italic">
                      Showing first 10 rows of {queryRows.length}.
                    </p>
                  )}
                </div>
              )}

              {/* Sandbox Terminal STDOUT Output */}
              {sandboxStdout && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <Terminal className="h-3 w-3" />
                    Sandbox STDOUT
                  </span>
                  <div className="rounded-lg bg-slate-900 text-emerald-400 p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-48">
                    <code>{sandboxStdout}</code>
                  </div>
                </div>
              )}

              {/* Sandbox STDERR Errors */}
              {sandboxStderr && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Sandbox STDERR
                  </span>
                  <div className="rounded-lg bg-red-950 text-red-200 p-3 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                    <code>{sandboxStderr}</code>
                  </div>
                </div>
              )}

              {/* Chart Specification Preview */}
              {chartSpec && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    Chart Artifact Generated ({chartSpec.chart_type || "interactive"})
                  </span>
                  <div className="rounded-lg border border-border bg-bg-subtle p-3 space-y-1 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Chart ID:</span>
                      <span className="font-bold text-accent">{chartSpec.chart_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Title:</span>
                      <span className="text-text">{chartSpec.title}</span>
                    </div>
                    {chartSpec.location && (
                      <div className="flex justify-between truncate">
                        <span className="text-text-muted mr-2">Location:</span>
                        <span className="text-text-muted truncate">{chartSpec.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Fallback General Output Display */}
              {(!queryRows || queryRows.length === 0) && !sandboxStdout && !chartSpec && (
                <pre className="rounded-lg border border-border bg-bg-subtle p-3 font-mono text-[11px] text-text max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {outputText || "No output generated or step currently in progress."}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INPUTS PAYLOAD */}
        {activeTab === "inputs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Complete Input Payload
              </span>
              <button
                onClick={copyInputs}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-accent transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </button>
            </div>
            <pre className="rounded-xl border border-border bg-bg-subtle p-4 font-mono text-[11px] text-text overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(span.inputs || {}, null, 2)}
            </pre>
          </div>
        )}

        {/* TAB 3: OUTPUTS PAYLOAD */}
        {activeTab === "outputs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Complete Output Payload
              </span>
              <button
                onClick={copyOutputs}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-accent transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </button>
            </div>
            <pre className="rounded-xl border border-border bg-bg-subtle p-4 font-mono text-[11px] text-text overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(span.outputs || {}, null, 2)}
            </pre>
          </div>
        )}

        {/* TAB 4: METRICS & TOKENS */}
        {activeTab === "metrics" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-bg-card p-4 space-y-2.5">
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-muted">Span ID:</span>
                <span className="font-mono text-text">{span.span_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-muted">Parent Span ID:</span>
                <span className="font-mono text-text">{span.parent_span_id || "None (Root Agent)"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-muted">Execution Duration:</span>
                <span className="font-mono font-bold text-accent">{formatDuration(span.duration_ms)}</span>
              </div>
              {dbExecutionTime !== undefined && (
                <div className="flex justify-between py-1 border-b border-border/60 text-cyan-800">
                  <span>Engine Database Execution:</span>
                  <span className="font-mono font-semibold">{formatDuration(dbExecutionTime)}</span>
                </div>
              )}
              {rowCount !== undefined && (
                <div className="flex justify-between py-1 border-b border-border/60 text-cyan-800">
                  <span>Rows Returned:</span>
                  <span className="font-mono font-semibold">{rowCount}</span>
                </div>
              )}
              {span.ttft_ms && (
                <div className="flex justify-between py-1 border-b border-border/60 text-amber-700">
                  <span>TTFT (Time To First Token):</span>
                  <span className="font-mono font-semibold">{formatDuration(span.ttft_ms)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-muted">Prompt Tokens:</span>
                <span className="font-mono text-text">{span.prompt_tokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-text-muted">Completion Tokens:</span>
                <span className="font-mono text-text">{span.completion_tokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-text-muted">Total Tokens:</span>
                <span className="font-mono font-bold text-text">{span.total_tokens.toLocaleString()}</span>
              </div>
            </div>

            {span.tags && Object.keys(span.tags).length > 0 && (
              <div className="rounded-xl border border-border bg-bg-card p-4 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block">
                  Tags & Metadata
                </span>
                <pre className="rounded-lg border border-border bg-bg-subtle p-3 font-mono text-[11px] text-text overflow-x-auto">
                  {JSON.stringify(span.tags, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: RAW JSON */}
        {activeTab === "raw" && (
          <pre className="rounded-xl border border-border bg-bg-subtle p-4 font-mono text-[11px] text-text overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(span, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
