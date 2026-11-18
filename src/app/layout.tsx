import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quarry Observability & Pipeline Tracing",
  description: "Observability, trace waterfall, component latency breakdowns, and sandbox execution monitoring for Quarry AI Data Platform",
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

