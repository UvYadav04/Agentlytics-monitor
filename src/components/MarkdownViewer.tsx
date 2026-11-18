"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  return (
    <div className="w-full text-xs sm:text-sm text-slate-200 leading-relaxed font-sans overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-base font-bold text-white mt-3 mb-2 pb-1 border-b border-[#1E293B]">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold text-white mt-2.5 mb-1.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-semibold text-cyan-400 mt-2 mb-1">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mt-2 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="mb-2.5 leading-relaxed text-slate-200">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-slate-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-300">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan-500/60 bg-[#0F172A]/60 px-3 py-1.5 my-2 rounded-r-md text-slate-300 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-[#1E293B] my-3" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border border-[#1E293B]">
              <table className="w-full text-left text-xs divide-y divide-[#1E293B]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#0F172A] text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-[#1E293B]/60 bg-[#070C19]/40">{children}</tbody>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold text-slate-300">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 font-mono text-[11px] text-slate-200">{children}</td>
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="bg-[#070C19] text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#1E293B]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="relative my-2.5 rounded-lg border border-[#1E293B] bg-[#070C19] overflow-hidden">
                <pre className="p-3.5 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre leading-relaxed">
                  <code {...props}>{children}</code>
                </pre>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

