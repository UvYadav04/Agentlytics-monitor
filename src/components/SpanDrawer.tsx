"use client";

import React, { useState } from "react";
import { AlertTriangle, Check, Copy, Terminal, X } from "lucide-react";
import type { SpanRecord } from "@/lib/types";
import { formatDuration, formatTokens, getStepTypeBadgeColor } from "@/lib/formatters";

interface SpanDrawerProps {
  span: SpanRecord | null;
  onClose: () => void;
}

export const SpanDrawer: React.FC<SpanDrawerProps> = ({ span, onClose }) => {
  const [activeTab, setActiveTab] = useState<"payloads" | "metrics" | "error" | "raw">("payloads");
  const [copied, setCopied] = useState(false);

  if (!span) return null;

  const badge = getStepTypeBadgeColor(span.step_type);

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(span, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-border bg-bg-card shadow-2xl transition-transform">
      {/* Drawer Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-semibold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {span.step_type}
              </span>
              <h3 className="font-semibold text-text text-base truncate">{span.step_name}</h3>
            </div>
            <p className="font-mono text-xs text-text-subtle">{span.component}</p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copyJson}
              title="Copy JSON"
              className="rounded-lg p-1.5 text-text-muted hover:bg-bg-subtle hover:text-text transition-colors"
            >
              {copied ? <Check className="h-4 w-4 text-accent-emerald" /> : <Copy className="h-4 w-4" />}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-text-muted hover:bg-bg-subtle hover:text-text transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-bg-subtle p-2 text-xs">
          <div>
            <span className="text-[10px] text-text-subtle uppercase block">Duration</span>
            <span className="font-mono font-semibold text-accent">{formatDuration(span.duration_ms)}</span>
          </div>
          <div>
            <span className="text-[10px] text-text-subtle uppercase block">Tokens</span>
            <span className="font-mono text-text">
              {span.total_tokens > 0 ? formatTokens(span.total_tokens) : "None"}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-subtle uppercase block">Status</span>
            <span
              className={`font-medium ${
                span.status === "error" ? "text-accent-rose" : "text-accent-emerald"
              }`}
            >
              {span.status}
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="mt-3 flex space-x-1 border-b border-border/60">
          {(["payloads", "metrics", "error", "raw"] as const).map((tab) => {
            if (tab === "error" && !span.error) return null;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === "payloads" && (
          <div className="space-y-4">
            {/* Inputs Section */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Inputs Payload
              </span>
              <pre className="rounded-lg border border-border bg-bg-subtle p-3 font-mono text-[11px] text-text overflow-x-auto whitespace-pre-wrap">
                {span.inputs ? JSON.stringify(span.inputs, null, 2) : "No inputs recorded"}
              </pre>
            </div>

            {/* Outputs Section */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Outputs Payload
              </span>
              <pre className="rounded-lg border border-border bg-bg-subtle p-3 font-mono text-[11px] text-text overflow-x-auto whitespace-pre-wrap">
                {span.outputs ? JSON.stringify(span.outputs, null, 2) : "No outputs recorded"}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "metrics" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border bg-bg-subtle p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-text-muted">Span ID:</span>
                <span className="font-mono text-text">{span.span_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Parent Span ID:</span>
                <span className="font-mono text-text">{span.parent_span_id || "None (Root)"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Start Time:</span>
                <span className="font-mono text-text">{new Date(span.start_time * 1000).toISOString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">End Time:</span>
                <span className="font-mono text-text">{new Date(span.end_time * 1000).toISOString()}</span>
              </div>
              {span.ttft_ms && (
                <div className="flex justify-between text-accent-amber">
                  <span>TTFT (Time-to-First-Token):</span>
                  <span className="font-mono font-semibold">{formatDuration(span.ttft_ms)}</span>
                </div>
              )}
              {span.prompt_tokens > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Prompt Tokens:</span>
                  <span className="font-mono text-text">{span.prompt_tokens.toLocaleString()}</span>
                </div>
              )}
              {span.completion_tokens > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Completion Tokens:</span>
                  <span className="font-mono text-text">{span.completion_tokens.toLocaleString()}</span>
                </div>
              )}
            </div>

            {span.metrics && Object.keys(span.metrics).length > 0 && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                  Custom Metrics
                </span>
                <pre className="rounded-lg border border-border bg-bg-subtle p-3 font-mono text-[11px] text-text">
                  {JSON.stringify(span.metrics, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "error" && span.error && (
          <div className="space-y-3">
            <div className="rounded-lg border border-accent-rose/30 bg-accent-rose/10 p-3 text-accent-rose space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                <span>{span.error.type}</span>
              </div>
              <p className="text-xs">{span.error.message}</p>
            </div>

            {span.error.traceback && (
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                  Stack Traceback
                </span>
                <pre className="rounded-lg border border-border bg-bg-subtle p-3 font-mono text-[10px] text-text-subtle overflow-x-auto whitespace-pre-wrap">
                  {span.error.traceback}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === "raw" && (
          <pre className="rounded-lg border border-border bg-bg-subtle p-3 font-mono text-[10px] text-text overflow-x-auto">
            {JSON.stringify(span, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

