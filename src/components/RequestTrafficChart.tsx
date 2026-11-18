"use client";

import React, { useState } from "react";
import type { ActivityPoint } from "@/lib/types";

interface RequestTrafficChartProps {
  data: ActivityPoint[];
}

export const RequestTrafficChart: React.FC<RequestTrafficChartProps> = ({ data }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
        <h3 className="text-sm font-semibold text-white">Investigation Activity</h3>
        <p className="text-xs text-slate-500 my-auto text-center">No trace activity data available</p>
      </div>
    );
  }

  const rawMax = Math.max(...data.map((d) => d.count), 10);
  const maxY = Math.ceil(rawMax / 100) * 100 || 100;
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
    const y = paddingTop + innerHeight - (Math.min(maxY, d.count) / maxY) * innerHeight;
    return { ...d, x, y };
  });

  // Build curved SVG path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    pathD += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + innerHeight} L ${points[0].x} ${
    paddingTop + innerHeight
  } Z`;

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  const yTicks = [maxY, Math.round(maxY / 2), 0];

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Investigation Activity</h3>
          <p className="text-[11px] text-slate-400">Total traced multi-agent investigations over time</p>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative mt-3 w-full">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-44 overflow-visible"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="trafficGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#0284C7" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.0" />
            </linearGradient>
          </defs>

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
                  {val}
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
            Traces
          </text>

          {/* Filled Area */}
          <path d={areaD} fill="url(#trafficGradient)" />

          {/* Glow Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#38BDF8"
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
                stroke="#38BDF8"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.7"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="4.5"
                fill="#38BDF8"
                stroke="#0F172A"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 rounded-md border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs text-white shadow-xl backdrop-blur-sm -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
              top: `${(hoveredPoint.y / chartHeight) * 100 - 8}%`,
            }}
          >
            <div className="font-mono text-[10px] text-slate-400">{hoveredPoint.date || hoveredPoint.time}</div>
            <div className="font-bold text-cyan-400 font-mono">{hoveredPoint.count} traces</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-2 border-t border-[#1E293B]/60 pt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-[11px] font-medium text-slate-400">Investigations Traced</span>
        </div>
      </div>
    </div>
  );
};
