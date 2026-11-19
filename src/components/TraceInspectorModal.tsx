"use client";

import React, { useMemo, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  Bot,
  Bug,
  Check,
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
  Search,
  Sparkles,
  Terminal,
  User,
  Wrench,
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

export interface AgentExecutionStage {
  id: string;
  stageNumber: number;
  stageType: "orchestrator" | "subagent" | "synthesis" | "step";
  title: string;
  subtitle: string;
  caller: string;
  badgeLabel: string;
  badgeColor: { bg: string; text: string; border: string; dot?: string };
  component: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  totalTokens: number;
  inputs: any;
  outputs: any;
  mainSpan: SpanRecord;
  subSteps: SpanRecord[];
}

function formatOffset(startTime: number, minStart: number): string {
  const diffSec = Math.max(0, startTime - minStart);
  const mins = Math.floor(diffSec / 60);
  const secs = (diffSec % 60).toFixed(2);
  if (mins > 0) {
    return `+${mins}m ${secs}s`;
  }
  return `+${secs}s`;
}

function formatClockTime(epochSec: number): string {
  if (!epochSec || epochSec <= 0) return "";
  try {
    const d = new Date(epochSec * 1000);
    return d.toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Organizes raw spans into clean, deduplicated, chronological Agent Execution Stages:
 * 1. Deduplicates delegator wrapper spans (invoke_tabular_agent) when actual agent run (tabular_agent_run) exists.
 * 2. Structures order: First Orchestrator (caller: User Request) -> Sub-agents (caller: Orchestrator) -> Synthesis.
 * 3. Clearly attributes inputs, outputs, start/end timestamps, latency, and nested sub-steps.
 */
function buildOrderedAgentStages(allSpans: SpanRecord[]): {
  stages: AgentExecutionStage[];
  redundantInvokeIds: Set<string>;
  displaySpans: SpanRecord[];
} {
  if (!allSpans || allSpans.length === 0) {
    return { stages: [], redundantInvokeIds: new Set(), displaySpans: [] };
  }

  // 1. Identify agent runs vs delegator tool wrappers
  const agentRunSpans = allSpans.filter((s) =>
    s.step_name.endsWith("_agent_run") ||
    s.step_name === "tabular_agent_run" ||
    s.step_name === "database_agent_run" ||
    s.step_name === "document_agent_run" ||
    s.step_name === "document_processor_run" ||
    (s.step_type === "agent" && !s.step_name.startsWith("invoke_"))
  );

  const invokeSpans = allSpans.filter(
    (s) => s.step_name.startsWith("invoke_") || s.component.includes(".tool.invoke_")
  );

  // Identify redundant wrapper calls to deduplicate (e.g. invoke_tabular_agent)
  const redundantInvokeIds = new Set<string>();
  const mergedAgentInputs: Record<string, any> = {};

  for (const inv of invokeSpans) {
    const targetName = inv.step_name.replace("invoke_", "").replace("_agent", "");
    const matchingRun = agentRunSpans.find((ar) =>
      ar.step_name.includes(targetName) ||
      inv.component.includes(ar.component) ||
      ar.parent_span_id === inv.span_id ||
      (Math.abs(ar.start_time - inv.start_time) < 3 && Math.abs(ar.end_time - inv.end_time) < 3)
    );
    if (matchingRun) {
      redundantInvokeIds.add(inv.span_id);
      mergedAgentInputs[matchingRun.span_id] = {
        ...(inv.inputs || {}),
        ...(matchingRun.inputs || {}),
      };
    }
  }

  // Display spans without redundant delegators
  const displaySpans = allSpans
    .filter((s) => !redundantInvokeIds.has(s.span_id))
    .sort((a, b) => (a.start_time ?? 0) - (b.start_time ?? 0));

  // 2. Identify primary orchestrator
  const orchestrator =
    agentRunSpans.find(
      (s) => s.step_name === "orchestrator_agent_run" || s.component === "agent.orchestrator"
    ) || allSpans.find((s) => s.step_name === "orchestrator_agent_run" || s.component === "agent.orchestrator");

  // 3. Sub-agents (excluding orchestrator)
  const subAgents = agentRunSpans
    .filter((s) => s.span_id !== orchestrator?.span_id)
    .sort((a, b) => (a.start_time ?? 0) - (b.start_time ?? 0));

  // Fallback for simple single-agent or flat traces
  if (!orchestrator && subAgents.length === 0) {
    const stages: AgentExecutionStage[] = displaySpans.map((s, idx) => ({
      id: s.span_id,
      stageNumber: idx + 1,
      stageType: s.step_type === "agent" ? "subagent" : "step",
      title: s.step_name,
      subtitle: s.component,
      caller: "Direct Request",
      badgeLabel: s.step_type.toUpperCase(),
      badgeColor: getStepTypeBadgeColor(s.step_type),
      component: s.component,
      startTime: s.start_time,
      endTime: s.end_time,
      durationMs: s.duration_ms,
      totalTokens: s.total_tokens || 0,
      inputs: s.inputs,
      outputs: s.outputs,
      mainSpan: s,
      subSteps: [],
    }));
    return { stages, redundantInvokeIds, displaySpans };
  }

  const stages: AgentExecutionStage[] = [];
  let stageNumber = 1;

  // STAGE 1: Primary Orchestrator Agent
  if (orchestrator) {
    const firstSubStart = subAgents.length > 0 ? subAgents[0].start_time : Infinity;
    // Direct orchestrator steps before first sub-agent
    const orchInitialSteps = displaySpans.filter(
      (s) =>
        s.span_id !== orchestrator.span_id &&
        !subAgents.some((sa) => sa.span_id === s.span_id) &&
        s.end_time <= firstSubStart + 0.05
    );

    const initialTokens =
      (orchestrator.total_tokens || 0) +
      orchInitialSteps.reduce((acc, s) => acc + (s.total_tokens || 0), 0);

    stages.push({
      id: `stage-${orchestrator.span_id}`,
      stageNumber: stageNumber++,
      stageType: "orchestrator",
      title: "Orchestrator Agent",
      subtitle: "Primary Coordinator — Query decomposition, routing, and task delegation",
      caller: "User Request",
      badgeLabel: "PRIMARY ORCHESTRATOR",
      badgeColor: {
        bg: "bg-indigo-950/60",
        text: "text-indigo-300",
        border: "border-indigo-700/60",
      },
      component: orchestrator.component,
      startTime: orchestrator.start_time,
      endTime: orchestrator.end_time,
      durationMs: orchestrator.duration_ms,
      totalTokens: initialTokens,
      inputs: orchestrator.inputs,
      outputs: orchestrator.outputs,
      mainSpan: orchestrator,
      subSteps: orchInitialSteps,
    });
  }

  // STAGE 2+: Sub-Agents (Tabular, Database, Document, etc.)
  for (const sa of subAgents) {
    const saSubSteps = displaySpans.filter(
      (s) =>
        s.span_id !== sa.span_id &&
        !agentRunSpans.some((ar) => ar.span_id === s.span_id) &&
        (s.parent_span_id === sa.span_id ||
          (s.start_time >= sa.start_time - 0.05 && s.end_time <= sa.end_time + 0.1))
    );

    const saTokens =
      (sa.total_tokens || 0) + saSubSteps.reduce((acc, s) => acc + (s.total_tokens || 0), 0);

    let friendlyTitle = "Specialized Agent";
    let friendlySubtitle = "Sub-agent analytical execution";
    let badgeLabel = "SUB-AGENT";
    let badgeColor = { bg: "bg-purple-950/60", text: "text-purple-300", border: "border-purple-700/60" };

    const cLower = (sa.component + " " + sa.step_name).toLowerCase();
    if (cLower.includes("tabular")) {
      friendlyTitle = "Tabular Agent";
      friendlySubtitle = "Tabular Analysis — Structured data investigation, DuckDB SQL queries, and statistics";
      badgeLabel = "TABULAR AGENT";
      badgeColor = { bg: "bg-cyan-950/60", text: "text-cyan-300", border: "border-cyan-700/60" };
    } else if (cLower.includes("database") || cLower.includes("sql")) {
      friendlyTitle = "Database Agent";
      friendlySubtitle = "SQL Query Execution — Live database schema inspection and queries";
      badgeLabel = "DATABASE AGENT";
      badgeColor = { bg: "bg-amber-950/60", text: "text-amber-300", border: "border-amber-700/60" };
    } else if (cLower.includes("document") || cLower.includes("rag")) {
      friendlyTitle = "Document Agent";
      friendlySubtitle = "Document RAG — Semantic vector search and text retrieval";
      badgeLabel = "DOCUMENT AGENT";
      badgeColor = { bg: "bg-emerald-950/60", text: "text-emerald-300", border: "border-emerald-700/60" };
    }

    stages.push({
      id: `stage-${sa.span_id}`,
      stageNumber: stageNumber++,
      stageType: "subagent",
      title: friendlyTitle,
      subtitle: friendlySubtitle,
      caller: "Delegated by Orchestrator Agent",
      badgeLabel,
      badgeColor,
      component: sa.component,
      startTime: sa.start_time,
      endTime: sa.end_time,
      durationMs: sa.duration_ms,
      totalTokens: saTokens,
      inputs: mergedAgentInputs[sa.span_id] || sa.inputs,
      outputs: sa.outputs,
      mainSpan: sa,
      subSteps: saSubSteps,
    });
  }

  // STAGE N: Follow-up / Response Synthesis
  if (subAgents.length > 0 && orchestrator) {
    const lastSubEnd = Math.max(...subAgents.map((s) => s.end_time));
    const synthesisSteps = displaySpans.filter(
      (s) =>
        s.span_id !== orchestrator.span_id &&
        !subAgents.some((sa) => sa.span_id === s.span_id) &&
        s.start_time >= lastSubEnd - 0.05
    );

    if (synthesisSteps.length > 0) {
      const synTokens = synthesisSteps.reduce((acc, s) => acc + (s.total_tokens || 0), 0);
      const synDuration = synthesisSteps.reduce((acc, s) => acc + s.duration_ms, 0);

      stages.push({
        id: `stage-synthesis-${orchestrator.span_id}`,
        stageNumber: stageNumber++,
        stageType: "synthesis",
        title: "Final Response Synthesis",
        subtitle: "Orchestrator consolidates findings and delivers the final response",
        caller: "Orchestrator Agent",
        badgeLabel: "FINAL SYNTHESIS",
        badgeColor: { bg: "bg-purple-950/60", text: "text-purple-300", border: "border-purple-700/60" },
        component: orchestrator.component,
        startTime: synthesisSteps[0].start_time,
        endTime: synthesisSteps[synthesisSteps.length - 1].end_time,
        durationMs: synDuration,
        totalTokens: synTokens,
        inputs: null,
        outputs: orchestrator.outputs,
        mainSpan: orchestrator,
        subSteps: synthesisSteps,
      });
    }
  }

  return { stages, redundantInvokeIds, displaySpans };
}

export const TraceInspectorModal: React.FC<TraceInspectorModalProps> = ({ tree, onClose }) => {
  const [viewMode, setViewMode] = useState<"flow" | "waterfall" | "raw" | "error">("flow");
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Expanded stages & sub-steps state
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [expandedSpans, setExpandedSpans] = useState<Record<string, boolean>>({});
  const [showInlineTraceback, setShowInlineTraceback] = useState(false);

  if (!tree) return null;

  const allSpans = tree.spans || [];

  // Build the clean, ordered, deduplicated stages
  const { stages, redundantInvokeIds, displaySpans } = useMemo(() => {
    return buildOrderedAgentStages(allSpans);
  }, [allSpans]);

  const minStart = allSpans.length > 0 ? Math.min(...allSpans.map((s) => s.start_time ?? 0)) : 0;
  const maxEnd = allSpans.length > 0 ? Math.max(...allSpans.map((s) => s.end_time ?? 0)) : 1;
  const totalDurationMs = Math.max(1, (maxEnd - minStart) * 1000);

  // Check for error
  const failedSpan = allSpans.find((s) => s.status === "error" || s.error);
  const hasError = !!failedSpan;

  // Extract meta and user query
  let queryText = "";
  let userEmail = "";
  let route = "";
  let userId = "";

  for (const s of allSpans) {
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

  if (!queryText) {
    queryText = "Execution of data investigation pipeline";
  }

  const totalTokens = allSpans.reduce((acc, s) => acc + (s.total_tokens || 0), 0);
  const promptTokens = allSpans.reduce((acc, s) => acc + (s.prompt_tokens || 0), 0);
  const completionTokens = allSpans.reduce((acc, s) => acc + (s.completion_tokens || 0), 0);

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => {
      const current = prev[stageId] ?? true;
      return { ...prev, [stageId]: !current };
    });
  };

  const toggleSpan = (spanId: string) => {
    setExpandedSpans((prev) => ({ ...prev, [spanId]: !prev[spanId] }));
  };

  const expandAll = () => {
    const allStagesOpen: Record<string, boolean> = {};
    stages.forEach((st) => {
      allStagesOpen[st.id] = true;
    });
    setExpandedStages(allStagesOpen);

    const allSpansOpen: Record<string, boolean> = {};
    displaySpans.forEach((s) => {
      allSpansOpen[s.span_id] = true;
    });
    setExpandedSpans(allSpansOpen);
  };

  const collapseAll = () => {
    const allStagesClosed: Record<string, boolean> = {};
    stages.forEach((st) => {
      allStagesClosed[st.id] = false;
    });
    setExpandedStages(allStagesClosed);
    setExpandedSpans({});
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const jumpToSpan = (spanId: string) => {
    setViewMode("flow");
    // Find stage containing span
    const parentStage = stages.find(
      (st) => st.mainSpan.span_id === spanId || st.subSteps.some((sub) => sub.span_id === spanId)
    );
    if (parentStage) {
      setExpandedStages((prev) => ({ ...prev, [parentStage.id]: true }));
    }
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

        {/* 2. Executive Metrics Strip & Prominent User Query at the Top */}
        <div className="border-b border-[#1E293B] bg-[#0C1425] p-4 sm:p-5 space-y-3 sm:space-y-4 max-h-[44vh] overflow-y-auto shrink-0">
          {/* USER QUERY VISIBLE AT TOP */}
          <div className="rounded-xl border border-cyan-500/30 bg-[#071329] p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-cyan-400" />
                User Request Objective
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
              {queryText}
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
              <span className="text-[10px] font-semibold uppercase text-slate-400 block">Execution Stages</span>
              <span className="text-sm sm:text-base font-bold font-mono text-white">
                {stages.length} agent stage{stages.length === 1 ? "" : "s"}
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

          {/* Failure Alert Box */}
          {hasError && failedSpan?.error && (
            <div className="rounded-xl border border-rose-600/50 bg-rose-950/25 p-3.5 sm:p-4 space-y-2.5 shadow-lg shadow-rose-950/20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-rose-900/60 border border-rose-700/60 text-rose-300">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-rose-300">
                    Execution Failure:{" "}
                    <span className="text-white font-mono">{failedSpan.error.type || "Error"}</span>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => jumpToSpan(failedSpan.span_id)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-rose-900/40 hover:bg-rose-900/70 text-rose-200 border border-rose-700/50 transition-colors"
                  >
                    <span>Step: <strong className="text-white">{failedSpan.step_name}</strong></span>
                    <ArrowDownRight className="h-3 w-3 text-rose-400" />
                  </button>

                  <button
                    onClick={() => copyToClipboard(failedSpan.error!.message, "err_msg")}
                    className="text-[10px] text-rose-300 hover:text-white font-mono px-2 py-0.5 rounded bg-black/40 border border-rose-800/40 transition-colors"
                  >
                    {copiedSection === "err_msg" ? "Copied!" : "Copy Error"}
                  </button>

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
                </div>
              </div>

              <div className="text-xs text-rose-200 font-mono bg-black/40 p-2.5 rounded-lg border border-rose-900/40 break-words leading-relaxed max-h-24 overflow-y-auto">
                {failedSpan.error.message}
              </div>

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
            <span className="text-xs font-semibold text-white">Execution Flow (Ordered by Agent):</span>
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
              Agent Flow (Ordered)
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

        {/* 4. Modal Body: Tool & Agent Detailed Steps */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 min-h-0">
          {/* VIEW 1: DEDUPLICATED, HIERARCHICAL, ORDERED AGENT EXECUTION STAGES */}
          {viewMode === "flow" && (
            <div className="space-y-4">
              {stages.map((stage) => {
                const isExpanded = expandedStages[stage.id] ?? true;
                const pct = Math.min(100, Math.max(1, (stage.durationMs / totalDurationMs) * 100));
                const startOffsetStr = formatOffset(stage.startTime, minStart);
                const endOffsetStr = formatOffset(stage.endTime, minStart);
                const clockStart = formatClockTime(stage.startTime);
                const clockEnd = formatClockTime(stage.endTime);

                const inputMarkdown = formatPayloadToMarkdown(stage.inputs, true);
                const outputMarkdown = formatPayloadToMarkdown(stage.outputs, false);
                const hasSubSteps = stage.subSteps.length > 0;

                return (
                  <div
                    key={stage.id}
                    id={`stage-${stage.id}`}
                    className="rounded-xl border border-[#1E293B] bg-[#0F172A] shadow-md transition-all overflow-hidden"
                  >
                    {/* Stage Header Card */}
                    <div
                      onClick={() => toggleStage(stage.id)}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between cursor-pointer select-none bg-[#0D1527] hover:bg-[#111D35] transition-colors border-b border-[#1E293B]/60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-slate-400 hover:text-white transition-transform">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-cyan-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>

                        {/* Stage Number (1, 2, 3...) */}
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg border bg-[#070C19] border-[#1E293B] text-xs font-bold font-mono text-cyan-400">
                          {stage.stageNumber}
                        </span>

                        {/* Stage Badge Label */}
                        <span
                          className={`rounded px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${stage.badgeColor.bg} ${stage.badgeColor.text} ${stage.badgeColor.border}`}
                        >
                          {stage.badgeLabel}
                        </span>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-sm sm:text-base">
                              {stage.title}
                            </h3>
                            <span className="font-mono text-xs text-slate-500">
                              ({stage.component})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="text-cyan-400/90 font-medium">{stage.caller}</span>
                            <span>•</span>
                            <span className="truncate max-w-[280px] sm:max-w-md text-slate-400">
                              {stage.subtitle}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Timing, Latency & Percentage */}
                      <div className="flex flex-col sm:items-end gap-1 font-mono text-xs pl-10 sm:pl-0">
                        <div className="flex items-center gap-2.5">
                          {stage.totalTokens > 0 && (
                            <span className="text-slate-400 text-[11px]">
                              {stage.totalTokens.toLocaleString()} tokens
                            </span>
                          )}
                          <span className="font-bold text-cyan-400 text-sm">
                            {formatDuration(stage.durationMs)}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span>Start: <strong className="text-slate-300">{startOffsetStr}</strong> {clockStart && `(${clockStart})`}</span>
                          <span>→</span>
                          <span>End: <strong className="text-slate-300">{endOffsetStr}</strong> {clockEnd && `(${clockEnd})`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stage Body */}
                    {isExpanded && (
                      <div className="p-5 space-y-5 bg-[#070C19]/80">
                        {/* Visual Timeline Bar */}
                        <div className="h-1.5 w-full bg-[#1E293B] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Timing Summary Strip */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-[#0A101D] border border-[#1E293B] text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-sans">Who took call</span>
                            <span className="text-white font-semibold truncate block">{stage.title}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-sans">When call started</span>
                            <span className="text-cyan-400">{startOffsetStr} {clockStart && `(${clockStart})`}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-sans">When call ended</span>
                            <span className="text-slate-300">{endOffsetStr} {clockEnd && `(${clockEnd})`}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-sans">Total Latency Taken</span>
                            <span className="text-cyan-400 font-bold">{formatDuration(stage.durationMs)}</span>
                          </div>
                        </div>

                        {/* 1. WHAT WAS INPUT TO THIS AGENT */}
                        {stage.inputs && Object.keys(stage.inputs).length > 0 && (
                          <div className="rounded-xl border border-[#1E293B] bg-[#0A101D] p-4 space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-cyan-400" />
                                What was input to {stage.title}
                              </span>
                              <button
                                onClick={() => copyToClipboard(inputMarkdown, `inp_${stage.id}`)}
                                className="text-[10px] text-slate-400 hover:text-cyan-400 font-mono px-2 py-0.5 rounded bg-[#070C19] border border-[#1E293B] transition-colors"
                              >
                                {copiedSection === `inp_${stage.id}` ? "Copied!" : "Copy Input"}
                              </button>
                            </div>
                            <div className="w-full pt-1">
                              <MarkdownViewer content={inputMarkdown} />
                            </div>
                          </div>
                        )}

                        {/* 2. WHAT WAS OUTPUT FROM THIS AGENT */}
                        {stage.outputs && Object.keys(stage.outputs).length > 0 && (
                          <div className="rounded-xl border border-[#1E293B] bg-[#0A101D] p-4 space-y-2">
                            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                                What was output by {stage.title}
                              </span>
                              <button
                                onClick={() => copyToClipboard(outputMarkdown, `out_${stage.id}`)}
                                className="text-[10px] text-slate-400 hover:text-purple-400 font-mono px-2 py-0.5 rounded bg-[#070C19] border border-[#1E293B] transition-colors"
                              >
                                {copiedSection === `out_${stage.id}` ? "Copied!" : "Copy Output"}
                              </button>
                            </div>
                            <div className="w-full pt-1">
                              <MarkdownViewer content={outputMarkdown} />
                            </div>
                          </div>
                        )}

                        {/* 3. SUB-STEPS TAKEN DURING THIS STAGE */}
                        {hasSubSteps && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                                Sub-Steps Executed by {stage.title} ({stage.subSteps.length})
                              </span>
                            </div>

                            <div className="space-y-2.5 pl-2 sm:pl-4 border-l-2 border-cyan-500/30">
                              {stage.subSteps.map((sub, sIdx) => {
                                const subBadge = getStepTypeBadgeColor(sub.step_type);
                                const isSubExpanded = !!expandedSpans[sub.span_id];
                                const isSubErr = sub.status === "error" || !!sub.error;
                                const subInputMd = formatPayloadToMarkdown(sub.inputs, true);
                                const subOutputMd = formatPayloadToMarkdown(
                                  sub.outputs || (sub.error ? { error: sub.error } : null),
                                  false
                                );

                                return (
                                  <div
                                    key={sub.span_id}
                                    id={`span-${sub.span_id}`}
                                    className={`rounded-lg border transition-all ${
                                      isSubErr
                                        ? "border-rose-600/60 bg-rose-950/20"
                                        : isSubExpanded
                                        ? "border-cyan-500/40 bg-[#0F172A]"
                                        : "border-[#1E293B] bg-[#0A101D] hover:border-slate-700"
                                    }`}
                                  >
                                    <div
                                      onClick={() => toggleSpan(sub.span_id)}
                                      className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between cursor-pointer select-none"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className="text-slate-400 hover:text-white transition-transform">
                                          {isSubExpanded ? (
                                            <ChevronDown className="h-3.5 w-3.5 text-cyan-400" />
                                          ) : (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          )}
                                        </div>

                                        <span className="font-mono text-[11px] font-bold text-slate-400">
                                          {stage.stageNumber}.{sIdx + 1}
                                        </span>

                                        <span
                                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold uppercase border ${subBadge.bg} ${subBadge.text} ${subBadge.border}`}
                                        >
                                          {sub.step_type}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                          <h4 className="font-semibold text-white text-xs">
                                            {sub.step_name}
                                          </h4>
                                          <span className="font-mono text-[10px] text-slate-500">
                                            ({sub.component})
                                          </span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2.5 font-mono text-xs justify-end pl-6 sm:pl-0">
                                        {sub.ttft_ms && (
                                          <span className="text-[10px] text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-800/40">
                                            TTFT: {sub.ttft_ms} ms
                                          </span>
                                        )}
                                        {sub.total_tokens > 0 && (
                                          <span className="text-[11px] text-slate-400">
                                            {sub.total_tokens.toLocaleString()} tokens
                                          </span>
                                        )}
                                        <span
                                          className={`font-bold ${
                                            isSubErr ? "text-rose-400" : "text-cyan-400"
                                          }`}
                                        >
                                          {formatDuration(sub.duration_ms)}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Sub-step Expanded Details */}
                                    {isSubExpanded && (
                                      <div className="p-4 space-y-3 bg-[#070C19] border-t border-[#1E293B]">
                                        {/* Sub-step Error if present */}
                                        {isSubErr && sub.error && (
                                          <div className="rounded-lg border border-rose-600/50 bg-rose-950/30 p-3 text-xs font-mono text-rose-200">
                                            {sub.error.message}
                                          </div>
                                        )}

                                        {/* Sub-step Input */}
                                        <div className="rounded-lg border border-[#1E293B] bg-[#0A101D] p-3 space-y-1.5">
                                          <div className="flex items-center justify-between pb-1.5 border-b border-[#1E293B]">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                                              Input Payload
                                            </span>
                                            <button
                                              onClick={() => copyToClipboard(subInputMd, `sub_in_${sub.span_id}`)}
                                              className="text-[10px] text-slate-400 hover:text-cyan-400 font-mono px-2 py-0.5 rounded bg-[#070C19] border border-[#1E293B]"
                                            >
                                              {copiedSection === `sub_in_${sub.span_id}` ? "Copied!" : "Copy"}
                                            </button>
                                          </div>
                                          <MarkdownViewer content={subInputMd} />
                                        </div>

                                        {/* Sub-step Output */}
                                        <div className="rounded-lg border border-[#1E293B] bg-[#0A101D] p-3 space-y-1.5">
                                          <div className="flex items-center justify-between pb-1.5 border-b border-[#1E293B]">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                                              Output Result
                                            </span>
                                            <button
                                              onClick={() => copyToClipboard(subOutputMd, `sub_out_${sub.span_id}`)}
                                              className="text-[10px] text-slate-400 hover:text-purple-400 font-mono px-2 py-0.5 rounded bg-[#070C19] border border-[#1E293B]"
                                            >
                                              {copiedSection === `sub_out_${sub.span_id}` ? "Copied!" : "Copy"}
                                            </button>
                                          </div>
                                          <MarkdownViewer content={subOutputMd} />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 2: WATERFALL (GANTT TIMELINE WITH DEDUPLICATED DELEGATORS) */}
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

                {displaySpans.map((s) => {
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
