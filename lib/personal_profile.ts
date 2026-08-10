// MAN — Approved personal facts about MD Rayhan Mia.
//
// ONLY facts that MD Rayhan Mia explicitly provided are listed here. Nothing
// is inferred, flattered, or invented. If the user asks something NOT in this
// approved list, MAN must say "I don't have that detail" — never guess.
//
// ANTI-HALLUCINATION: this is the single source of truth for creator facts.
// No other file may add flattering/invented claims about the creator.

export interface PersonalFact {
  id: string;
  category: string;
  keywords: string[];       // EN + BN triggers
  content: string;          // approved fact (verbatim from MD Rayhan Mia)
}

const PROFILE: PersonalFact[] = [
  { id: "identity", category: "Identity",
    keywords: ["rayhan", "mia", "md rayhan", "who", "creator", "রায়হান", "মিয়া", "কে"],
    content: "MD Rayhan Mia is the creator of MAN. He is based in Rangpur, Bangladesh." },
  { id: "birthplace", category: "Birthplace",
    keywords: ["born", "birthplace", "jonmo", "জন্ম", "জন্মস্থান", "where born", "grew up"],
    content: "MD Rayhan Mia was born in Dhaka, Bangladesh, and grew up in Dhaka. His ancestral village is Daulatpur, Word No. 3, Balarhat Union, Mithapukur Upazila, Rangpur." },
  { id: "work", category: "Work experience",
    keywords: ["job", "work", "career", "chakri", "কাজ", "চাকরি", "work experience"],
    content: "MD Rayhan Mia has worked in Cox's Bazar at a hotel, in Food & Beverage (F&B) service as a waiter." },
  { id: "ai_use", category: "AI work",
    keywords: ["ai", "build", "use", "এআই", "banai", "বানাই", "কাজ করি"],
    content: "MD Rayhan Mia uses AI daily and builds AI systems. He is building the Master AI Architect (MAA) ecosystem and other tools." },
  { id: "future", category: "Future plans",
    keywords: ["future", "plan", "abroad", "hungary", "cyprus", "bidesh", "বিদেশ", "ভবিষ্যত"],
    content: "MD Rayhan Mia is planning to go abroad — considering Hungary or Cyprus." },
  { id: "location", category: "Bangladesh roots",
    keywords: ["rangpur", "mithapukur", "balarhat", "daulatpur", "রংপুর", "মিঠাপুকুর"],
    content: "MD Rayhan Mia currently lives in Rangpur, Bangladesh. His village is Daulatpur, Word No. 3, Balarhat Union, Mithapukur Upazila." },
];

export function retrievePersonal(query: string): string {
  const q = query.toLowerCase();
  const hits = PROFILE.filter((f) =>
    f.keywords.some((k) => q.includes(k.toLowerCase())));
  if (!hits.length) return "";
  return hits.map((f) => `[${f.category}] ${f.content}`).join("\n");
}

export function personalCategories(): string[] {
  return [...new Set(PROFILE.map((f) => f.category))];
}
