"use client";

import React, { useEffect, useState } from "react";
import { Clock, Filter, RotateCcw, SlidersHorizontal } from "lucide-react";

export interface DurationRangePreset {
  id: string;
  label: string;
  minMs: number | null;
  maxMs: number | null;
}

export const DURATION_PRESETS: DurationRangePreset[] = [
  { id: "all", label: "All Durations", minMs: null, maxMs: null },
  { id: "fast", label: "< 1s", minMs: null, maxMs: 1000 },
  { id: "medium", label: "1s – 5s", minMs: 1000, maxMs: 5000 },
  { id: "slow", label: "5s – 15s", minMs: 5000, maxMs: 15000 },
  { id: "very_slow", label: "> 15s", minMs: 15000, maxMs: null },
];

interface DurationFilterBarProps {
  minDurationMs: number | null;
  maxDurationMs: number | null;
  onChangeDurationRange: (minMs: number | null, maxMs: number | null) => void;
  timeRangeLabel: string;
  matchingTracesCount: number;
  matchingSpansCount: number;
}

export const DurationFilterBar: React.FC<DurationFilterBarProps> = ({
  minDurationMs,
  maxDurationMs,
  onChangeDurationRange,
  timeRangeLabel,
  matchingTracesCount,
  matchingSpansCount,
}) => {
  const [minSecInput, setMinSecInput] = useState<string>(
    minDurationMs !== null ? String(Number((minDurationMs / 1000).toFixed(2))) : ""
  );
  const [maxSecInput, setMaxSecInput] = useState<string>(
    maxDurationMs !== null ? String(Number((maxDurationMs / 1000).toFixed(2))) : ""
  );

  useEffect(() => {
    setMinSecInput(minDurationMs !== null ? String(Number((minDurationMs / 1000).toFixed(2))) : "");
    setMaxSecInput(maxDurationMs !== null ? String(Number((maxDurationMs / 1000).toFixed(2))) : "");
  }, [minDurationMs, maxDurationMs]);

  const activePresetId =
    DURATION_PRESETS.find((p) => p.minMs === minDurationMs && p.maxMs === maxDurationMs)?.id || "custom";

  const hasDurationFilter = minDurationMs !== null || maxDurationMs !== null;

  const applyCustomInputs = () => {
    const parsedMin = minSecInput.trim() === "" ? null : Number(minSecInput);
    const parsedMax = maxSecInput.trim() === "" ? null : Number(maxSecInput);
    const nextMinMs = parsedMin !== null && Number.isFinite(parsedMin) && parsedMin >= 0 ? parsedMin * 1000 : null;
    const nextMaxMs = parsedMax !== null && Number.isFinite(parsedMax) && parsedMax >= 0 ? parsedMax * 1000 : null;
    onChangeDurationRange(nextMinMs, nextMaxMs);
  };

  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 shadow-card">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Left: Duration Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
            <span>Duration Filter:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[#1E293B] bg-[#070C19] p-0.5">
            {DURATION_PRESETS.map((preset) => {
              const active = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChangeDurationRange(preset.minMs, preset.maxMs)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                    active
                      ? "bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/40"
                      : "text-slate-400 hover:text-white border border-transparent"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Custom Min/Max Duration (seconds) & Active Summary */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[11px] text-slate-400">Min (s):</span>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="0"
              value={minSecInput}
              onChange={(e) => setMinSecInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCustomInputs();
              }}
              className="h-7 w-20 rounded-md border border-[#1E293B] bg-[#070C19] px-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400">Max (s):</span>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="∞"
              value={maxSecInput}
              onChange={(e) => setMaxSecInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyCustomInputs();
              }}
              className="h-7 w-20 rounded-md border border-[#1E293B] bg-[#070C19] px-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={applyCustomInputs}
              className="h-7 rounded-md border border-cyan-500/40 bg-cyan-500/15 px-2.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-colors"
            >
              Apply
            </button>
            {hasDurationFilter && (
              <button
                type="button"
                onClick={() => onChangeDurationRange(null, null)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-[#1E293B] bg-[#070C19] px-2 text-[11px] text-slate-400 hover:text-white transition-colors"
                title="Clear duration filter"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="hidden xl:flex items-center gap-2 border-l border-[#1E293B] pl-3 text-[11px] font-mono text-slate-400">
            <Clock className="h-3 w-3 text-slate-500" />
            <span>{timeRangeLabel}</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-400">{matchingTracesCount} req</span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">{matchingSpansCount} spans</span>
          </div>
        </div>
      </div>
    </div>
  );
};
