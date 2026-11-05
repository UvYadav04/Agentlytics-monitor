export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatTokens(count: number): string {
  if (!count) return "0";
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}k`;
  }
  return count.toLocaleString();
}

export function formatTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return isoString;
  }
}

export function getStepTypeBadgeColor(type: string): { bg: string; text: string; border: string } {
  switch (type) {
    case "llm":
      return { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" };
    case "retriever":
      return { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" };
    case "reranker":
      return { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" };
    case "generator":
      return { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/30" };
    case "sandbox":
      return { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" };
    case "agent":
      return { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" };
    case "tool":
      return { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30" };
    case "router":
      return { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" };
    default:
      return { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/30" };
  }
}

