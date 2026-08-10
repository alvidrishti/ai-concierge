import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAN — Personal AI Intelligence Agent",
  description: "Personal AI Intelligence Agent created by MD RAYHAN MIA, Rangpur, Bangladesh.",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "MAN — Personal AI Intelligence Agent",
    description: "Personal AI Intelligence Agent created by MD RAYHAN MIA, Rangpur, Bangladesh.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0e14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MAN" />
      </head>
      <body>{children}</body>
    </html>
  );
}
