import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAN — Personal AI Intelligence Agent",
  description: "MAN, a personal AI intelligence and assistant system created by MD Rayhan Mia, Rangpur, Bangladesh.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
