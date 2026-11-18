export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}µs`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(0)} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatTokens(count: number): string {
  if (!count) return "0";
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)} M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)} k`;
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
      return {
        bg: "bg-indigo-950/60",
        text: "text-indigo-300",
        border: "border-indigo-700/60",
        dot: "bg-indigo-400",
      };
    case "retriever":
      return {
        bg: "bg-teal-950/60",
        text: "text-teal-300",
        border: "border-teal-700/60",
        dot: "bg-teal-400",
      };
    case "reranker":
      return {
        bg: "bg-pink-950/60",
        text: "text-pink-300",
        border: "border-pink-700/60",
        dot: "bg-pink-400",
      };
    case "generator":
      return {
        bg: "bg-sky-950/60",
        text: "text-sky-300",
        border: "border-sky-700/60",
        dot: "bg-sky-400",
      };
    case "sandbox":
      return {
        bg: "bg-amber-950/60",
        text: "text-amber-300",
        border: "border-amber-700/60",
        dot: "bg-amber-400",
      };
    case "agent":
      return {
        bg: "bg-purple-950/60",
        text: "text-purple-300",
        border: "border-purple-700/60",
        dot: "bg-purple-400",
      };
    case "database":
      return {
        bg: "bg-cyan-950/60",
        text: "text-cyan-300",
        border: "border-cyan-700/60",
        dot: "bg-cyan-400",
      };
    case "tool":
      return {
        bg: "bg-emerald-950/60",
        text: "text-emerald-300",
        border: "border-emerald-700/60",
        dot: "bg-emerald-400",
      };
    case "router":
      return {
        bg: "bg-orange-950/60",
        text: "text-orange-300",
        border: "border-orange-700/60",
        dot: "bg-orange-400",
      };
    default:
      return {
        bg: "bg-slate-800/80",
        text: "text-slate-300",
        border: "border-slate-700/60",
        dot: "bg-slate-400",
      };
  }
}
