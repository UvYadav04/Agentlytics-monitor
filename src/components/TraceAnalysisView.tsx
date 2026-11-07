"use client";

import React, { useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Coins,
  Copy,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  Sparkles,
  Terminal,
  User,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import type { SpanRecord, TraceTree } from "@/lib/types";
import { formatDuration, formatTimestamp, formatTokens, getStepTypeBadgeColor } from "@/lib/formatters";

interface TraceAnalysisViewProps {
  tree: TraceTree;
  selectedSpan: SpanRecord | null;
  onSelectSpan: (span: SpanRecord) => void;
  onClose: () => void;
}

interface ExecutionStage {
  id: string;
  stageNumber: number;
  stageType: "orchestrator" | "subagent" | "synthesis";
  title: string;
  subtitle: string;
  badgeLabel: string;
  badgeColor: { bg: string; text: string; border: string; dot: string };
  component: string;
  durationMs: number;
  totalTokens: number;
  agentSpan?: SpanRecord;
  steps: SpanRecord[];
  delegationTarget?: string;
}

export const TraceAnalysisView: React.FC<TraceAnalysisViewProps> = ({
  tree,
  selectedSpan,
  onSelectSpan,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<"flow" | "waterfall">("flow");
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [copiedTraceId, setCopiedTraceId] = useState(false);

  const allSpans = tree.spans || [];
  const minStart = allSpans.length > 0 ? Math.min(...allSpans.map((s) => s.start_time)) : 0;
  const maxEnd = allSpans.length > 0 ? Math.max(...allSpans.map((s) => s.end_time)) : 1;
  const totalDurationMs = Math.max(0.001, (maxEnd - minStart) * 1000);

  // Extract User Info & Query across all spans' tags or inputs
  let userEmail = "";
  let userId = "";
  let workspaceId = "";
  let chatId = "";
  let queryText = "";
  let route = "";

  for (const s of allSpans) {
    if (s.tags) {
      if (!userEmail && s.tags.user_email) userEmail = String(s.tags.user_email);
      if (!userId && s.tags.user_id) userId = String(s.tags.user_id);
      if (!workspaceId && s.tags.workspace_id) workspaceId = String(s.tags.workspace_id);
      if (!chatId && s.tags.chat_id) chatId = String(s.tags.chat_id);
      if (!route && s.tags.route) route = String(s.tags.route);
      if (!queryText && s.tags.query) queryText = String(s.tags.query);
    }
    if (!queryText && s.inputs) {
      if (typeof s.inputs.objective === "string") queryText = s.inputs.objective;
      else if (typeof s.inputs.query === "string") queryText = s.inputs.query;
      else if (typeof s.inputs.prompt === "string") queryText = s.inputs.prompt;
    }
  }

  const hasErrors = allSpans.some((s) => s.status === "error");
  const totalTokens = allSpans.reduce((acc, s) => acc + (s.total_tokens || 0), 0);
  const totalPromptTokens = allSpans.reduce((acc, s) => acc + (s.prompt_tokens || 0), 0);
  const totalCompletionTokens = allSpans.reduce((acc, s) => acc + (s.completion_tokens || 0), 0);

  const toggleStage = (id: string) => {
    setCollapsedStages((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyQuery = () => {
    if (!queryText) return;
    navigator.clipboard.writeText(queryText);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  const handleCopyTraceId = () => {
    navigator.clipboard.writeText(tree.trace_id);
    setCopiedTraceId(true);
    setTimeout(() => setCopiedTraceId(false), 2000);
  };

  // Build the hierarchical multi-agent stages
  const stages = buildExecutionStages(tree, totalDurationMs);

  return (
    <div className="space-y-6">
      {/* 1. Header Card: User Information & Query Details */}
      <div className="rounded-2xl border border-border bg-bg-card p-6 shadow-card">
        {/* Top Bar: Caller Meta & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Pill */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                hasErrors
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {hasErrors ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {hasErrors ? "Failed" : "Success"}
            </span>

            {/* Caller Identity */}
            <div className="flex items-center gap-1.5 rounded-lg bg-bg-subtle px-2.5 py-1 text-text-muted border border-border">
              <User className="h-3.5 w-3.5 text-text-subtle" />
              <span className="font-medium text-text">
                {userEmail || (userId ? `User: ${userId.slice(0, 10)}...` : "System / Direct API")}
              </span>
            </div>

            {/* Route Mode */}
            {route && (
              <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                {route} Mode
              </span>
            )}

            {/* Workspace ID */}
            {workspaceId && (
              <span className="rounded-lg bg-bg-subtle px-2.5 py-1 text-[11px] font-mono text-text-muted border border-border">
                ws: {workspaceId.slice(0, 8)}...
              </span>
            )}

            {/* Trace ID */}
            <button
              onClick={handleCopyTraceId}
              title="Copy Trace ID"
              className="group inline-flex items-center gap-1 rounded-lg bg-bg-subtle px-2.5 py-1 font-mono text-[11px] text-text-muted border border-border hover:border-accent hover:text-accent transition-colors"
            >
              <span>trace: {tree.trace_id.slice(0, 12)}...</span>
              <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100" />
              {copiedTraceId && <span className="text-[10px] text-accent font-sans">Copied!</span>}
            </button>
          </div>

          {/* Close Trace button */}
          <button
            onClick={onClose}
            className="self-start sm:self-auto inline-flex items-center gap-1 rounded-lg border border-border bg-bg-subtle px-3 py-1.5 text-xs font-medium text-text hover:bg-bg hover:border-dark transition-colors"
          >
            <X className="h-3.5 w-3.5 text-text-muted" />
            <span>Close Trace</span>
          </button>
        </div>

        {/* User Objective / Query Display */}
        <div className="mt-4 rounded-xl border border-border bg-bg-subtle/70 p-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-accent" />
              User Query / Objective
            </span>
            {queryText && (
              <button
                onClick={handleCopyQuery}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-accent transition-colors"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedQuery ? "Copied!" : "Copy Query"}</span>
              </button>
            )}
          </div>
          <p className="text-sm font-medium text-text leading-relaxed">
            {queryText || "No explicit user prompt recorded (direct backend function execution)."}
          </p>
        </div>

        {/* Executive Metrics Strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-bg p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle block">
              Total Duration
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-lg font-bold text-text">{formatDuration(totalDurationMs)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle block">
              Total Tokens
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <Coins className="h-4 w-4 text-purple-600" />
              <span className="text-lg font-bold text-text">{formatTokens(totalTokens)}</span>
              <span className="text-[11px] text-text-subtle font-mono">
                ({formatTokens(totalPromptTokens)} in / {formatTokens(totalCompletionTokens)} out)
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle block">
              Execution Stages
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span className="text-lg font-bold text-text">{stages.length}</span>
              <span className="text-[11px] text-text-subtle">
                ({allSpans.length} total spans)
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-bg p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-subtle block">
              Recorded At
            </span>
            <span className="mt-1 block text-xs font-medium text-text">
              {allSpans[0] ? formatTimestamp(allSpans[0].created_at) : "Just now"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Analysis Section: View Switcher & Flow */}
      <div className="rounded-2xl border border-border bg-bg-card p-6 shadow-card space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-base font-semibold text-text">Hierarchical Agent & Step Execution Flow</h3>
            <p className="text-xs text-text-muted">
              Orchestrator entry point, autonomous sub-agent execution, database queries, sandboxes, and response synthesis.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg bg-bg-subtle p-1 border border-border self-start sm:self-auto">
            <button
              onClick={() => setViewMode("flow")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "flow"
                  ? "bg-bg-card text-accent font-semibold shadow-sm"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Structured Agent Flow
            </button>
            <button
              onClick={() => setViewMode("waterfall")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "waterfall"
                  ? "bg-bg-card text-accent font-semibold shadow-sm"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Timeline (Gantt)
            </button>
          </div>
        </div>

        {/* VIEW 1: STRUCTURED MULTI-AGENT EXECUTION FLOW */}
        {viewMode === "flow" && (
          <div className="space-y-6">
            {stages.map((stage, sIdx) => (
              <React.Fragment key={stage.id}>
                {/* Connecting Delegation Arrow between stages */}
                {sIdx > 0 && (
                  <div className="flex items-center justify-center my-2">
                    <div className="flex items-center gap-2 rounded-full border border-border bg-bg-subtle px-4 py-1.5 text-xs text-text-muted shadow-sm">
                      <ArrowDown className="h-3.5 w-3.5 text-accent animate-bounce" />
                      <span className="font-medium text-text">
                        {stages[sIdx - 1].delegationTarget || `Delegated to ${stage.title}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Main Stage Card */}
                <StageCard
                  stage={stage}
                  totalDurationMs={totalDurationMs}
                  selectedSpan={selectedSpan}
                  onSelectSpan={onSelectSpan}
                  isCollapsed={!!collapsedStages[stage.id]}
                  onToggleCollapse={() => toggleStage(stage.id)}
                  minStart={minStart}
                />
              </React.Fragment>
            ))}
          </div>
        )}

        {/* VIEW 2: WATERFALL TIMELINE GANTT */}
        {viewMode === "waterfall" && (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 border-b border-border py-2 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
                <div className="col-span-5">Step Hierarchy</div>
                <div className="col-span-2 text-right">Tokens</div>
                <div className="col-span-2 text-right">Duration</div>
                <div className="col-span-3 text-right">Timeline (0s - {(totalDurationMs / 1000).toFixed(1)}s)</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-border/60">
                {tree.roots.map((rootSpan) =>
                  renderWaterfallRow(rootSpan, 0, minStart, totalDurationMs, selectedSpan, onSelectSpan)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Subcomponent: Main Stage Card (e.g. Orchestrator or Sub-Agent like DatabaseAgent)
interface StageCardProps {
  stage: ExecutionStage;
  totalDurationMs: number;
  selectedSpan: SpanRecord | null;
  onSelectSpan: (span: SpanRecord) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  minStart: number;
}

const StageCard: React.FC<StageCardProps> = ({
  stage,
  totalDurationMs,
  selectedSpan,
  onSelectSpan,
  isCollapsed,
  onToggleCollapse,
  minStart,
}) => {
  const isAgentSelected = stage.agentSpan && selectedSpan?.span_id === stage.agentSpan.span_id;
  const percentOfTotal = ((stage.durationMs / totalDurationMs) * 100).toFixed(1);

  // Pick stage icon
  const getStageIcon = () => {
    if (stage.stageType === "orchestrator") {
      return <Bot className="h-5 w-5 text-indigo-700" />;
    }
    if (stage.badgeLabel.includes("DATABASE")) {
      return <Database className="h-5 w-5 text-cyan-700" />;
    }
    if (stage.badgeLabel.includes("TABULAR")) {
      return <Code className="h-5 w-5 text-amber-700" />;
    }
    if (stage.badgeLabel.includes("DOCUMENT")) {
      return <FileText className="h-5 w-5 text-teal-700" />;
    }
    return <Sparkles className="h-5 w-5 text-purple-700" />;
  };

  return (
    <div
      className={`rounded-xl border transition-all ${
        isAgentSelected
          ? "border-accent ring-2 ring-accent/20 bg-bg-card shadow-md"
          : "border-border bg-bg-card hover:border-dark shadow-sm"
      }`}
    >
      {/* Top Stage Header */}
      <div
        onClick={() => {
          if (stage.agentSpan) onSelectSpan(stage.agentSpan);
        }}
        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between cursor-pointer border-b border-border/80 bg-gradient-to-r from-bg-subtle/80 to-bg-card rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse();
            }}
            className="rounded p-1 text-text-subtle hover:bg-bg hover:text-text transition-colors"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {/* Stage Number Badge */}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-subtle text-xs font-bold text-text border border-border">
            {stage.stageNumber}
          </span>

          {/* Icon Box */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-bg-subtle border border-border">
            {getStageIcon()}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-text text-sm sm:text-base">{stage.title}</span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold border ${stage.badgeColor.bg} ${stage.badgeColor.text} ${stage.badgeColor.border} uppercase`}
              >
                {stage.badgeLabel}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">{stage.subtitle}</p>
          </div>
        </div>

        {/* Timing, Tokens & Relative Share */}
        <div className="flex items-center gap-4 text-xs">
          {stage.totalTokens > 0 && (
            <div className="text-right">
              <span className="text-[10px] text-text-subtle uppercase block">Tokens</span>
              <span className="font-mono font-medium text-text">{formatTokens(stage.totalTokens)}</span>
            </div>
          )}

          <div className="text-right min-w-[80px]">
            <span className="text-[10px] text-text-subtle uppercase block">Duration</span>
            <span className="font-mono font-bold text-accent">{formatDuration(stage.durationMs)}</span>
          </div>

          <div className="hidden sm:block text-right">
            <span className="text-[10px] text-text-subtle uppercase block">Share</span>
            <span className="text-xs font-semibold text-text-muted">{percentOfTotal}%</span>
          </div>
        </div>
      </div>

      {/* Nested Steps List */}
      {!isCollapsed && stage.steps.length > 0 && (
        <div className="p-4 space-y-3 bg-bg/40 rounded-b-xl">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium px-2 pb-1 border-b border-border/60">
            <span>
              Nested Operations ({stage.steps.length} step{stage.steps.length !== 1 ? "s" : ""})
            </span>
            <span>Duration & Share of Total</span>
          </div>

          <div className="space-y-2">
            {stage.steps.map((childSpan, idx) => (
              <StepItem
                key={childSpan.span_id}
                span={childSpan}
                stepIndex={idx + 1}
                stageNumber={stage.stageNumber}
                totalDurationMs={totalDurationMs}
                selectedSpan={selectedSpan}
                onSelectSpan={onSelectSpan}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent: Individual Step Item inside an Agent Stage
interface StepItemProps {
  span: SpanRecord;
  stepIndex: number;
  stageNumber: number;
  totalDurationMs: number;
  selectedSpan: SpanRecord | null;
  onSelectSpan: (span: SpanRecord) => void;
}

const StepItem: React.FC<StepItemProps> = ({
  span,
  stepIndex,
  stageNumber,
  totalDurationMs,
  selectedSpan,
  onSelectSpan,
}) => {
  const isSelected = selectedSpan?.span_id === span.span_id;
  const badge = getStepTypeBadgeColor(span.step_type);
  const percentOfTotal = Math.min(100, Math.max(0.5, (span.duration_ms / totalDurationMs) * 100));

  // Determine Semantic Details
  const isDbStep =
    span.step_type === "database" ||
    span.step_name.includes("database") ||
    span.step_name.includes("query") ||
    span.step_name.includes("schema");

  const isSandboxStep =
    span.step_type === "sandbox" ||
    span.step_name.includes("sandbox") ||
    span.step_name.includes("run_python");

  const isChartStep =
    span.step_name.includes("visualization") ||
    span.step_name.includes("chart");

  // Semantic Titles
  let stepTitle = span.step_name;
  let stepDescription = "";

  if (span.step_name === "inspect_database_schema") {
    stepTitle = "Inspect Database Schema";
    stepDescription = "Read tables, columns, relations & metadata";
  } else if (span.step_name === "execute_database_query") {
    stepTitle = "Execute Database Query";
    stepDescription = "Direct read-only SQL / MongoDB execution";
  } else if (span.step_name === "propose_visualization" || span.step_name === "create_visualizations") {
    stepTitle = "Generate Interactive Visualization";
    stepDescription = "Configured and staged chart artifact";
  } else if (span.step_name === "run_python_sandbox" || span.step_type === "sandbox") {
    stepTitle = "Execute Python in Isolated Sandbox";
    stepDescription = "Run data transformation & computation script";
  } else if (span.step_type === "retriever" || span.step_name === "search_documents") {
    stepTitle = "Semantic Document Search (RAG)";
    stepDescription = "Chroma vector store similarity query";
  } else if (span.step_type === "reranker") {
    stepTitle = "Cross-Encoder Reranker";
    stepDescription = "Precision ranking of retrieved passages";
  } else if (span.step_type === "llm") {
    const provider = span.tags?.provider || span.component.replace("llm.", "");
    const model = span.tags?.model || span.inputs?.model || "";
    stepDescription = `${provider.toUpperCase()} • ${model || "Default Model"}`;

    const toolCalls = Array.isArray(span.outputs?.tool_calls)
      ? span.outputs.tool_calls
      : Array.isArray(span.outputs?.content)
      ? span.outputs.content.filter((c: any) => c && (c.__class__ === "FunctionCall" || c.name))
      : [];

    if (toolCalls.length > 0) {
      const names = toolCalls.map((c: any) => c.name || "tool").join(", ");
      stepTitle = `LLM Decision: Call ${names}`;
    } else if (stageNumber === 1 && stepIndex === 1) {
      stepTitle = "Query Analysis & Intent Planning";
    } else if (span.step_name.includes("create")) {
      stepTitle = "Response Synthesis & Reasoning";
    }
  }

  // Extract previews from inputs / outputs
  let sqlPreview = "";
  if (span.inputs) {
    let rawQuery = span.inputs.query;
    if (typeof rawQuery === "string") {
      try {
        rawQuery = JSON.parse(rawQuery);
      } catch {}
    }
    if (typeof rawQuery === "object" && rawQuery !== null) {
      if (rawQuery.statement) sqlPreview = String(rawQuery.statement);
      else if (rawQuery.sql) sqlPreview = String(rawQuery.sql);
      else if (rawQuery.pipeline) {
        const col = rawQuery.collection ? `db.${rawQuery.collection}.aggregate(` : "";
        sqlPreview = col ? `${col}${JSON.stringify(rawQuery.pipeline)})` : JSON.stringify(rawQuery.pipeline);
      }
    } else if (typeof rawQuery === "string") {
      sqlPreview = rawQuery;
    } else if (span.inputs.statement) {
      sqlPreview = String(span.inputs.statement);
    } else if (span.inputs.sql) {
      sqlPreview = String(span.inputs.sql);
    } else if (span.inputs.pipeline) {
      sqlPreview = JSON.stringify(span.inputs.pipeline);
    } else if (span.inputs.code) {
      sqlPreview = String(span.inputs.code);
    } else if (span.step_name === "inspect_database_schema") {
      const target = span.inputs.table_or_collection || span.inputs.table || span.inputs.collection;
      if (target) sqlPreview = `inspect: ${target}`;
    }
  }

  // Fallback: If sqlPreview is still empty, check LLM tool calls in outputs
  if (!sqlPreview && span.outputs) {
    const calls = Array.isArray(span.outputs.tool_calls)
      ? span.outputs.tool_calls
      : Array.isArray(span.outputs.content)
      ? span.outputs.content.filter((c: any) => c && (c.__class__ === "FunctionCall" || c.name))
      : [];

    for (const call of calls) {
      let args = call.arguments;
      if (typeof args === "string") {
        try { args = JSON.parse(args); } catch {}
      }
      if (call.name === "execute_query" || call.name === "execute_database_query") {
        let q = args?.query;
        if (typeof q === "string") {
          try { q = JSON.parse(q); } catch {}
        }
        if (typeof q === "object" && q !== null) {
          if (q.statement || q.sql) sqlPreview = String(q.statement || q.sql);
          else if (q.pipeline) {
            const col = q.collection ? `db.${q.collection}.aggregate(` : "";
            sqlPreview = col ? `${col}${JSON.stringify(q.pipeline)})` : JSON.stringify(q.pipeline);
          }
        } else if (typeof q === "string") {
          sqlPreview = q;
        }
      } else if (call.name === "inspect_schema" || call.name === "inspect_database_schema") {
        const target = args?.table_or_collection || args?.table || args?.collection;
        if (target) sqlPreview = `inspect: ${target}`;
      } else if (call.name === "propose_visualization" || call.name === "create_visualization") {
        sqlPreview = `chart: ${args?.chart_type || "bar"} (${args?.title || "chart"})`;
      } else if (call.name === "invoke_database_agent") {
        sqlPreview = `db: ${args?.objective || "database analysis"}`;
      } else if (call.name === "invoke_tabular_agent") {
        sqlPreview = `tabular: ${args?.objective || "tabular analysis"}`;
      }
      if (sqlPreview) break;
    }
  }

  const rowCount = span.metrics?.row_count ?? span.outputs?.output?.row_count;
  const dbExecTimeMs = span.metrics?.db_execution_time_ms ?? span.outputs?.output?.execution_time_ms;
  const chartType = span.inputs?.chart_type ?? span.outputs?.output?.specification?.chart_type;

  const isSlow = span.duration_ms > 10000;
  const isMedium = span.duration_ms > 3000;

  return (
    <div
      onClick={() => onSelectSpan(span)}
      className={`group relative flex flex-col gap-2 rounded-xl border p-3.5 transition-all cursor-pointer ${
        isSelected
          ? "border-accent ring-2 ring-accent/20 bg-bg-card shadow-sm"
          : "border-border bg-bg-card hover:border-dark hover:shadow-cardHover"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Step Index, Icon, Name, Type Badge */}
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-subtle text-[11px] font-bold text-text-muted border border-border">
            {stageNumber}.{stepIndex}
          </span>

          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {span.step_type.toUpperCase()}
          </span>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-text text-xs sm:text-sm">{stepTitle}</span>
              <span className="font-mono text-[11px] text-text-subtle">({span.step_name})</span>
            </div>
            {stepDescription && (
              <p className="text-[11px] text-text-muted font-mono">{stepDescription}</p>
            )}
          </div>
        </div>

        {/* Right: Specific Tool Chips & Latency Timing */}
        <div className="flex flex-wrap items-center gap-3 text-xs justify-end">
          {/* Row Count Chip */}
          {rowCount !== undefined && (
            <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-800 border border-cyan-200">
              {rowCount} row{rowCount !== 1 ? "s" : ""}
            </span>
          )}

          {/* Database internal query time */}
          {dbExecTimeMs !== undefined && (
            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 border border-teal-200 font-mono">
              DB: {formatDuration(dbExecTimeMs)}
            </span>
          )}

          {/* Chart Type Chip */}
          {chartType && (
            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-800 border border-purple-200 flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              <span>{chartType} chart</span>
            </span>
          )}

          {/* TTFT for LLM calls */}
          {span.ttft_ms && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-800 border border-amber-200">
              TTFT: {formatDuration(span.ttft_ms)}
            </span>
          )}

          {/* Tokens */}
          {span.total_tokens > 0 && (
            <div className="text-right">
              <span className="font-mono text-text font-medium">{formatTokens(span.total_tokens)} toks</span>
            </div>
          )}

          {/* Step Duration */}
          <div className="text-right min-w-[70px]">
            <span
              className={`font-mono font-bold ${
                isSlow ? "text-red-600" : isMedium ? "text-amber-600" : "text-accent"
              }`}
            >
              {formatDuration(span.duration_ms)}
            </span>
          </div>

          {/* Share */}
          <div className="text-right min-w-[45px]">
            <span className="text-xs font-semibold text-text-muted">{percentOfTotal.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* SQL Snippet / Code Preview if available */}
      {sqlPreview && (
        <div className="rounded-lg bg-bg-subtle p-2 border border-border/80 font-mono text-[11px] text-text-muted truncate max-w-full">
          <span className="text-accent font-semibold mr-1.5">&gt;</span>
          {sqlPreview.slice(0, 120)}
          {sqlPreview.length > 120 ? "..." : ""}
        </div>
      )}

      {/* Visual Relative Duration Bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-full rounded-full bg-bg-subtle overflow-hidden border border-border/40">
          <div
            className={`h-full rounded-full transition-all ${
              isSlow
                ? "bg-red-500"
                : isMedium
                ? "bg-amber-500"
                : span.step_type === "llm"
                ? "bg-purple-500"
                : span.step_type === "database"
                ? "bg-cyan-500"
                : "bg-indigo-500"
            }`}
            style={{ width: `${percentOfTotal}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Subcomponent: Timeline Waterfall Gantt Row
const renderWaterfallRow = (
  span: SpanRecord,
  depth: number,
  minStart: number,
  totalDurationMs: number,
  selectedSpan: SpanRecord | null,
  onSelectSpan: (span: SpanRecord) => void
): React.ReactNode => {
  const isSelected = selectedSpan?.span_id === span.span_id;
  const badge = getStepTypeBadgeColor(span.step_type);

  const startOffsetMs = Math.max(0, (span.start_time - minStart) * 1000);
  const leftPct = Math.min(99, Math.max(0, (startOffsetMs / totalDurationMs) * 100));
  const widthPct = Math.min(100 - leftPct, Math.max(1, (span.duration_ms / totalDurationMs) * 100));

  return (
    <React.Fragment key={span.span_id}>
      <div
        onClick={() => onSelectSpan(span)}
        className={`grid grid-cols-12 gap-2 items-center py-2.5 px-3 text-xs transition-colors cursor-pointer ${
          isSelected ? "bg-accent/10 border-l-4 border-l-accent" : "hover:bg-bg-subtle"
        }`}
      >
        {/* Step Name & indentation */}
        <div className="col-span-5 flex items-center min-w-0 pr-2" style={{ paddingLeft: `${depth * 18}px` }}>
          <span
            className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {span.step_type}
          </span>
          <span className="font-mono truncate text-text font-medium">{span.step_name}</span>
        </div>

        {/* Tokens */}
        <div className="col-span-2 text-right font-mono text-text-muted">
          {span.total_tokens > 0 ? formatTokens(span.total_tokens) : "—"}
        </div>

        {/* Duration */}
        <div className="col-span-2 text-right font-mono font-semibold text-accent">
          {formatDuration(span.duration_ms)}
        </div>

        {/* Gantt Bar */}
        <div className="col-span-3">
          <div className="relative h-3 w-full rounded bg-bg-subtle overflow-hidden border border-border/50">
            <div
              className={`absolute top-0 bottom-0 rounded ${
                span.step_type === "llm"
                  ? "bg-purple-500"
                  : span.step_type === "agent"
                  ? "bg-indigo-500"
                  : span.step_type === "database"
                  ? "bg-cyan-500"
                  : "bg-accent"
              }`}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            />
          </div>
        </div>
      </div>

      {span.children &&
        span.children.map((child) =>
          renderWaterfallRow(child, depth + 1, minStart, totalDurationMs, selectedSpan, onSelectSpan)
        )}
    </React.Fragment>
  );
};

// Helper: Partition the trace tree into clean Multi-Agent stages
function buildExecutionStages(tree: TraceTree, totalDurationMs: number): ExecutionStage[] {
  const root = tree.roots[0] || tree.spans[0];
  if (!root) return [];

  const children = root.children || [];
  const stages: ExecutionStage[] = [];

  // Check if explicit sub-agent spans exist among children
  const explicitSubAgents = children.filter(
    (c) =>
      c.step_type === "agent" ||
      (c.component.startsWith("agent.") && c.component !== "agent.orchestrator") ||
      c.step_name.startsWith("invoke_") ||
      c.component.includes("invoke_")
  );

  if (explicitSubAgents.length > 0) {
    // 1. Initial Orchestrator Stage (All spans before the first sub-agent)
    const firstSubAgentStart = explicitSubAgents[0].start_time;
    const orchestratorInitialSteps = children.filter(
      (c) => c.end_time <= firstSubAgentStart && !explicitSubAgents.includes(c)
    );

    const initialTokens = orchestratorInitialSteps.reduce((acc, s) => acc + (s.total_tokens || 0), 0);
    const initialDuration =
      orchestratorInitialSteps.length > 0
        ? orchestratorInitialSteps.reduce((acc, s) => acc + s.duration_ms, 0)
        : root.duration_ms * 0.15;

    stages.push({
      id: "stage-1-orchestrator",
      stageNumber: 1,
      stageType: "orchestrator",
      title: "Main Orchestrator Agent",
      subtitle: "Entrypoint: Query analysis, intent decomposition, and delegation routing",
      badgeLabel: "PRIMARY ORCHESTRATOR",
      badgeColor: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
      component: "agent.orchestrator",
      durationMs: initialDuration,
      totalTokens: initialTokens,
      agentSpan: root,
      steps: orchestratorInitialSteps,
      delegationTarget: `Delegated task to ${formatAgentName(explicitSubAgents[0].component)}`,
    });

    // 2. Sub-Agent Stages
    explicitSubAgents.forEach((subAgentSpan, idx) => {
      const subSteps = subAgentSpan.children || [];
      const subTokens =
        (subAgentSpan.total_tokens || 0) +
        subSteps.reduce((acc, s) => acc + (s.total_tokens || 0), 0);

      const agentMeta = getAgentMeta(subAgentSpan.component);

      stages.push({
        id: `stage-${idx + 2}-${subAgentSpan.span_id}`,
        stageNumber: idx + 2,
        stageType: "subagent",
        title: `Sub-Agent: ${agentMeta.title}`,
        subtitle: agentMeta.subtitle,
        badgeLabel: agentMeta.badgeLabel,
        badgeColor: agentMeta.badgeColor,
        component: subAgentSpan.component,
        durationMs: subAgentSpan.duration_ms,
        totalTokens: subTokens,
        agentSpan: subAgentSpan,
        steps: subSteps,
        delegationTarget:
          idx < explicitSubAgents.length - 1
            ? `Transferred findings to ${formatAgentName(explicitSubAgents[idx + 1].component)}`
            : "Findings synthesized and returned to Orchestrator",
      });
    });

    // 3. Final Synthesis Stage (Orchestrator spans after the last sub-agent)
    const lastSubAgentEnd = explicitSubAgents[explicitSubAgents.length - 1].end_time;
    const finalSteps = children.filter(
      (c) => c.start_time >= lastSubAgentEnd && !explicitSubAgents.includes(c)
    );

    if (finalSteps.length > 0) {
      const finalTokens = finalSteps.reduce((acc, s) => acc + (s.total_tokens || 0), 0);
      const finalDuration = finalSteps.reduce((acc, s) => acc + s.duration_ms, 0);

      stages.push({
        id: `stage-${stages.length + 1}-synthesis`,
        stageNumber: stages.length + 1,
        stageType: "synthesis",
        title: "Final Response Synthesis & Delivery",
        subtitle: "Main Orchestrator consolidates sub-agent findings and delivers final structured response",
        badgeLabel: "FINAL SYNTHESIS",
        badgeColor: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
        component: "agent.orchestrator",
        durationMs: finalDuration,
        totalTokens: finalTokens,
        agentSpan: root,
        steps: finalSteps,
      });
    }

    return stages;
  }

  // Fallback: If children are flat (e.g. historical traces where DatabaseAgent was invoked without a wrapper)
  if (children.length >= 3) {
    // Step 1 is Planning
    const step1 = children[0];
    // Last step is Synthesis
    const lastStep = children[children.length - 1];
    // Middle steps belong to the Sub-Agent (Database or Tabular)
    const middleSteps = children.slice(1, children.length - 1);

    // Detect if this was a database query or tabular analysis
    const hasDbIndicators = middleSteps.some(
      (s) =>
        s.step_name.includes("database") ||
        s.component.includes("database") ||
        s.tags?.messages?.[0]?.content?.includes("Database") ||
        s.inputs?.query
    );

    const subAgentType = hasDbIndicators ? "Database Analysis Agent" : "Specialized Domain Sub-Agent";
    const subAgentBadge = hasDbIndicators ? "SUB-AGENT: DATABASE" : "SUB-AGENT: DOMAIN";

    // Stage 1: Orchestrator Planning
    stages.push({
      id: "stage-1-orchestrator",
      stageNumber: 1,
      stageType: "orchestrator",
      title: "Main Orchestrator Agent",
      subtitle: "Entrypoint: Query analysis, intent decomposition, and delegation routing",
      badgeLabel: "PRIMARY ORCHESTRATOR",
      badgeColor: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
      component: "agent.orchestrator",
      durationMs: step1.duration_ms,
      totalTokens: step1.total_tokens || 0,
      agentSpan: root,
      steps: [step1],
      delegationTarget: `Delegated task to ${subAgentType}`,
    });

    // Stage 2: Sub-Agent Execution
    const midDuration = middleSteps.reduce((acc, s) => acc + s.duration_ms, 0);
    const midTokens = middleSteps.reduce((acc, s) => acc + (s.total_tokens || 0), 0);

    stages.push({
      id: "stage-2-subagent",
      stageNumber: 2,
      stageType: "subagent",
      title: `Sub-Agent: ${subAgentType}`,
      subtitle: "Autonomous schema discovery, SQL generation, execution, and visualization proposal",
      badgeLabel: subAgentBadge,
      badgeColor: { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200", dot: "bg-cyan-500" },
      component: hasDbIndicators ? "agent.database" : "agent.domain",
      durationMs: midDuration,
      totalTokens: midTokens,
      steps: middleSteps,
      delegationTarget: "Findings synthesized and returned to Orchestrator",
    });

    // Stage 3: Final Synthesis
    stages.push({
      id: "stage-3-synthesis",
      stageNumber: 3,
      stageType: "synthesis",
      title: "Final Response Synthesis & Delivery",
      subtitle: "Main Orchestrator consolidates findings and formats final answer to user",
      badgeLabel: "FINAL SYNTHESIS",
      badgeColor: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" },
      component: "agent.orchestrator",
      durationMs: lastStep.duration_ms,
      totalTokens: lastStep.total_tokens || 0,
      steps: [lastStep],
    });

    return stages;
  }

  // Single Stage: Orchestrator executed everything directly
  stages.push({
    id: "stage-1-orchestrator",
    stageNumber: 1,
    stageType: "orchestrator",
    title: root.step_name === "orchestrator_agent_run" ? "Main Orchestrator Agent" : root.step_name,
    subtitle: "Complete autonomous query resolution chain",
    badgeLabel: "PRIMARY AGENT",
    badgeColor: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
    component: root.component,
    durationMs: root.duration_ms,
    totalTokens: root.total_tokens || 0,
    agentSpan: root,
    steps: children,
  });

  return stages;
}

// Helpers for Agent Metadata
function formatAgentName(component: string): string {
  if (component.includes("database")) return "Database Analysis Agent";
  if (component.includes("tabular")) return "Tabular Data Agent";
  if (component.includes("document_processor")) return "Document Batch Processor";
  if (component.includes("document")) return "Document RAG Agent";
  return component.replace("agent.", "").toUpperCase() + " Agent";
}

function getAgentMeta(component: string) {
  if (component.includes("database")) {
    return {
      title: "Database Analysis Agent",
      subtitle: "Autonomous schema discovery, SQL generation, database query execution & visualization",
      badgeLabel: "SUB-AGENT: DATABASE",
      badgeColor: { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200", dot: "bg-cyan-500" },
    };
  }
  if (component.includes("tabular")) {
    return {
      title: "Tabular Data Agent",
      subtitle: "Python code sandbox execution, multi-table aggregation, and chart generation",
      badgeLabel: "SUB-AGENT: TABULAR",
      badgeColor: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" },
    };
  }
  if (component.includes("document_processor")) {
    return {
      title: "Document Batch Processor",
      subtitle: "Deterministic whole-document parallel chunk synthesis and comprehensive extraction",
      badgeLabel: "SUB-AGENT: PROCESSOR",
      badgeColor: { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-200", dot: "bg-sky-500" },
    };
  }
  if (component.includes("document")) {
    return {
      title: "Document RAG Agent",
      subtitle: "Targeted passage retrieval, cross-encoder reranking, and citation verification",
      badgeLabel: "SUB-AGENT: DOCUMENT",
      badgeColor: { bg: "bg-teal-50", text: "text-teal-800", border: "border-teal-200", dot: "bg-teal-500" },
    };
  }
  return {
    title: formatAgentName(component),
    subtitle: "Specialized autonomous agent execution",
    badgeLabel: "SUB-AGENT",
    badgeColor: { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200", dot: "bg-indigo-500" },
  };
}
