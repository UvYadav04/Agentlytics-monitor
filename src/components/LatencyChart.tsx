"use client";

import React, { useState } from "react";
import type { ActivityPoint } from "@/lib/types";

interface LatencyChartProps {
  data: ActivityPoint[];
}

export const LatencyChart: React.FC<LatencyChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
        <h3 className="text-sm font-semibold text-white">End-to-end Latency</h3>
        <p className="text-xs text-slate-500 my-auto text-center">No latency data available</p>
      </div>
    );
  }

  const rawMax = Math.max(...data.map((d) => d.p95 || 0), 10);
  const maxY = Math.ceil(rawMax / 10) * 10 || 40;
  const chartWidth = 540;
  const chartHeight = 180;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / Math.max(1, data.length - 1)) * innerWidth;
    const p50Val = d.p50 ?? 0;
    const p95Val = d.p95 ?? 0;
    const y50 = paddingTop + innerHeight - (Math.min(maxY, p50Val) / maxY) * innerHeight;
    const y95 = paddingTop + innerHeight - (Math.min(maxY, p95Val) / maxY) * innerHeight;
    return { ...d, x, y50, y95, p50Val, p95Val };
  });

  // Build curved SVG path for p50
  let p50D = `M ${points[0].x} ${points[0].y50}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    p50D += ` C ${cx} ${prev.y50}, ${cx} ${curr.y50}, ${curr.x} ${curr.y50}`;
  }

  // Build curved SVG path for p95
  let p95D = `M ${points[0].x} ${points[0].y95}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    p95D += ` C ${cx} ${prev.y95}, ${cx} ${curr.y95}, ${curr.x} ${curr.y95}`;
  }

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  const yTicks = [maxY, Math.round(maxY / 2), 0];

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">End-to-end Latency</h3>
          <p className="text-[11px] text-slate-400">P50 and P95 execution duration of investigations</p>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative mt-3 w-full">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-44 overflow-visible"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Horizontal Grid lines */}
          {yTicks.map((val) => {
            const y = paddingTop + innerHeight - (val / maxY) * innerHeight;
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#1E293B"
                  strokeWidth="1"
                  strokeDasharray={val === 0 ? "none" : "2 2"}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="text-[10px] fill-slate-500 font-mono select-none"
                >
                  {val}s
                </text>
              </g>
            );
          })}

          {/* Left Y Axis Label */}
          <text
            x={12}
            y={chartHeight / 2}
            transform={`rotate(-90, 12, ${chartHeight / 2})`}
            textAnchor="middle"
            className="text-[9px] fill-slate-500 font-sans tracking-wide select-none"
          >
            Seconds
          </text>

          {/* p50 Line (Blue) */}
          <path
            d={p50D}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* p95 Line (Yellow / Amber) */}
          <path
            d={p95D}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X Axis Ticks */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={chartHeight - 8}
              textAnchor="middle"
              className="text-[10px] fill-slate-400 font-mono select-none"
            >
              {p.time}
            </text>
          ))}

          {/* Hover hit areas */}
          {points.map((p, idx) => (
            <rect
              key={idx}
              x={p.x - innerWidth / Math.max(1, points.length) / 2}
              y={paddingTop}
              width={innerWidth / Math.max(1, points.length)}
              height={innerHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
            />
          ))}

          {/* Active Hover Marker */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={paddingTop + innerHeight}
                stroke="#64748B"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y50}
                r="4.5"
                fill="#38BDF8"
                stroke="#0F172A"
                strokeWidth="2"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y95}
                r="4.5"
                fill="#F59E0B"
                stroke="#0F172A"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-sm -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
              top: `${(Math.min(hoveredPoint.y50, hoveredPoint.y95) / chartHeight) * 100 - 8}%`,
            }}
          >
            <div className="font-mono text-[10px] text-slate-400 mb-1">{hoveredPoint.date || hoveredPoint.time}</div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-cyan-400 font-bold">p50: {hoveredPoint.p50Val.toFixed(1)}s</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400 font-bold">p95: {hoveredPoint.p95Val.toFixed(1)}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-4 border-t border-[#1E293B]/60 pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-medium text-slate-400">p50 Latency</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-[11px] font-medium text-slate-400">p95 Latency</span>
        </div>
      </div>
    </div>
  );
};
