"use client";

import React, { useState } from "react";
import { Copy, Check, WrapText, AlertTriangle } from "lucide-react";

interface TracebackViewerProps {
  traceback: string;
  errorType?: string;
  errorMessage?: string;
  maxHeight?: string;
  initialWrap?: boolean;
}

export const TracebackViewer: React.FC<TracebackViewerProps> = ({
  traceback,
  errorType,
  errorMessage,
  maxHeight = "max-h-60",
  initialWrap = true,
}) => {
  const [wrapText, setWrapText] = useState(initialWrap);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"formatted" | "raw">("formatted");

  if (!traceback) return null;

  const lines = traceback.trim().split("\n");

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(traceback);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to parse Python traceback frames
  // Matches: File "...", line 123, in func_name
  const fileFrameRegex = /^\s*File\s+"([^"]+)",\s+line\s+(\d+)(?:,\s+in\s+(.+))?/;
  const errorHeaderRegex = /^[A-Za-z_][A-Za-z0-9_.]*(?:Error|Exception|Warning|Fault|Interrupt|Exit):/;
  const caretRegex = /^\s*[\^~]+\s*$/;

  return (
    <div className="rounded-xl border border-rose-900/50 bg-[#060913] overflow-hidden shadow-inner flex flex-col">
      {/* Traceback Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-950/60 bg-[#0A0F1E] px-3.5 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          <span className="font-mono text-[11px] font-semibold text-rose-300">
            Exception Stack Trace ({lines.length} lines)
          </span>
          {errorType && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/40">
              {errorType}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          {/* Toggle Formatted / Raw */}
          <div className="flex items-center rounded-md bg-[#0F172A] p-0.5 border border-[#1E293B]">
            <button
              onClick={() => setMode("formatted")}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                mode === "formatted"
                  ? "bg-rose-900/40 text-rose-200 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Formatted with syntax highlighting"
            >
              Formatted
            </button>
            <button
              onClick={() => setMode("raw")}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                mode === "raw"
                  ? "bg-rose-900/40 text-rose-200 font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Raw text output"
            >
              Raw
            </button>
          </div>

          {/* Toggle Wrap */}
          <button
            onClick={() => setWrapText((prev) => !prev)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${
              wrapText
                ? "bg-rose-950/40 border-rose-800/40 text-rose-300"
                : "bg-[#0F172A] border-[#1E293B] text-slate-400 hover:text-slate-200"
            }`}
            title={wrapText ? "Disable Word Wrap" : "Enable Word Wrap"}
          >
            <WrapText className="h-3 w-3" />
            <span className="hidden sm:inline">{wrapText ? "Wrapped" : "No Wrap"}</span>
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 hover:text-white transition-colors"
            title="Copy Traceback"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy Traceback</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Traceback Content */}
      <div
        className={`${maxHeight} overflow-y-auto overflow-x-auto p-3.5 font-mono text-xs leading-relaxed ${
          wrapText ? "whitespace-pre-wrap break-words" : "whitespace-pre"
        }`}
      >
        {mode === "raw" ? (
          <pre className="text-rose-200/90 font-mono m-0 p-0 leading-relaxed">
            {traceback}
          </pre>
        ) : (
          <div className="space-y-0.5">
            {lines.map((line, index) => {
              const frameMatch = line.match(fileFrameRegex);
              const isErrorHeader = errorHeaderRegex.test(line.trim());
              const isCaret = caretRegex.test(line);
              const isTracebackHeader = line.startsWith("Traceback ");

              // Line numbering
              const lineNum = String(index + 1).padStart(2, "0");

              if (frameMatch) {
                const [, filePath, lineNo, funcName] = frameMatch;
                const pathParts = filePath.split(/[/\\]/);
                const fileName = pathParts.pop();
                const dirPath = pathParts.join("/");

                return (
                  <div key={index} className="flex items-start gap-3 py-0.5 hover:bg-rose-950/20 rounded px-1 -mx-1">
                    <span className="select-none text-[10px] text-slate-600 font-mono w-6 text-right shrink-0 pt-0.5">
                      {lineNum}
                    </span>
                    <div className="flex-1">
                      <span className="text-slate-400 font-semibold">File </span>
                      <span className="text-slate-500 font-mono">&quot;{dirPath ? dirPath + "/" : ""}</span>
                      <span className="text-cyan-400 font-semibold underline decoration-cyan-500/30">{fileName}</span>
                      <span className="text-slate-500">&quot;, </span>
                      <span className="text-slate-400">line </span>
                      <span className="text-amber-400 font-bold">{lineNo}</span>
                      {funcName && (
                        <>
                          <span className="text-slate-400">, in </span>
                          <span className="text-purple-300 font-semibold">{funcName}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              if (isErrorHeader) {
                return (
                  <div key={index} className="flex items-start gap-3 py-1 my-1 rounded bg-rose-950/60 border border-rose-800/40 px-2 -mx-1">
                    <span className="select-none text-[10px] text-rose-400 font-mono w-6 text-right shrink-0 pt-0.5 font-bold">
                      {lineNum}
                    </span>
                    <div className="flex-1 text-rose-300 font-bold">
                      {line}
                    </div>
                  </div>
                );
              }

              if (isCaret) {
                return (
                  <div key={index} className="flex items-start gap-3 py-0">
                    <span className="select-none text-[10px] text-slate-700 font-mono w-6 text-right shrink-0">
                      {lineNum}
                    </span>
                    <div className="flex-1 text-rose-500 font-bold">
                      {line}
                    </div>
                  </div>
                );
              }

              if (isTracebackHeader) {
                return (
                  <div key={index} className="flex items-start gap-3 py-0.5 text-slate-400 italic">
                    <span className="select-none text-[10px] text-slate-600 font-mono w-6 text-right shrink-0">
                      {lineNum}
                    </span>
                    <div className="flex-1">
                      {line}
                    </div>
                  </div>
                );
              }

              // Standard code lines or message lines
              const isIndented = line.startsWith("    ") || line.startsWith("\t");
              return (
                <div key={index} className="flex items-start gap-3 py-0.5 hover:bg-slate-800/20 rounded px-1 -mx-1">
                  <span className="select-none text-[10px] text-slate-600 font-mono w-6 text-right shrink-0 pt-0.5">
                    {lineNum}
                  </span>
                  <div className={`flex-1 ${isIndented ? "text-slate-200 font-mono" : "text-slate-300"}`}>
                    {line}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
