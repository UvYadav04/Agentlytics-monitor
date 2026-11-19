"use client";

import React from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  Cpu,
  Database,
  Layers,
  LayoutDashboard,
  Radio,
  Search,
  Settings,
  User,
  Zap,
} from "lucide-react";

interface SidebarProps {
  activeNav: string;
  onSelectNav: (nav: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeNav, onSelectNav }) => {
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "requests", label: "Requests", icon: Layers },
    { id: "bottlenecks", label: "Bottlenecks", icon: Zap },
    { id: "models", label: "Models", icon: Cpu },
    { id: "retrieval", label: "Retrieval", icon: Search },
    { id: "services", label: "Services", icon: Database },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-[#1E293B] bg-[#080D1A] text-slate-300">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-5 border-b border-[#1E293B]">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 text-white font-bold text-lg shadow-md shadow-cyan-600/30">
            Q
          </div>
          <div>
            <span className="font-bold text-white text-base tracking-wider uppercase font-sans">
              QUARRY
            </span>
            <span className="block text-[10px] text-cyan-400 font-medium -mt-0.5">
              OBSERVABILITY
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-[#1E293B] text-white font-semibold border-l-2 border-blue-500 shadow-sm"
                  : "text-slate-400 hover:bg-[#0F172A] hover:text-slate-200"
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-colors ${
                  isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                }`}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Service Switcher */}
      <div className="border-t border-[#1E293B] p-3">
        <button className="flex w-full items-center justify-between rounded-lg bg-[#0F172A] p-2.5 text-xs text-slate-300 border border-[#1E293B] hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-2 truncate">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
              <Database className="h-3 w-3" />
            </div>
            <div className="truncate text-left">
              <span className="font-medium truncate text-white block">Quarry Engine</span>
              <span className="text-[10px] text-slate-500 block truncate">ws_analytics_prod</span>
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
};
