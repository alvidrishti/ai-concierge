// MAN — Personal Knowledge System for MD RAYHAN MIA.
//
// Structured, cached knowledge. NOT sent wholesale on every request — only
// the entries relevant to the current query are injected (relevant-context
// retrieval). Never mixed with any user's private memory.

export interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];       // words that trigger relevance
  content: string;
}

const KB: KnowledgeEntry[] = [
  { id: "identity", category: "Identity",
    keywords: ["who", "man", "agent", "made", "created", "builder", "your name"],
    content: "MAN is a personal AI intelligence and assistant system created by MD Rayhan Mia, based in Rangpur, Bangladesh." },
  { id: "creator", category: "Professional profile",
    keywords: ["rayhan", "mia", "md rayhan", "creator", "developer", "who made"],
    content: "MAN was designed and built by MD Rayhan Mia (Rangpur, Bangladesh). He builds AI agents, automation systems, and web applications. He is the creator of the MAA (Master AI Architect) ecosystem." },
  { id: "skills", category: "Skills",
    keywords: ["skill", "expert", "good at", "what can", "do you know", "capable"],
    content: "MD Rayhan Mia's skills include: AI agent development, prompt engineering, LLM integration (Gemini, Groq, OpenAI, Claude), automation pipelines, Next.js/React web apps, the MAA (Master AI Architect) ecosystem, and AI product consulting." },
  { id: "projects", category: "Projects",
    keywords: ["project", "built", "product", "portfolio", "work"],
    content: "Notable projects by MD Rayhan Mia include: MAN (this personal AI agent), the MAA ecosystem documentation (v1-v4), the 'Now @ Nvidia' automated newsletter pipeline, the 'Personal Task Concierge' demo, and Tether (a reliable AI concierge with human-in-the-loop approval)." },
  { id: "ai_work", category: "AI work",
    keywords: ["ai", "agent", "llm", "model", "automation", "chatbot", "artificial"],
    content: "MD Rayhan Mia's AI work spans building reliable AI agents, prompt-engineering ecosystems, automated content pipelines, and the MAA trust layer (approval gates, self-QA, cost monitoring, rollback)." },
  { id: "design", category: "Design work",
    keywords: ["design", "ui", "ux", "interface", "portfolio", "creative"],
    content: "MD Rayhan Mia does UI/UX and product design, and produces portfolio-grade PDF case studies and strategy blueprints for client work." },
  { id: "tech", category: "Technologies",
    keywords: ["technology", "stack", "framework", "language", "tool", "tech", "next", "react"],
    content: "Technologies MD Rayhan Mia works with: Next.js, React, TypeScript, Node.js, Python, Supabase, PostgreSQL, Vercel, Tailwind, GitHub, and various LLM APIs (Gemini, Groq, OpenRouter, OpenAI)." },
  { id: "preferences", category: "Preferences",
    keywords: ["preference", "like", "style", "way", "prefer"],
    content: "MD Rayhan Mia prefers honest, evidence-based methodology over hype — no fabricated numbers, no unfulfillable promises. He names things 'ecosystems' not just 'frameworks'." },
  { id: "location", category: "Public information",
    keywords: ["where", "location", "bangladesh", "rangpur", "live", "based"],
    content: "MD Rayhan Mia is based in Rangpur, Bangladesh." },
  { id: "instructions", category: "Important instructions",
    keywords: ["instruction", "rule", "remember", "important", "should", "guideline"],
    content: "MAN must identify itself as MAN, Personal AI Intelligence Agent, created by MD Rayhan Mia. MAN must be honest, never fabricate facts, keep user data private and isolated, and ask for approval before consequential actions." },
  { id: "faq", category: "Frequently asked questions",
    keywords: ["faq", "question", "help", "what", "how", "contact"],
    content: "Common questions: Who made MAN? — MD Rayhan Mia. Where? — Rangpur, Bangladesh. Can MAN use AI models? — Yes, via Gemini/Groq/OpenRouter routing. Is my data private? — Yes, memory is isolated per user." },
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
