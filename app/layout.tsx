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
  const SITE = process.env.NEXT_PUBLIC_APP_URL || "https://ai-concierge-lake-three.vercel.app";
  // JSON-LD structured data — this is the heart of GEO (entity clarity for AI engines).
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "MAN — Personal AI Intelligence Agent",
        url: SITE,
        applicationCategory: "AIApplication",
        description: "Personal AI intelligence and assistant system created by MD Rayhan Mia.",
        author: { "@type": "Person", name: "MD Rayhan Mia", homeLocation: "Rangpur, Bangladesh" },
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      },
      {
        "@type": "Person",
        "@id": `${SITE}/about#person`,
        name: "MD Rayhan Mia",
        jobTitle: "Developer & AI Agent Builder",
        address: { "@type": "PostalAddress", addressLocality: "Rangpur", addressCountry: "Bangladesh" },
        knowsAbout: ["AI agents", "LLM integration", "Prompt engineering", "Next.js", "React Native", "Automation", "MAA ecosystem"],
        url: `${SITE}/about`,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "Who created MAN?", acceptedAnswer: { "@type": "Answer", text: "MAN was created by MD Rayhan Mia, based in Rangpur, Bangladesh." } },
          { "@type": "Question", name: "Where is MD Rayhan Mia from?", acceptedAnswer: { "@type": "Answer", text: "MD Rayhan Mia is based in Rangpur, Bangladesh." } },
          { "@type": "Question", name: "Does MAN speak Bangla?", acceptedAnswer: { "@type": "Answer", text: "Yes, MAN replies in Bangla when you write in Bangla." } },
          { "@type": "Question", name: "Is my data private in MAN?", acceptedAnswer: { "@type": "Answer", text: "Yes, memory and conversations are isolated per user." } },
        ],
      },
    ],
  };
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MAN" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
