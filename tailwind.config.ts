import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#F8F9FA", // Crisp modern light background
          subtle: "#F1F5F9",  // Slate-100 secondary surface
          card: "#FFFFFF",    // Clean white cards
          hover: "#F8FAFC",   // Slate-50 hover
        },
        border: {
          DEFAULT: "#E2E8F0", // Slate-200 clean borders
          subtle: "#F1F5F9",  // Subtle divider
          dark: "#CBD5E1",   // Slate-300 active border
        },
        text: {
          DEFAULT: "#0F172A", // Slate-900 high contrast readable text
          muted: "#475569",   // Slate-600 secondary body
          subtle: "#94A3B8",  // Slate-400 tertiary / captions
        },
        accent: {
          DEFAULT: "#C96442", // Quarry Terracotta
          light: "#FDF4EE",
          hover: "#B25536",
          indigo: "#4F46E5",
          purple: "#7C3AED",
          emerald: "#059669",
          rose: "#E11D48",
          amber: "#D97706",
          sky: "#0284C7",
        },
        component: {
          llm: "#6366F1",        // Indigo
          retriever: "#0D9488",  // Teal
          reranker: "#DB2777",   // Pink
          generator: "#0284C7",  // Sky
          sandbox: "#D97706",    // Amber
          agent: "#7C3AED",      // Purple
          tool: "#059669",       // Emerald
          router: "#EA580C",     // Orange
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)",
        cardHover: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
        drawer: "-4px 0 24px 0 rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
