import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DataAnalyzer Observability & Tracing",
  description: "Fine-grained monitoring and tracing for AI pipelines, LLMs, RAG, and sandboxes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-text antialiased selection:bg-accent/30 selection:text-text">
        {children}
      </body>
    </html>
  );
}

