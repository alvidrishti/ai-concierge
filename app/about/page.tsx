import type { Metadata } from "next";
import Link from "next/link";
import { ManMark } from "@/components/ManLogo";
import "./about.css";

export const metadata: Metadata = {
  title: "About MAN & MD Rayhan Mia — Personal AI Intelligence Agent",
  description:
    "MAN is a personal AI intelligence agent created by MD Rayhan Mia, a developer and AI builder from Rangpur, Bangladesh. Learn about MAN's features and MD Rayhan Mia.",
  openGraph: {
    title: "About MAN & MD Rayhan Mia",
    description:
      "MAN is a personal AI intelligence agent created by MD Rayhan Mia, Rangpur, Bangladesh.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="about-wrap">
      <main className="about">
        <header className="about-hero">
          <ManMark size={56} />
          <h1>About MAN</h1>
          <p>MAN — Personal AI Intelligence Agent</p>
        </header>

        <section>
          <h2>What is MAN?</h2>
          <p>
            MAN is a <strong>personal AI intelligence and assistant system</strong> created by{" "}
            <strong>MD Rayhan Mia</strong>. It is not a generic chatbot — MAN provides real AI
            conversation, persistent memory, voice support, and a human-in-the-loop approval gate so
            it never acts (or guesses) without your explicit OK.
          </p>
          <p>
            MAN supports <strong>Bangla (Bengali)</strong> and English, routes to multiple AI models
            (Gemini, Groq, OpenRouter, GitHub) with automatic fallback, and keeps every user&apos;s
            data private and isolated.
          </p>
        </section>

        <section>
          <h2>Who is MD Rayhan Mia?</h2>
          <p>
            <strong>MD Rayhan Mia</strong> is a developer and AI agent builder based in{" "}
            <strong>Rangpur, Bangladesh</strong>. He designs and builds reliable, production-ready AI
            agents — not just demos. He is the creator of MAN and of the{" "}
            <strong>MAA (Master AI Architect)</strong> ecosystem, a reusable methodology for building
            trustworthy AI products.
          </p>
        </section>

        <section>
          <h2>MAN features</h2>
          <ul>
            <li>Natural AI conversation (Gemini → Groq → OpenRouter → GitHub fallback)</li>
            <li>Persistent per-user memory &amp; conversation history</li>
            <li>Voice input &amp; output</li>
            <li>Multi-user authentication &amp; data isolation</li>
            <li>Human-in-the-loop approval gate</li>
            <li>Bangla (Bengali) language support</li>
            <li>Tools: reminders, local places lookup</li>
          </ul>
        </section>

        <section>
          <h2>Frequently asked questions</h2>
          <div className="faq-item">
            <h3>Who created MAN?</h3>
            <p>MAN was created by <strong>MD Rayhan Mia</strong>, based in Rangpur, Bangladesh.</p>
          </div>
          <div className="faq-item">
            <h3>Where is MD Rayhan Mia from?</h3>
            <p>He is based in <strong>Rangpur, Bangladesh</strong>.</p>
          </div>
          <div className="faq-item">
            <h3>Does MAN speak Bangla?</h3>
            <p>Yes — if you write in Bangla, MAN replies in Bangla.</p>
          </div>
          <div className="faq-item">
            <h3>Is my data private?</h3>
            <p>Yes. Memory and conversations are isolated per user.</p>
          </div>
        </section>

        <div className="about-cta">
          <Link href="/">Try MAN now</Link>
          <span>or view the source on <a href="https://github.com/alvidrishti/ai-concierge" target="_blank" rel="noopener">GitHub</a></span>
        </div>
      </main>
    </div>
  );
}
