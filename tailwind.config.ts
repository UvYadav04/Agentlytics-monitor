import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0F1117",
          subtle: "#161922",
          card: "#1C202C",
        },
        border: {
          DEFAULT: "#262C3D",
          subtle: "#1F2432",
        },
        text: {
          DEFAULT: "#F1F5F9",
          muted: "#94A3B8",
          subtle: "#64748B",
        },
        accent: {
          DEFAULT: "#38BDF8", // Sky blue for AI
          purple: "#A855F7",
          emerald: "#10B981",
          rose: "#F43F5E",
          amber: "#F59E0B",
        },
        component: {
          llm: "#818CF8",        // Indigo
          retriever: "#34D399",  // Emerald
          reranker: "#F472B6",   // Pink
          generator: "#38BDF8",  // Sky
          sandbox: "#FBBF24",    // Amber
          agent: "#A78BFA",      // Purple
          tool: "#2DD4BF",       // Teal
          router: "#FB923C",     // Orange
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;

