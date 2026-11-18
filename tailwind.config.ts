import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#070C19", // Deep dark navy observability background
          subtle: "#0C1425",  // Surface / card subtle
          card: "#0F172A",    // Elevated card background
          cardHover: "#131F37", // Card hover
          hover: "#17233D",   // Hover highlight
          active: "#1E2D48",  // Active row / element
        },
        border: {
          DEFAULT: "#1E293B", // Dark slate border
          subtle: "#162035",  // Subtle divider
          dark: "#334155",    // Active / brighter border
        },
        text: {
          DEFAULT: "#F8FAFC", // Slate-50 bright readable text
          muted: "#94A3B8",   // Slate-400 secondary body
          subtle: "#64748B",  // Slate-500 captions / inactive
        },
        accent: {
          DEFAULT: "#38BDF8", // Cyan / sky blue highlight
          blue: "#2563EB",    // Brand blue
          cyan: "#06B6D4",
          indigo: "#6366F1",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#EF4444",
        },
        component: {
          llm: "#818CF8",        // Indigo
          retriever: "#14B8A6",  // Teal
          reranker: "#F472B6",   // Pink
          generator: "#38BDF8",  // Sky
          sandbox: "#F59E0B",    // Amber
          agent: "#A855F7",      // Purple
          tool: "#10B981",       // Emerald
          router: "#FB923C",     // Orange
          database: "#06B6D4",   // Cyan
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)",
        cardHover: "0 4px 12px -2px rgba(0, 0, 0, 0.4), 0 2px 6px -1px rgba(0, 0, 0, 0.25)",
        drawer: "-4px 0 32px 0 rgba(0, 0, 0, 0.6)",
      },
    },
  },
  plugins: [],
};

export default config;
