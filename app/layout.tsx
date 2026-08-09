import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tether — Reliable AI Concierge",
  description: "AI concierge with persistent memory, real tools, and human-in-the-loop approval (MAA v4.0 trust layer).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
