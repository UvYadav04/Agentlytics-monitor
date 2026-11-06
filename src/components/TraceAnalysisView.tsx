"use client";

import React, { useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
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

export const TraceAnalysisView: React.FC<TraceAnalysisViewProps> = ({
  tree,
  selectedSpan,
  onSelectSpan,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<"flow" | "waterfall">("flow");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
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

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
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

  const getStepIcon = (type: string) => {
    switch (type) {
      case "agent":
        return <Bot className="h-4 w-4 text-indigo-600" />;
      case "llm":
        return <Sparkles className="h-4 w-4 text-purple-600" />;
      case "tool":
        return <Wrench className="h-4 w-4 text-emerald-600" />;
      case "sandbox":
        return <Code className="h-4 w-4 text-amber-600" />;
      case "retriever":
        return <Database className="h-4 w-4 text-teal-600" />;
      case "reranker":
        return <Filter className="h-4 w-4 text-pink-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-500" />;
    }
  };

  // Helper to extract clean model or tool summary from a span
  const getSpanSubtitle = (span: SpanRecord) => {
    if (span.step_type === "llm") {
      const model = span.tags?.model || span.inputs?.model;
      const provider = span.tags?.provider || span.component.replace("llm.", "");
      return `${provider.toUpperCase()}${model ? ` (${model})` : ""}`;
    }
    if (span.step_type === "agent") {
      return span.component.replace("agent.", "").toUpperCase() + " AGENT";
    }
    return span.component;
  };

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
              Execution Steps
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span className="text-lg font-bold text-text">{allSpans.length}</span>
              <span className="text-[11px] text-text-subtle">spans</span>
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
      <div className="rounded-2xl border border-border bg-bg-card p-6 shadow-card space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-base font-semibold text-text">Agent & Step Execution Flow</h3>
            <p className="text-xs text-text-muted">
              Step-by-step breakdown of how the query was parsed, routed, processed by agents, and resolved.
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
              Structured Flow View
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

        {/* VIEW 1: STRUCTURED AGENT EXECUTION FLOW */}
        {viewMode === "flow" && (
          <div className="space-y-4">
            {tree.roots.map((rootSpan, rootIdx) => (
              <RootAgentCard
                key={rootSpan.span_id}
                span={rootSpan}
                rootIndex={rootIdx + 1}
                totalDurationMs={totalDurationMs}
                selectedSpan={selectedSpan}
                onSelectSpan={onSelectSpan}
                collapsedGroups={collapsedGroups}
                onToggleGroup={toggleGroup}
                minStart={minStart}
              />
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

// Subcomponent: Root Agent Card (e.g. OrchestratorAgent)
interface RootAgentCardProps {
  span: SpanRecord;
  rootIndex: number;
  totalDurationMs: number;
  selectedSpan: SpanRecord | null;
  onSelectSpan: (span: SpanRecord) => void;
  collapsedGroups: Record<string, boolean>;
  onToggleGroup: (id: string) => void;
  minStart: number;
}

const RootAgentCard: React.FC<RootAgentCardProps> = ({
  span,
  rootIndex,
  totalDurationMs,
  selectedSpan,
  onSelectSpan,
  collapsedGroups,
  onToggleGroup,
  minStart,
}) => {
  const isSelected = selectedSpan?.span_id === span.span_id;
  const isCollapsed = !!collapsedGroups[span.span_id];
  const children = span.children || [];
  const percentOfTotal = ((span.duration_ms / totalDurationMs) * 100).toFixed(1);

  return (
    <div
      className={`rounded-xl border transition-all ${
        isSelected
          ? "border-accent ring-2 ring-accent/20 bg-bg-card"
          : "border-border bg-bg-card hover:border-dark"
      }`}
    >
      {/* Agent Card Header */}
      <div
        onClick={() => onSelectSpan(span)}
        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between cursor-pointer border-b border-border/80 bg-gradient-to-r from-bg-subtle/80 to-bg-card rounded-t-xl"
      >
        <div className="flex items-center gap-3">
          {children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleGroup(span.span_id);
              }}
              className="rounded p-1 text-text-subtle hover:bg-bg hover:text-text transition-colors"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
            <Bot className="h-5 w-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text text-sm sm:text-base">
                {span.step_name === "orchestrator_agent_run"
                  ? "Main Orchestrator Agent"
                  : span.step_name}
              </span>
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200 uppercase">
                Primary Agent
              </span>
            </div>
            <p className="text-xs text-text-muted font-mono">{span.component}</p>
          </div>
        </div>

        {/* Timing & Tokens */}
        <div className="flex items-center gap-4 text-xs">
          {span.total_tokens > 0 && (
            <div className="text-right">
              <span className="text-[10px] text-text-subtle uppercase block">Tokens</span>
              <span className="font-mono font-medium text-text">{formatTokens(span.total_tokens)}</span>
            </div>
          )}

          <div className="text-right min-w-[80px]">
            <span className="text-[10px] text-text-subtle uppercase block">Duration</span>
            <span className="font-mono font-bold text-accent">{formatDuration(span.duration_ms)}</span>
          </div>

          {/* Relative Duration Pill */}
          <div className="hidden sm:block text-right">
            <span className="text-[10px] text-text-subtle uppercase block">Share</span>
            <span className="text-xs font-semibold text-text-muted">{percentOfTotal}%</span>
          </div>
        </div>
      </div>

      {/* Nested Steps List (Under this Agent) */}
      {!isCollapsed && children.length > 0 && (
        <div className="p-4 space-y-3 bg-bg/40 rounded-b-xl">
          <div className="flex items-center justify-between text-xs text-text-muted font-medium px-2 pb-1 border-b border-border/60">
            <span>Execution Chain ({children.length} nested operations)</span>
            <span>Duration & Share of Query</span>
          </div>

          <div className="space-y-2">
            {children.map((childSpan, idx) => (
              <StepItem
                key={childSpan.span_id}
                span={childSpan}
                stepIndex={idx + 1}
                parentSpan={span}
                totalDurationMs={totalDurationMs}
                minStart={minStart}
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

// Subcomponent: Step Item inside an Agent Card
interface StepItemProps {
  span: SpanRecord;
  stepIndex: number;
  parentSpan: SpanRecord;
  totalDurationMs: number;
  minStart: number;
  selectedSpan: SpanRecord | null;
  onSelectSpan: (span: SpanRecord) => void;
}

const StepItem: React.FC<StepItemProps> = ({
  span,
  stepIndex,
  parentSpan,
  totalDurationMs,
  minStart,
  selectedSpan,
  onSelectSpan,
}) => {
  const isSelected = selectedSpan?.span_id === span.span_id;
  const badge = getStepTypeBadgeColor(span.step_type);
  const percentOfTotal = Math.min(100, Math.max(1, (span.duration_ms / totalDurationMs) * 100));

  // Determine role/description of the step
  let stepTitle = span.step_name;
  let modelInfo = "";

  if (span.step_type === "llm") {
    const provider = span.tags?.provider || span.component.replace("llm.", "");
    const model = span.tags?.model || span.inputs?.model || "";
    modelInfo = `${provider.toUpperCase()} • ${model || "Default Model"}`;

    if (stepIndex === 1) {
      stepTitle = "Query Analysis & Intent Planning";
    } else if (span.tags?.messages?.[0]?.content?.includes("Database Analysis Agent")) {
      stepTitle = "Database Agent SQL & Schema Reasoning";
    } else {
      stepTitle = "Response Synthesis & Reasoning";
    }
  } else if (span.step_type === "agent") {
    stepTitle = span.step_name.replace(/_/g, " ").toUpperCase();
  }

  // Duration color highlight
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
            {stepIndex}
          </span>

          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}
          >
            {span.step_type.toUpperCase()}
          </span>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-text text-xs sm:text-sm">{stepTitle}</span>
              <span className="font-mono text-[11px] text-text-subtle">({span.step_name})</span>
            </div>
            {modelInfo && <p className="text-[11px] text-text-muted font-mono">{modelInfo}</p>}
          </div>
        </div>

        {/* Right: Tokens & Timing */}
        <div className="flex items-center gap-4 text-xs">
          {span.total_tokens > 0 && (
            <div className="text-right">
              <span className="text-[10px] text-text-subtle uppercase block">Tokens</span>
              <span className="font-mono text-text font-medium">{formatTokens(span.total_tokens)}</span>
            </div>
          )}

          <div className="text-right min-w-[70px]">
            <span className="text-[10px] text-text-subtle uppercase block">Duration</span>
            <span
              className={`font-mono font-bold ${
                isSlow ? "text-red-600" : isMedium ? "text-amber-600" : "text-accent"
              }`}
            >
              {formatDuration(span.duration_ms)}
            </span>
          </div>

          <div className="text-right min-w-[45px]">
            <span className="text-[10px] text-text-subtle uppercase block">Share</span>
            <span className="text-xs font-semibold text-text-muted">{percentOfTotal.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Visual Relative Duration Bar */}
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 w-full rounded-full bg-bg-subtle overflow-hidden border border-border/40">
          <div
            className={`h-full rounded-full transition-all ${
              isSlow
                ? "bg-red-500"
                : isMedium
                ? "bg-amber-500"
                : span.step_type === "llm"
                ? "bg-purple-500"
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

