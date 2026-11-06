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
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function getStepTypeBadgeColor(type: string): { bg: string; text: string; border: string; dot: string } {
  switch (type) {
    case "llm":
      return { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", dot: "bg-purple-500" };
    case "retriever":
      return { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", dot: "bg-teal-500" };
    case "reranker":
      return { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-500" };
    case "generator":
      return { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200", dot: "bg-sky-500" };
    case "sandbox":
      return { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", dot: "bg-amber-500" };
    case "agent":
      return { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" };
    case "database":
      return { bg: "bg-cyan-50", text: "text-cyan-800", border: "border-cyan-200", dot: "bg-cyan-500" };
    case "tool":
      return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" };
    case "router":
      return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" };
    default:
      return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-500" };
  }
}
