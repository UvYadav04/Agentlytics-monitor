"use client";

import React, { useState } from "react";
import type { LatencyPoint } from "@/lib/types";

interface LatencyChartProps {
  data: LatencyPoint[];
}

export const LatencyChart: React.FC<LatencyChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxY = 4.0;
  const chartWidth = 540;
  const chartHeight = 180;
  const paddingLeft = 35;
  const paddingRight = 35;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * innerWidth;
    const y50 = paddingTop + innerHeight - (Math.min(maxY, d.p50) / maxY) * innerHeight;
    const y95 = paddingTop + innerHeight - (Math.min(maxY, d.p95) / maxY) * innerHeight;
    return { ...d, x, y50, y95 };
  });

  // Calculate SLO Y coordinate (SLO = 3.0s)
  const sloY = paddingTop + innerHeight - (3.0 / maxY) * innerHeight;

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

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">End-to-end latency</h3>
      </div>

      {/* SVG Chart Area */}
      <div className="relative mt-3 w-full">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-44 overflow-visible"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Horizontal Grid lines */}
          {[4, 2, 0].map((val) => {
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
                  {val}
                </text>
              </g>
            );
          })}

          {/* Left Y Axis Label */}
          <text
            x={10}
            y={chartHeight / 2}
            transform={`rotate(-90, 10, ${chartHeight / 2})`}
            textAnchor="middle"
            className="text-[9px] fill-slate-500 font-sans tracking-wide select-none"
          >
            Seconds
          </text>

          {/* SLO Threshold Line (Dashed) */}
          <line
            x1={paddingLeft}
            y1={sloY}
            x2={chartWidth - paddingRight}
            y2={sloY}
            stroke="#94A3B8"
            strokeWidth="1.2"
            strokeDasharray="4 3"
            opacity="0.8"
          />
          <text
            x={chartWidth - paddingRight}
            y={sloY - 4}
            textAnchor="end"
            className="text-[9px] fill-slate-400 font-mono select-none"
          >
            SLO 3.0 s
          </text>

          {/* p50 Line (Blue) */}
          <path
            d={p50D}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* p95 Line (Yellow / Amber) */}
          <path
            d={p95D}
            fill="none"
            stroke="#FBBF24"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X Axis Ticks */}
          {["10:00", "10:15", "10:30", "10:45", "11:00"].map((label, idx) => {
            const x = paddingLeft + (idx / 4) * innerWidth;
            return (
              <text
                key={label}
                x={x}
                y={chartHeight - 8}
                textAnchor="middle"
                className="text-[10px] fill-slate-400 font-mono select-none"
              >
                {label}
              </text>
            );
          })}

          {/* Hover hit areas */}
          {points.map((p, idx) => (
            <rect
              key={idx}
              x={p.x - innerWidth / points.length / 2}
              y={paddingTop}
              width={innerWidth / points.length}
              height={innerHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
            />
          ))}

          {/* Active Hover Cursor */}
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
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y50} r="4" fill="#38BDF8" stroke="#0F172A" strokeWidth="2" />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y95} r="4" fill="#FBBF24" stroke="#0F172A" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-sm -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
              top: `${(Math.min(hoveredPoint.y50, hoveredPoint.y95) / chartHeight) * 100 - 10}%`,
            }}
          >
            <div className="font-mono text-[10px] text-slate-400 mb-1">{hoveredPoint.time}</div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-cyan-400">p50: {hoveredPoint.p50.toFixed(2)}s</span>
              <span className="text-amber-400">p95: {hoveredPoint.p95.toFixed(2)}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-4 border-t border-[#1E293B]/60 pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-medium text-slate-400">p50</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-[11px] font-medium text-slate-400">p95</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 border-b-2 border-dashed border-slate-400" />
          <span className="text-[11px] font-medium text-slate-400">SLO</span>
        </div>
      </div>
    </div>
  );
};
