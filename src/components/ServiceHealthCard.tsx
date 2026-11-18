"use client";

import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ServiceHealthItem } from "@/lib/types";

interface ServiceHealthCardProps {
  services: ServiceHealthItem[];
  alertBanner?: {
    message: string;
    level: "warning" | "error" | "info";
  } | null;
  retrievalQuality: {
    noResultRatePct: number;
    topK: number;
    p95RetrievalMs: number;
  };
}

export const ServiceHealthCard: React.FC<ServiceHealthCardProps> = ({
  services,
  alertBanner,
  retrievalQuality,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* 1. Service Health Card */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
        <h3 className="text-sm font-semibold text-white">Service health</h3>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1E293B] text-[11px] font-medium text-slate-400">
                <th className="pb-2.5 font-medium">Service</th>
                <th className="pb-2.5 font-medium">p95</th>
                <th className="pb-2.5 font-medium text-right sm:text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {services.map((svc) => {
                const isWatch = svc.status === "latency_watch";
                const isHealthy = svc.status === "healthy";
                return (
                  <tr key={svc.id} className="hover:bg-[#131F37]/50 transition-colors">
                    <td className="py-2.5 font-medium text-slate-200">{svc.name}</td>
                    <td className="py-2.5 font-mono text-slate-300">
                      {svc.p95_ms >= 1000 ? `${(svc.p95_ms / 1000).toFixed(1)} s` : `${svc.p95_ms} ms`}
                    </td>
                    <td className="py-2.5 text-right sm:text-left">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isHealthy
                              ? "bg-emerald-400"
                              : isWatch
                              ? "bg-amber-400"
                              : "bg-red-400"
                          }`}
                        />
                        <span
                          className={
                            isHealthy
                              ? "text-emerald-400"
                              : isWatch
                              ? "text-amber-400"
                              : "text-red-400"
                          }
                        >
                          {isHealthy ? "Healthy" : isWatch ? "Latency watch" : "Degraded"}
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Warning / Recovery Alert Banner */}
        {alertBanner && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span className="font-medium">{alertBanner.message}</span>
          </div>
        )}
      </div>

      {/* 2. Retrieval Quality Card */}
      <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 shadow-card">
        <h3 className="text-sm font-semibold text-white">Retrieval quality</h3>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:text-left">
          <div>
            <span className="text-[11px] text-slate-400 block">No-result rate</span>
            <span className="mt-1 block text-base sm:text-lg font-bold text-white font-mono">
              {retrievalQuality.noResultRatePct}%
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">Top-k</span>
            <span className="mt-1 block text-base sm:text-lg font-bold text-white font-mono">
              {retrievalQuality.topK}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 block">p95 retrieval</span>
            <span className="mt-1 block text-base sm:text-lg font-bold text-white font-mono">
              {retrievalQuality.p95RetrievalMs} ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
