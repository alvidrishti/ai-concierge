// MAN — Personal Knowledge System for MD RAYHAN MIA.
//
// Structured, cached knowledge. NOT sent wholesale on every request — only
// the entries relevant to the current query are injected (relevant-context
// retrieval). Never mixed with any user's private memory.

export interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];       // words that trigger relevance (EN + BN)
  content: string;          // stored in English; MAN paraphrases it naturally
}

const KB: KnowledgeEntry[] = [
  { id: "identity", category: "Identity",
    keywords: ["who", "man", "agent", "made", "created", "builder", "your name", "কে", "তুমি", "কি"],
    content: "MAN is a personal AI intelligence and assistant system created by MD Rayhan Mia, based in Rangpur, Bangladesh." },
  { id: "creator", category: "Professional profile",
    keywords: ["rayhan", "mia", "md rayhan", "creator", "developer", "who made", "রায়হান", "মিয়া", "কে বানিয়েছে", "কে বানালো", "creator k"],
    content: "MD Rayhan Mia is a developer and AI agent builder from Rangpur, Bangladesh. He designed and built MAN as his personal AI intelligence agent. He is also the creator of the MAA (Master AI Architect) ecosystem — a reusable methodology for building reliable, trustworthy AI products." },
  { id: "skills", category: "Skills",
    keywords: ["skill", "expert", "good at", "what can", "do you know", "capable", "দক্ষতা", "কি করতে পারে", "কি পারে", "কি জানিস"],
    content: "MD Rayhan Mia's skills include: AI agent development, prompt engineering, LLM integration (Gemini, Groq, OpenRouter, OpenAI, Claude), automation pipelines, Next.js/React web apps, database design (Supabase/PostgreSQL), deployment on Vercel, and AI product consulting. He is building a full AI ecosystem (MAA) of reusable tools and methodology." },
  { id: "projects", category: "Projects",
    keywords: ["project", "built", "product", "portfolio", "work", "প্রজেক্ট", "কাজ", "বানিয়েছে", "প্রোডাক্ট"],
    content: "Notable projects by MD Rayhan Mia include: MAN (this personal AI agent), the MAA ecosystem documentation (v1-v4), the 'Now @ Nvidia' automated newsletter pipeline, the 'Personal Task Concierge' AI demo, Tether (a reliable AI concierge with human-in-the-loop approval), and the native MAN Android app. He is actively expanding these into real products." },
  { id: "ai_work", category: "AI work",
    keywords: ["ai", "agent", "llm", "model", "automation", "chatbot", "artificial", "এআই", "আর্টিফিশিয়াল"],
    content: "MD Rayhan Mia's AI work focuses on building reliable, production-ready AI agents — not just demos. His MAA trust layer adds approval gates, self-QA, cost monitoring, rollback, and multi-user isolation so automated AI systems can be trusted to run unattended." },
  { id: "design", category: "Design work",
    keywords: ["design", "ui", "ux", "interface", "portfolio", "creative", "ডিজাইন"],
    content: "MD Rayhan Mia does UI/UX and product design, creates brand identities (like the MAN logo system), and produces portfolio-grade PDF case studies and strategy blueprints for client work." },
  { id: "tech", category: "Technologies",
    keywords: ["technology", "stack", "framework", "language", "tool", "tech", "next", "react", "টেক", "টেকনোলজি"],
    content: "Technologies MD Rayhan Mia works with: Next.js, React, TypeScript, Node.js, Python, Supabase, PostgreSQL, Vercel, Tailwind, GitHub, and various LLM APIs (Gemini, Groq, OpenRouter, OpenAI, Claude). He also builds React Native / Expo apps." },
  { id: "preferences", category: "Preferences",
    keywords: ["preference", "like", "style", "way", "prefer", "পছন্দ"],
    content: "MD Rayhan Mia prefers honest, evidence-based methodology over hype — no fabricated numbers, no unfulfillable promises. He calls things 'ecosystems' rather than just 'frameworks'. He is ambitious and plans to keep upgrading MAN into a real, paid, production AI product." },
  { id: "location", category: "Public information",
    keywords: ["where", "location", "bangladesh", "rangpur", "live", "based", "কোথায়", "থাকেন", "বাংলাদেশ", "রংপুর"],
    content: "MD Rayhan Mia is based in Rangpur, Bangladesh." },
  { id: "faq", category: "Frequently asked questions",
    keywords: ["faq", "question", "help", "what", "how", "contact", "প্রশ্ন", "কি করতে পারো"],
    content: "Common questions: Who made MAN? — MD Rayhan Mia. Where? — Rangpur, Bangladesh. Can MAN use AI models? — Yes, via Gemini/Groq/OpenRouter routing with automatic fallback. Is my data private? — Yes, memory is isolated per user. Can MAN speak Bangla? — Yes, if you write in Bangla, MAN replies in Bangla." },
];

export function retrieveKnowledge(query: string): string {
  const q = query.toLowerCase();
  const hits = KB.filter((e) => e.keywords.some((k) => q.includes(k)));
  if (!hits.length) return "";
  return hits.map((e) => `[${e.category}] ${e.content}`).join("\n");
}

export function knowledgeCategories(): string[] {
  return [...new Set(KB.map((e) => e.category))];
}
