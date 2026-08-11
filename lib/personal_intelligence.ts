// MAN — PERSONAL INTELLIGENCE / RAYHAN KNOWLEDGE LAYER (Phase 9).
//
// A structured, provenance-tracked store of what is known about MD Rayhan Mia.
// Only facts that Rayhan EXPLICITLY provided may be APPROVED/VERIFIED and used
// as authoritative personal knowledge. MAN must clearly distinguish:
//     "What Rayhan explicitly told me"   (APPROVED / VERIFIED)
//     "What I inferred"                  (CANDIDATE — never authoritative)
//     "What I don't know"                (missing)
//
// Fact statuses:
//   CANDIDATE  -> observed/suggested, NOT yet approved (never authoritative)
//   VERIFIED   -> confirmed as accurate
//   APPROVED   -> explicitly told to MAN by Rayhan and approved
//   REJECTED   -> known to be false / declined
//   OUTDATED   -> superseded (kept for history, not authoritative)
//
// Only VERIFIED / APPROVED facts influence authoritative personal responses.

export type FactStatus = "CANDIDATE" | "VERIFIED" | "APPROVED" | "REJECTED" | "OUTDATED";

export interface PersonalFact {
  id: string;
  fact: string;
  category: string;
  source: string;          // provenance — who/what told MAN
  confidence: 0 | 0.5 | 1; // how sure MAN is
  status: FactStatus;
  createdAt: string;
  updatedAt: string;
  approved: boolean;       // convenience: status APPROVED or VERIFIED
  keywords: string[];      // EN + BN triggers for retrieval
}

const nowIso = () => new Date().toISOString();

// Base facts — all APPROVED, all explicitly provided by MD Rayhan Mia.
const BASE: Omit<PersonalFact, "createdAt" | "updatedAt" | "approved">[] = [
  { id: "identity", fact: "MD Rayhan Mia is the creator of MAN.", category: "Identity", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["rayhan", "mia", "md rayhan", "creator", "কে", "রায়হান"] },
  { id: "birthplace", fact: "Born in Dhaka, Bangladesh; grew up in Dhaka.", category: "Identity", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["born", "birth", "dhaka", "জন্ম", "ঢাকা"] },
  { id: "village", fact: "Ancestral village: Daulatpur, Word 3, Balarhat Union, Mithapukur Upazila, Rangpur.", category: "Roots", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["daulatpur", "balarhat", "mithapukur", "village", "গ্রাম", "মিঠাপুকুর"] },
  { id: "location", fact: "Currently lives in Rangpur, Bangladesh.", category: "Roots", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["rangpur", "live", "based", "রংপুর", "থাকেন"] },
  { id: "work", fact: "Worked in Cox's Bazar at a hotel in Food & Beverage (F&B) as a waiter.", category: "Work", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["cox", "bazar", "waiter", "f&b", "hotel", "job", "চাকরি"] },
  { id: "ai_use", fact: "Uses AI daily and builds AI systems.", category: "AI work", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["ai", "build", "uses", "এআই"] },
  { id: "maa", fact: "Building the MAA (Master AI Architect) ecosystem.", category: "Projects", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["maa", "ecosystem", "ecosystem", "ইকোসিস্টেম"] },
  { id: "alvi_drishti", fact: "Created Alvi Drishti (Visual Intelligence Architect) and GEO Universes V2.", category: "Projects", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["alvi", "drishti", "geo", "visual intelligence"] },
  { id: "role", fact: "Works as a Technology Intelligence Architect / visual intelligence architect.", category: "Role", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["role", "architect", "technology", "profession", "পেশা"] },
  { id: "future", fact: "Planning to go abroad — considering Hungary or Cyprus.", category: "Future plans", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["hungary", "cyprus", "abroad", "বিদেশ"] },
  { id: "tools", fact: "Skilled with Photoshop, Illustrator, Canva, CapCut, Premiere Pro and AI tools.", category: "Skills", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["photoshop", "illustrator", "canva", "capcut", "premiere", "tools"] },
  { id: "monetization", fact: "Intends to make MAN a paid product after gathering feedback from ~20 users.", category: "Business goals", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["paid", "20", "feedback", "users", "monetize", "revenue"] },
  { id: "language_style", fact: "Communicates in Bangla/Banglish and English; prefers mixed, warm communication.", category: "Communication", source: "explicit: user", confidence: 1, status: "APPROVED", keywords: ["bangla", "banglish", "language", "ভাষা"] },
];

// Layer is static in code; in production this could be stored in Supabase with
// per-fact rows so new APPROVED facts can be added by the owner at runtime.
// The retrieval below only surfaces VERIFIED/APPROVED facts (authoritative).
export function allPersonalFacts(): PersonalFact[] {
  return BASE.map((f) => ({
    ...f,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    approved: f.status === "APPROVED" || f.status === "VERIFIED",
  }));
}

// Retrieve ONLY authoritative (approved/verified) facts relevant to a query.
export function retrievePersonalFacts(query: string): PersonalFact[] {
  const q = query.toLowerCase();
  // If the query clearly asks about the creator / personal info, return ALL
  // approved facts so MAN has full context (avoids "I don't know" when the
  // user asks e.g. "রায়হান ভাই কোথায়?" which the location fact keywords
  // don't literally contain).
  const aboutCreator = /(rayhan|mia|md rayhan|creator|রায়হান|মিয়া|creator k|who made|কে বানিয়েছে|কে বানালো|জান)/.test(q);
  const personalInfoIntent = /\b(where|who|what|tell me about|about|know|live|location|born|village|work|job|project|skill)\b/.test(q) ||
    /(কোথায়|কোথা|কে|কি|বলো|বল|জানো|থাকেন|জন্ম|গ্রাম|কাজ|প্রজেক্ট)/.test(q);
  if (aboutCreator && personalInfoIntent) {
    return allPersonalFacts().filter((f) => f.approved);
  }
  // Otherwise fall back to keyword matching.
  return allPersonalFacts().filter(
    (f) => f.approved && f.keywords.some((k) => q.includes(k.toLowerCase()))
  );
}

// Text block injected into the LLM when relevant (kept small; only matched facts).
export function personalFactsBlock(query: string): string {
  const hits = retrievePersonalFacts(query);
  if (!hits.length) return "";
  return `\nAPPROVED PERSONAL FACTS (from MD Rayhan Mia; authoritative):\n` +
    hits.map((f) => `- [${f.category}] ${f.fact}`).join("\n");
}

// Honest "I don't know" when a personal query matches nothing approved.
export function personalKnowledgeCoverage(query: string): { known: boolean; facts: PersonalFact[] } {
  const facts = retrievePersonalFacts(query);
  return { known: facts.length > 0, facts };
}
